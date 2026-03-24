import { Request, Response, NextFunction } from 'express';
import { IMessageService } from './message.interface.js';
import MessageService from './message.service.js';
import { MessageMapper } from './message.dto.js';
import { getSocketIO } from '../../socket/index.js';
import uploadService from '../uploads/upload.service.js';
import logger from '../../utils/logger.js';

export class MessageController {
  constructor(private messageService: IMessageService = MessageService) { }

  /**
   * Get messages with legacy offset pagination (kept for backward compatibility)
   * @deprecated Use getMessagesCursor for better performance
   */
  getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { conversationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await this.messageService.getMessages(conversationId, userId, page, limit);

      res.json({
        messages: MessageMapper.toDTOArray(messages),
        page,
        limit
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get messages with cursor-based pagination (RECOMMENDED)
   * Provides O(1) performance, prevents duplicates, scalable for large datasets
   */
  getMessagesCursor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { conversationId } = req.params;
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.messageService.getMessagesCursor(conversationId, userId, cursor, limit);

      res.json({
        messages: MessageMapper.toDTOArray(result.data),
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { conversationId } = req.params;
      const { content, fileKey: tempFileKey } = req.body;

      let finalFileKey: string | undefined;

      // If fileKey provided, move from temp/ to final location
      if (tempFileKey) {
        finalFileKey = await uploadService.moveFromTemp(tempFileKey);
      }

      // 1. Persist message to MongoDB (source of truth)
      const message = await this.messageService.sendMessage(
        conversationId,
        userId,
        content || '',
        finalFileKey
      );
      const messageDTO = MessageMapper.toDTO(message);

      // 2. Emit socket event for real-time delivery (AFTER DB success)
      const io = getSocketIO();
      if (io) {
        // Emit new message to conversation room
        io.to(`conversation:${conversationId}`).emit('message:new', {
          message: messageDTO,
        });

        // Production Hardening: Emit unread count update to other participants
        // Get conversation to find other participants
        const ConversationService = (await import('../conversations/conversation.service.js')).default;
        const conversation = await ConversationService.getConversationById(conversationId, userId);
        
        // Notify each participant (except sender) of their new unread count
        for (const participant of conversation.participants) {
          const participantId = participant._id.toString();
          if (participantId !== userId) {
            const unreadCount = await this.messageService.getUnreadCount(conversationId, participantId);
            io.to(`user:${participantId}`).emit('conversation:unread_updated', {
              conversationId,
              unreadCount,
            });
          }
        }

        logger.info(`Real-time message and unread counts emitted to conversation:${conversationId}`);
      }

      // 3. Respond to HTTP client
      res.status(201).json({ message: messageDTO });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { conversationId } = req.params;

      const count = await this.messageService.getUnreadCount(conversationId, userId);

      res.json({ count });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { messageId } = req.params;

      // Mark as read in database
      await this.messageService.markAsRead(messageId, userId);

      // Update delivery state to 'read'
      await this.messageService.updateDeliveryState(messageId, 'read');

      // Get message to find conversation ID
      const message = await this.messageService.getMessageById(messageId);
      
      if (message) {
        const conversationId = message.conversationId.toString();
        const io = getSocketIO();
        
        if (io) {
          // Emit read receipt to all participants in conversation
          io.to(`conversation:${conversationId}`).emit('message:read', {
            messageId,
            conversationId,
            userId,
          });

          // Production Hardening: Emit updated unread count for real-time sync
          // Compute fresh unread count after mark-as-read operation
          const updatedUnreadCount = await this.messageService.getUnreadCount(conversationId, userId);
          
          // Emit to user-specific room (only the user who marked as read needs this)
          io.to(`user:${userId}`).emit('conversation:unread_updated', {
            conversationId,
            unreadCount: updatedUnreadCount,
          });

          logger.info(`Read receipt and unread count update emitted for message ${messageId}`);
        }
      }

      res.json({ message: 'Message marked as read' });
    } catch (error) {
      next(error);
    }
  };

  deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { messageId } = req.params;

      await this.messageService.deleteMessage(messageId, userId);

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search messages within a conversation
   * GET /conversations/:conversationId/messages/search
   */
  searchMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { conversationId } = req.params;
      const { query, limit = 20 } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const results = await this.messageService.searchMessages(
        conversationId,
        userId,
        query,
        parseInt(limit as string) || 20
      );

      res.json({ results });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get messages around a specific message (jump-to-message)
   * GET /messages/around/:messageId
   */
  getMessagesAround = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { messageId } = req.params;
      const { limit = 50 } = req.query;

      const result = await this.messageService.getMessagesAround(
        messageId,
        userId,
        parseInt(limit as string) || 50
      );

      res.json({
        centerMessageId: result.centerMessageId,
        messages: MessageMapper.toDTOArray(result.messages),
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new MessageController();
