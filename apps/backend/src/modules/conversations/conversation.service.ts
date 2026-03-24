import { IConversation, IConversationService, IConversationRepository } from './conversation.interface.js';
import ConversationRepository from './conversation.repository.js';
import { UserService } from '../users/index.js';
import { MessageService } from '../messages/index.js';
import AppError from '../../utils/AppError.js';
import { buildPaginatedResponse } from '../../utils/pagination.js';
import { PaginatedResponse } from '../../types/pagination.types.js';
import { withTransaction } from '../../utils/transaction.helper.js';
import Conversation from './conversation.model.js';
import Message from '../messages/message.model.js';

export class ConversationService implements IConversationService {
  constructor(private conversationRepository: IConversationRepository = ConversationRepository) { }
  async createOrGetConversation(userId: string, otherUserId: string): Promise<IConversation> {
    await UserService.getUserById(userId);
    await UserService.getUserById(otherUserId);

    const isBlocked = await UserService.isBlocked(userId, otherUserId);
    const isBlockedBy = await UserService.isBlocked(otherUserId, userId);

    if (isBlocked || isBlockedBy) {
      throw new AppError('Cannot create conversation with blocked user', 403);
    }

    const existing = await this.conversationRepository.findByParticipants([userId, otherUserId]);

    if (existing) {
      return existing;
    }

    return this.conversationRepository.create([userId, otherUserId], 'direct');
  }

  async listConversations(userId: string, page = 1, limit = 20): Promise<IConversation[]> {
    return this.conversationRepository.listForUser(userId, page, limit);
  }

  /**
   * List conversations with cursor-based pagination (recommended for production)
   * 
   * Cursor pagination provides:
   * - O(1) performance (no skip/offset)
   * - Prevents duplicates during realtime updates
   * - Scalable for users with many conversations
   * 
   * @param userId - User ID to filter conversations
   * @param cursor - Opaque cursor string
   * @param limit - Number of conversations per page
   * @returns Paginated response with hasNextPage and nextCursor
   */
  async listConversationsCursor(
    userId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<PaginatedResponse<IConversation>> {
    // Fetch conversations with cursor pagination (limit + 1 for hasNextPage)
    const conversations = await this.conversationRepository.listForUserCursor(userId, cursor, limit);

    // Build paginated response
    return buildPaginatedResponse(conversations, limit);
  }

  async getConversationById(conversationId: string, userId: string): Promise<IConversation> {
    const conversation = await this.conversationRepository.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p?._id.toString() === userId
    );

    if (!isParticipant) {
      throw new AppError('Not authorized to access this conversation', 403);
    }

    return conversation;
  }

  /**
   * Delete conversation with atomic transaction
   * Ensures conversation and all its messages are soft-deleted atomically
   * Rolls back both operations if either fails
   * 
   * Transaction operations:
   * 1. Soft delete conversation (set deletedAt)
   * 2. Soft delete all messages in conversation (set deletedAt)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // Verify user is participant (outside transaction)
    await this.getConversationById(conversationId, userId);

    // Execute within transaction for atomicity
    await withTransaction(async (session) => {
      const now = new Date();
      const sessionOption = session ? { session } : {};

      // 1. Soft delete conversation
      await Conversation.findByIdAndUpdate(
        conversationId,
        { deletedAt: now },
        sessionOption
      );

      // 2. Soft delete all messages in conversation
      await Message.updateMany(
        {
          conversationId,
          deletedAt: null, // Only update non-deleted messages
        },
        { deletedAt: now },
        sessionOption
      );
    });
  }
}

export default new ConversationService();
