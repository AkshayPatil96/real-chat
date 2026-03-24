import Message from './message.model.js';
import { IMessage, IMessageRepository, DeliveryState, MessageType, MessageMedia, MediaFilterType, MediaItem } from './message.interface.js';
import mongoose from 'mongoose';
import { buildCursorQuery, parsePaginationParams } from '../../utils/pagination.js';

export class MessageRepository implements IMessageRepository {
  async create(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = 'text',
    media?: MessageMedia
  ): Promise<IMessage> {
    const messageData: any = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: new mongoose.Types.ObjectId(senderId),
      type,
      deliveryState: 'sent',
    };

    // Add content if provided (required for text, optional for media)
    if (content) {
      messageData.content = content;
    }

    // Add media if provided
    if (media) {
      messageData.media = media;
    }

    return Message.create(messageData);
  }

  async findByConversation(conversationId: string, page = 1, limit = 50): Promise<IMessage[]> {
    const skip = (page - 1) * limit;

    return Message.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username avatar');
  }

  /**
   * Cursor-based pagination for messages (newest → oldest)
   * Efficient, scalable, prevents duplicates during realtime updates
   * 
   * @param conversationId - Conversation ID
   * @param cursor - Opaque cursor string (base64 encoded)
   * @param limit - Number of messages to fetch (will fetch limit + 1 for hasNextPage)
   * @returns Array of messages (includes limit + 1 item if more exist)
   */
  async findByConversationCursor(conversationId: string, cursor: string | undefined, limit: number): Promise<IMessage[]> {
    const { cursor: decodedCursor } = parsePaginationParams(cursor, limit);
    const cursorQuery = buildCursorQuery(decodedCursor);

    // Fetch limit + 1 to determine hasNextPage
    return Message.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      deletedAt: null,
      ...cursorQuery, // Add cursor-based filter
    })
      .sort({ createdAt: -1, _id: -1 }) // Stable sort for cursor pagination
      .limit(limit + 1) // Fetch one extra to check hasNextPage
      .populate('senderId', 'username avatar')
      .lean(); // Return plain objects for better performance
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    return Message.countDocuments({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      readBy: { $ne: new mongoose.Types.ObjectId(userId) },
      senderId: { $ne: new mongoose.Types.ObjectId(userId) },
      deletedAt: null,
    });
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { readBy: new mongoose.Types.ObjectId(userId) },
    });
  }

  async updateDeliveryState(messageId: string, state: DeliveryState): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) return;

    // Only update if new state is "higher" than current state
    // Hierarchy: sent (0) < delivered (1) < read (2)
    const stateHierarchy: Record<DeliveryState, number> = {
      sent: 0,
      delivered: 1,
      read: 2
    };

    const currentLevel = stateHierarchy[message.deliveryState];
    const newLevel = stateHierarchy[state];

    if (newLevel > currentLevel) {
      await Message.findByIdAndUpdate(messageId, { deliveryState: state });
    }
  }

  async softDelete(messageId: string): Promise<void> {
    await Message.findByIdAndUpdate(messageId, { deletedAt: new Date() });
  }

  async findById(messageId: string): Promise<IMessage | null> {
    return Message.findOne({ _id: messageId, deletedAt: null });
  }

  /**
   * Search messages within a conversation
   * Case-insensitive regex search on content field
   * 
   * @param conversationId - Conversation ID
   * @param query - Search query string
   * @param limit - Maximum number of results
   * @returns Array of lightweight search results
   */
  async searchMessages(conversationId: string, query: string, limit: number): Promise<any[]> {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    return Message.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      deletedAt: null,
      type: 'text', // Only search text messages
      content: { $regex: escapedQuery, $options: 'i' }, // Case-insensitive
    })
      .sort({ createdAt: -1 }) // Newest first
      .limit(limit)
      .select('_id conversationId content createdAt senderId') // Lightweight fields only
      .lean();
  }

  /**
   * Find messages around a specific message (before and after)
   * Used for jump-to-message functionality
   * 
   * @param messageId - Target message ID
   * @param limit - Total number of messages to fetch (split between before/after)
   * @returns Array of messages centered around the target
   */
  async findMessagesAround(messageId: string, limit: number): Promise<IMessage[]> {
    const targetMessage = await Message.findOne({
      _id: messageId,
      deletedAt: null,
    }).lean();

    if (!targetMessage) {
      return [];
    }

    const halfLimit = Math.floor(limit / 2);

    // Fetch messages before (older than target)
    const messagesBefore = await Message.find({
      conversationId: targetMessage.conversationId,
      deletedAt: null,
      createdAt: { $lt: targetMessage.createdAt },
    })
      .sort({ createdAt: -1 }) // Descending to get closest first
      .limit(halfLimit)
      .populate('senderId', 'username avatar')
      .lean();

    // Fetch messages after (newer than target)
    const messagesAfter = await Message.find({
      conversationId: targetMessage.conversationId,
      deletedAt: null,
      createdAt: { $gt: targetMessage.createdAt },
    })
      .sort({ createdAt: 1 }) // Ascending to get closest first
      .limit(halfLimit)
      .populate('senderId', 'username avatar')
      .lean();

    // Populate sender for target message
    const targetWithSender = await Message.findById(messageId)
      .populate('senderId', 'username avatar')
      .lean();

    // Combine and sort chronologically (oldest to newest)
    const allMessages = [
      ...messagesBefore.reverse(), // Reverse because we fetched in descending order
      targetWithSender!,
      ...messagesAfter,
    ];

    return allMessages as IMessage[];
  }

  /**
   * Find media items (images, videos, files, links) in a conversation
   * Used for media viewer, docs tab, and links tab
   * 
   * @param conversationId - Conversation ID
   * @param filterType - Type of media to filter ('image', 'video', 'file', 'link', 'all')
   * @param cursor - Pagination cursor (encoded createdAt timestamp)
   * @param limit - Number of items to fetch (will fetch limit + 1 for hasNextPage)
   * @returns Array of media items (includes limit + 1 if more exist)
   */
  async findMediaByConversation(
    conversationId: string,
    filterType: MediaFilterType,
    cursor: string | undefined,
    limit: number
  ): Promise<MediaItem[]> {
    const { cursor: decodedCursor } = parsePaginationParams(cursor, limit);
    const cursorQuery = buildCursorQuery(decodedCursor);

    // Build type filter
    let typeFilter: any = {};
    
    if (filterType === 'image') {
      typeFilter = { type: 'image' };
    } else if (filterType === 'video') {
      typeFilter = { type: 'video' };
    } else if (filterType === 'file') {
      typeFilter = { type: 'file' };
    } else if (filterType === 'link') {
      // Links are text messages with URLs
      typeFilter = {
        type: 'text',
        content: { $regex: /(https?:\/\/[^\s]+)/gi }
      };
    } else if (filterType === 'all') {
      // All media types except plain text
      typeFilter = {
        $or: [
          { type: { $in: ['image', 'video', 'file'] } },
          { type: 'text', content: { $regex: /(https?:\/\/[^\s]+)/gi } }
        ]
      };
    }

    const messages = await Message.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      deletedAt: null,
      ...typeFilter,
      ...cursorQuery,
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .select('_id type media content createdAt senderId')
      .lean();

    // Transform to MediaItem format
    return messages.map((msg: any) => ({
      messageId: msg._id.toString(),
      type: msg.type,
      fileKey: msg.media?.url ? this.extractFileKeyFromUrl(msg.media.url) : undefined,
      content: msg.type === 'text' ? msg.content : undefined,
      createdAt: msg.createdAt,
      senderId: msg.senderId.toString(),
    }));
  }

  /**
   * Extract fileKey from media URL
   * Handles both old S3 URLs and new CloudFront/fileKey patterns
   * 
   * @param url - Media URL
   * @returns File key or the URL itself if it's already a key
   */
  private extractFileKeyFromUrl(url: string): string {
    // If URL is already a key pattern (e.g., "attachments/...")
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }

    // Extract key from S3/CloudFront URL
    try {
      const urlObj = new URL(url);
      // Remove leading slash from pathname
      return urlObj.pathname.substring(1);
    } catch {
      return url;
    }
  }
}

export default new MessageRepository();
