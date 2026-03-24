import { IMessage, IMessageService, IMessageRepository, MessageSearchResult, MessagesAroundResult, MediaFilterType, MediaListResult } from './message.interface.js';
import MessageRepository from './message.repository.js';
import ConversationRepository from '../conversations/conversation.repository.js';
import ConversationService from '../conversations/conversation.service.js';
import AppError from '../../utils/AppError.js';
import { buildPaginatedResponse, encodeCursor } from '../../utils/pagination.js';
import { PaginatedResponse } from '../../types/pagination.types.js';
import { withTransaction } from '../../utils/transaction.helper.js';
import Message from './message.model.js';
import Conversation from '../conversations/conversation.model.js';
import mongoose from 'mongoose';

export class MessageService implements IMessageService {
  constructor(
    private messageRepository: IMessageRepository = MessageRepository,
    private conversationRepository = ConversationRepository
  ) { }
  /**
   * Send a message with atomic transaction
   * Ensures message creation and conversation update happen atomically
   * Rolls back both operations if either fails
   * 
   * Transaction operations:
   * 1. Create message document
   * 2. Update conversation.lastMessage
   * 3. Update conversation.updatedAt
   * 
   * @param conversationId - Conversation ID
   * @param senderId - Sender user ID
   * @param content - Message text content (optional for media messages)
   * @param fileKey - S3 file key for media (already moved from temp/)
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    fileKey?: string
  ): Promise<IMessage> {
    // Verify conversation exists and user is participant (outside transaction)
    await ConversationService.getConversationById(conversationId, senderId);

    // Execute within transaction for atomicity
    const message = await withTransaction(async (session) => {
      // Determine message type based on file key
      let messageType: 'text' | 'image' | 'file' | 'video' | 'audio' = 'text';
      let media: { url: string; mimeType: string; size: number; name: string } | undefined;

      if (fileKey) {
        // Determine type from file extension (simple heuristic)
        const ext = fileKey.split('.').pop()?.toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const videoExts = ['mp4', 'mov', 'avi', 'mkv'];
        const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];

        if (imageExts.includes(ext || '')) {
          messageType = 'image';
        } else if (videoExts.includes(ext || '')) {
          messageType = 'video';
        } else if (audioExts.includes(ext || '')) {
          messageType = 'audio';
        } else {
          messageType = 'file';
        }

        // Store only fileKey - URLs will be generated at access time
        // This follows the principle: DB stores keys, not URLs
        media = {
          url: fileKey, // Actually storing fileKey in url field
          mimeType: '', // Will be populated when needed
          size: 0, // Will be populated when needed
          name: fileKey.split('/').pop() || fileKey,
        };
      }

      // 1. Create message (PERSIST BEFORE EMIT)
      const sessionOption = session ? { session } : {};
      const messageData: any = {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: new mongoose.Types.ObjectId(senderId),
        type: messageType,
        deliveryState: 'sent',
      };

      // Add content if provided
      if (content) {
        messageData.content = content;
      }

      // Add media if provided
      if (media) {
        messageData.media = media;
      }

      const messageResult = await Message.create(
        [messageData],
        sessionOption // Pass session for transaction (or empty object)
      );

      const createdMessage = messageResult[0];

      // 2. Update conversation's last message atomically
      const lastMessageContent = content || (messageType === 'image' ? '📷 Image' : messageType === 'video' ? '🎥 Video' : messageType === 'audio' ? '🎵 Audio' : '📎 File');
      
      await Conversation.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: {
            content: lastMessageContent,
            senderId: new mongoose.Types.ObjectId(senderId),
            timestamp: new Date(),
          },
          updatedAt: new Date(), // Explicit update for sorting
        },
        sessionOption // Pass session for transaction (or empty object)
      );

      // Populate sender before returning
      await createdMessage.populate('senderId', 'username avatar');
      
      return createdMessage;
    });

    return message;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50): Promise<IMessage[]> {
    await ConversationService.getConversationById(conversationId, userId);
    return this.messageRepository.findByConversation(conversationId, page, limit);
  }

  /**
   * Get messages with cursor-based pagination (recommended for production)
   * 
   * Cursor pagination provides:
   * - O(1) performance (no skip/offset)
   * - Prevents duplicates during realtime updates
   * - Scalable for large conversations
   * 
   * @param conversationId - Conversation ID
   * @param userId - User ID (for authorization)
   * @param cursor - Opaque cursor string
   * @param limit - Number of messages per page
   * @returns Paginated response with hasNextPage and nextCursor
   */
  async getMessagesCursor(
    conversationId: string,
    userId: string,
    cursor: string | undefined,
    limit: number
  ): Promise<PaginatedResponse<IMessage>> {
    // Verify user is participant in conversation
    await ConversationService.getConversationById(conversationId, userId);

    // Fetch messages with cursor pagination (limit + 1 for hasNextPage)
    const messages = await this.messageRepository.findByConversationCursor(conversationId, cursor, limit);

    // Build paginated response
    return buildPaginatedResponse(messages, limit);
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    await ConversationService.getConversationById(conversationId, userId);
    return this.messageRepository.getUnreadCount(conversationId, userId);
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    await ConversationService.getConversationById(message.conversationId.toString(), userId);
    await this.messageRepository.markAsRead(messageId, userId);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findById(messageId);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId.toString() !== userId) {
      throw new AppError('Not authorized to delete this message', 403);
    }

    await this.messageRepository.softDelete(messageId);
  }

  async updateDeliveryState(messageId: string, state: 'sent' | 'delivered' | 'read'): Promise<void> {
    await this.messageRepository.updateDeliveryState(messageId, state);
  }

  async getMessageById(messageId: string): Promise<IMessage | null> {
    return this.messageRepository.findById(messageId);
  }

  /**
   * Search messages within a conversation
   * Returns lightweight results suitable for search UI
   * 
   * @param conversationId - Conversation ID
   * @param userId - User ID (for authorization)
   * @param query - Search query string
   * @param limit - Maximum number of results (default: 20)
   * @returns Array of search results with snippets
   */
  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    limit = 20
  ): Promise<MessageSearchResult[]> {
    // Verify user is participant in conversation
    await ConversationService.getConversationById(conversationId, userId);

    // Validate query
    if (!query || query.trim().length === 0) {
      throw new AppError('Search query cannot be empty', 400);
    }

    if (query.length > 200) {
      throw new AppError('Search query too long', 400);
    }

    const results = await this.messageRepository.searchMessages(conversationId, query, limit);

    // Transform to lightweight search results
    return results.map((msg: any) => ({
      messageId: msg._id.toString(),
      conversationId: msg.conversationId.toString(),
      snippet: msg.content.substring(0, 150), // Truncate to 150 chars
      createdAt: msg.createdAt,
      senderId: msg.senderId.toString(),
    }));
  }

  /**
   * Get messages around a specific message (jump-to-message)
   * Fetches messages before and after the target message
   * 
   * @param messageId - Target message ID
   * @param userId - User ID (for authorization)
   * @param limit - Total number of messages to fetch (default: 50)
   * @returns Center message ID and array of messages
   */
  async getMessagesAround(
    messageId: string,
    userId: string,
    limit = 50
  ): Promise<MessagesAroundResult> {
    // Fetch target message first for authorization check
    const targetMessage = await this.messageRepository.findById(messageId);

    if (!targetMessage) {
      throw new AppError('Message not found', 404);
    }

    // Verify user is participant in the conversation
    await ConversationService.getConversationById(targetMessage.conversationId.toString(), userId);

    // Fetch messages around target
    const messages = await this.messageRepository.findMessagesAround(messageId, limit);

    return {
      centerMessageId: messageId,
      messages,
    };
  }

  /**
   * Get media items in a conversation (images, videos, files, links)
   * Used for media viewer, docs tab, and links tab
   * Independent pagination from chat messages
   * 
   * @param conversationId - Conversation ID
   * @param userId - User ID (for authorization)
   * @param filterType - Type of media to filter ('image', 'video', 'file', 'link', 'all')
   * @param cursor - Pagination cursor (optional)
   * @param limit - Number of items to fetch (default: 20)
   * @returns Media items and next cursor
   */
  async getMediaByConversation(
    conversationId: string,
    userId: string,
    filterType: MediaFilterType,
    cursor: string | undefined,
    limit = 20
  ): Promise<MediaListResult> {
    // Verify user is participant in conversation
    await ConversationService.getConversationById(conversationId, userId);

    // Validate filter type
    const validTypes: MediaFilterType[] = ['image', 'video', 'file', 'link', 'all'];
    if (!validTypes.includes(filterType)) {
      throw new AppError('Invalid filter type', 400);
    }

    // Fetch media items (with limit + 1 for pagination)
    const items = await this.messageRepository.findMediaByConversation(
      conversationId,
      filterType,
      cursor,
      limit
    );

    // Check if there are more items
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    // Generate next cursor if there are more items
    const nextCursor = hasMore && resultItems.length > 0
      ? encodeCursor(resultItems[resultItems.length - 1].createdAt, resultItems[resultItems.length - 1].messageId)
      : null;

    return {
      items: resultItems,
      nextCursor,
    };
  }
}

export default new MessageService();
