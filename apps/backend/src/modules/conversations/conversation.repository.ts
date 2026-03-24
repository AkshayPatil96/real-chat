import Conversation from './conversation.model.js';
import { IConversation, IConversationRepository } from './conversation.interface.js';
import mongoose from 'mongoose';
import { buildCursorQuery, parsePaginationParams } from '../../utils/pagination.js';

export class ConversationRepository implements IConversationRepository {
  async findByParticipants(participantIds: string[]): Promise<IConversation | null> {
    const objectIds = participantIds.map((id) => new mongoose.Types.ObjectId(id));

    return Conversation.findOne({
      type: 'direct',
      participants: { $all: objectIds, $size: 2 },
      deletedAt: null,
    });
  }

  async listForUser(userId: string, page = 1, limit = 20): Promise<IConversation[]> {
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(userId),
      deletedAt: null,
    })
      .sort({ 'lastMessage.timestamp': -1 })
      .skip(skip)
      .limit(limit)
      .populate('participants', 'username avatar')
      .lean();

    return conversations as unknown as IConversation[];
  }

  /**
   * Cursor-based pagination for conversations (newest → oldest by activity)
   * Efficient, scalable, prevents duplicates during realtime updates
   * 
   * @param userId - User ID to filter conversations
   * @param cursor - Opaque cursor string (base64 encoded)
   * @param limit - Number of conversations to fetch (will fetch limit + 1 for hasNextPage)
   * @returns Array of conversations (includes limit + 1 item if more exist)
   */
  async listForUserCursor(userId: string, cursor: string | undefined, limit: number): Promise<IConversation[]> {
    const { cursor: decodedCursor } = parsePaginationParams(cursor, limit);
    const cursorQuery = buildCursorQuery(decodedCursor);

    // Fetch limit + 1 to determine hasNextPage
    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(userId),
      deletedAt: null,
      ...cursorQuery, // Add cursor-based filter
    })
      .sort({ createdAt: -1, _id: -1 }) // Stable sort for cursor pagination
      .limit(limit + 1) // Fetch one extra to check hasNextPage
      .populate('participants', 'username avatar')
      .lean(); // Return plain objects for better performance

    return conversations as unknown as IConversation[];
  }

  async create(participantIds: string[], type: 'direct' | 'group' = 'direct', name?: string): Promise<IConversation> {
    const objectIds = participantIds.map((id) => new mongoose.Types.ObjectId(id));

    const conversation = await Conversation.create({
      participants: objectIds,
      type,
      name,
    });

    // Populate participants before returning
    return Conversation.findById(conversation._id)
      .populate('participants', 'username avatar')
      .then(conv => conv!);
  }

  async updateLastMessage(conversationId: string, content: string, senderId: string): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content,
        senderId: new mongoose.Types.ObjectId(senderId),
        timestamp: new Date(),
      },
    });
  }

  async softDelete(conversationId: string): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, { deletedAt: new Date() });
  }

  async findById(conversationId: string): Promise<IConversation | null> {
    return Conversation.findOne({ _id: conversationId, deletedAt: null })
      .populate('participants', 'username avatar');
  }
}

export default new ConversationRepository();
