import { Request, Response, NextFunction } from 'express';
import { IConversationService } from './conversation.interface.js';
import ConversationService from './conversation.service.js';
import { ConversationMapper } from './conversation.dto.js';
import { MessageService } from '../messages/index.js';
import { validationResult } from 'express-validator';
import AppError from '../../utils/AppError.js';

export class ConversationController {
  constructor(private conversationService: IConversationService = ConversationService) { }

  /**
   * List conversations with legacy offset pagination (kept for backward compatibility)
   * @deprecated Use listConversationsCursor for better performance
   */
  listConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const conversations = await this.conversationService.listConversations(userId, page, limit);

      // Compute unread count for each conversation
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const unreadCount = await MessageService.getUnreadCount(
            conv._id.toString(),
            userId
          );
          return ConversationMapper.toDTO(conv, unreadCount);
        })
      );

      res.json({
        conversations: conversationsWithUnread,
        page,
        limit
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List conversations with cursor-based pagination (RECOMMENDED)
   * Provides O(1) performance, prevents duplicates, scalable for large datasets
   */
  listConversationsCursor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.conversationService.listConversationsCursor(userId, cursor, limit);

      // Compute unread count for each conversation
      const conversationsWithUnread = await Promise.all(
        result.data.map(async (conv) => {
          const unreadCount = await MessageService.getUnreadCount(
            conv._id.toString(),
            userId
          );
          return ConversationMapper.toDTO(conv, unreadCount);
        })
      );

      res.json({
        conversations: conversationsWithUnread,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  createConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new AppError(errors.array()[0].msg, 400));
      }

      const userId = req.userId!; // MongoDB user ID
      const { otherUserId } = req.body;

      const conversation = await this.conversationService.createOrGetConversation(userId, otherUserId);

      res.status(201).json({ conversation: ConversationMapper.toDTO(conversation) });
    } catch (error) {
      next(error);
    }
  };

  getConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID
      const { id } = req.params;

      const conversation = await this.conversationService.getConversationById(id, userId);

      res.json({ conversation: ConversationMapper.toDTO(conversation) });
    } catch (error) {
      next(error);
    }
  };

  deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID
      const { id } = req.params;

      await this.conversationService.deleteConversation(id, userId);

      res.json({ message: 'Conversation deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get media items in a conversation (images, videos, files, links)
   * Used for media viewer, docs tab, and links tab
   * Independent pagination from chat messages
   */
  getConversationMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const type = (req.query.type as string) || 'all';
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await MessageService.getMediaByConversation(
        id,
        userId,
        type as any,
        cursor,
        limit
      );

      res.json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new ConversationController();
