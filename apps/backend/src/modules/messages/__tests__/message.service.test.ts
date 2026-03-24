// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MessageService } from '../message.service.js';
import MessageRepository from '../message.repository.js';
import ConversationRepository from '../../conversations/conversation.repository.js';
import ConversationService from '../../conversations/conversation.service.js';
import AppError from '../../../utils/AppError.js';
import Message from '../message.model.js';
import Conversation from '../../conversations/conversation.model.js';

// Mock dependencies
jest.mock('../message.repository.js');
jest.mock('../../conversations/conversation.repository.js');
jest.mock('../../conversations/conversation.service.js');

// Mock Mongoose models (used in transactions)
jest.mock('../message.model.js');
jest.mock('../../conversations/conversation.model.js');

// Mock transaction helper to execute without sessions in tests
jest.mock('../../../utils/transaction.helper.js', () => ({
  withTransaction: jest.fn((callback) => callback(null)),
}));

describe('MessageService', () => {
  let messageService: MessageService;
  let mockMessageRepository: jest.Mocked<typeof MessageRepository>;
  let mockConversationRepository: jest.Mocked<typeof ConversationRepository>;
  let mockConversationService: jest.Mocked<typeof ConversationService>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockMessageRepository = MessageRepository as any;
    mockConversationRepository = ConversationRepository as any;
    mockConversationService = ConversationService as any;

    messageService = new MessageService(
      mockMessageRepository,
      mockConversationRepository
    );
  });

  describe('sendMessage', () => {
    const conversationId = '507f1f77bcf86cd799439011';
    const senderId = '507f1f77bcf86cd799439012';
    const content = 'Hello, world!';

    it('should successfully send a message', async () => {
      // Arrange      
      const mockMessage = {
        _id: '507f1f77bcf86cd799439013',
        conversationId,
        senderId,
        content,
        type: 'text',
        deliveryState: 'sent',
        readBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        populate: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439013',
          conversationId,
          senderId,
          content,
        }),
      };

      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [senderId, '507f1f77bcf86cd799439014'],
        type: 'direct',
      } as any);

      (Message.create as any) = jest.fn().mockResolvedValue([mockMessage]);
      (Conversation.findByIdAndUpdate as any) = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await messageService.sendMessage(conversationId, senderId, content);

      // Assert
      expect(result).toBeDefined();
      expect(mockConversationService.getConversationById).toHaveBeenCalledWith(
        conversationId,
        senderId
      );
      expect(Message.create).toHaveBeenCalled();
      expect(Conversation.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          lastMessage: expect.any(Object),
          updatedAt: expect.any(Date),
        }),
        {}
      );
    });

    it('should throw error if user is not participant', async () => {
      // Arrange
      mockConversationService.getConversationById = jest
        .fn()
        .mockRejectedValue(new AppError('Not authorized to access this conversation', 403));

      // Act & Assert
      await expect(
        messageService.sendMessage(conversationId, senderId, content)
      ).rejects.toThrow('Not authorized to access this conversation');
    }); 

    it('should throw error if conversation not found', async () => {
      // Arrange
      mockConversationService.getConversationById = jest
        .fn()
        .mockRejectedValue(new AppError('Conversation not found', 404));

      // Act & Assert
      await expect(
        messageService.sendMessage(conversationId, senderId, content)
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('markAsRead', () => {
    const messageId = '507f1f77bcf86cd799439013';
    const userId = '507f1f77bcf86cd799439012';
    const conversationId = '507f1f77bcf86cd799439011';

    it('should successfully mark message as read', async () => {
      // Arrange
      const mockMessage = {
        _id: messageId,
        conversationId,
        senderId: '507f1f77bcf86cd799439014',
        content: 'Test',
        readBy: [],
      };

      mockMessageRepository.findById = jest.fn().mockResolvedValue(mockMessage as any);
      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [userId, '507f1f77bcf86cd799439014'],
      } as any);
      mockMessageRepository.markAsRead = jest.fn().mockResolvedValue(undefined);

      // Act
      await messageService.markAsRead(messageId, userId);

      // Assert
      expect(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
      expect(mockConversationService.getConversationById).toHaveBeenCalledWith(
        conversationId.toString(),
        userId
      );
      expect(mockMessageRepository.markAsRead).toHaveBeenCalledWith(messageId, userId);
    });

    it('should throw error if message not found', async () => {
      // Arrange
      mockMessageRepository.findById = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(messageService.markAsRead(messageId, userId)).rejects.toThrow(
        'Message not found'
      );
    });

    it('should throw error if user not participant', async () => {
      // Arrange
      const mockMessage = {
        _id: messageId,
        conversationId,
        senderId: '507f1f77bcf86cd799439014',
      };

      mockMessageRepository.findById = jest.fn().mockResolvedValue(mockMessage as any);
      mockConversationService.getConversationById = jest
        .fn()
        .mockRejectedValue(new AppError('Not authorized to access this conversation', 403));

      // Act & Assert
      await expect(messageService.markAsRead(messageId, userId)).rejects.toThrow(
        'Not authorized to access this conversation'
      );
    });
  });

  describe('getUnreadCount', () => {
    const conversationId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';

    it('should return unread count for conversation', async () => {
      // Arrange
      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [userId, '507f1f77bcf86cd799439014'],
      } as any);
      mockMessageRepository.getUnreadCount = jest.fn().mockResolvedValue(5);

      // Act
      const result = await messageService.getUnreadCount(conversationId, userId);

      // Assert
      expect(result).toBe(5);
      expect(mockConversationService.getConversationById).toHaveBeenCalledWith(
        conversationId,
        userId
      );
      expect(mockMessageRepository.getUnreadCount).toHaveBeenCalledWith(
        conversationId,
        userId
      );
    });

    it('should throw error if user not participant', async () => {
      // Arrange
      mockConversationService.getConversationById = jest
        .fn()
        .mockRejectedValue(new AppError('Not authorized to access this conversation', 403));

      // Act & Assert
      await expect(
        messageService.getUnreadCount(conversationId, userId)
      ).rejects.toThrow('Not authorized to access this conversation');
    });
  });

  describe('deleteMessage', () => {
    const messageId = '507f1f77bcf86cd799439013';
    const userId = '507f1f77bcf86cd799439012';

    it('should successfully delete message if user is sender', async () => {
      // Arrange
      const mockMessage = {
        _id: messageId,
        conversationId: '507f1f77bcf86cd799439011',
        senderId: userId,
        content: 'Test',
      };

      mockMessageRepository.findById = jest.fn().mockResolvedValue(mockMessage as any);
      mockMessageRepository.softDelete = jest.fn().mockResolvedValue(undefined);

      // Act
      await messageService.deleteMessage(messageId, userId);

      // Assert
      expect(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
      expect(mockMessageRepository.softDelete).toHaveBeenCalledWith(messageId);
    });

    it('should throw error if message not found', async () => {
      // Arrange
      mockMessageRepository.findById = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(messageService.deleteMessage(messageId, userId)).rejects.toThrow(
        'Message not found'
      );
    });

    it('should throw error if user is not sender', async () => {
      // Arrange
      const mockMessage = {
        _id: messageId,
        conversationId: '507f1f77bcf86cd799439011',
        senderId: '507f1f77bcf86cd799439014', // Different user
        content: 'Test',
      };

      mockMessageRepository.findById = jest.fn().mockResolvedValue(mockMessage as any);

      // Act & Assert
      await expect(messageService.deleteMessage(messageId, userId)).rejects.toThrow(
        'Not authorized to delete this message'
      );
    });
  });

  describe('searchMessages', () => {
    const conversationId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';

    it('should return search results for valid query', async () => {
      // Arrange
      const query = 'hello';
      const mockResults = [
        {
          _id: '507f1f77bcf86cd799439013',
          conversationId,
          content: 'Hello world!',
          createdAt: new Date('2024-01-01'),
          senderId: userId,
        },
        {
          _id: '507f1f77bcf86cd799439014',
          conversationId,
          content: 'Hello there!',
          createdAt: new Date('2024-01-02'),
          senderId: userId,
        },
      ];

      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [userId],
      } as any);

      mockMessageRepository.searchMessages = jest.fn().mockResolvedValue(mockResults as any);

      // Act
      const results = await messageService.searchMessages(conversationId, userId, query, 20);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].messageId).toBe('507f1f77bcf86cd799439013');
      expect(results[0].snippet).toBe('Hello world!');
      expect(results[1].messageId).toBe('507f1f77bcf86cd799439014');
      expect(mockConversationService.getConversationById).toHaveBeenCalledWith(
        conversationId,
        userId
      );
      expect(mockMessageRepository.searchMessages).toHaveBeenCalledWith(
        conversationId,
        query,
        20
      );
    });

    it('should throw error for empty query', async () => {
      // Arrange
      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [userId],
      } as any);

      // Act & Assert
      await expect(
        messageService.searchMessages(conversationId, userId, '', 20)
      ).rejects.toThrow('Search query cannot be empty');
    });

    it('should throw error for query too long', async () => {
      // Arrange
      const longQuery = 'a'.repeat(201);
      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [userId],
      } as any);

      // Act & Assert
      await expect(
        messageService.searchMessages(conversationId, userId, longQuery, 20)
      ).rejects.toThrow('Search query too long');
    });

    it('should truncate long snippets to 150 characters', async () => {
      // Arrange
      const query = 'test';
      const longContent = 'a'.repeat(200);
      const mockResults = [
        {
          _id: '507f1f77bcf86cd799439013',
          conversationId,
          content: longContent,
          createdAt: new Date(),
          senderId: userId,
        },
      ];

      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [userId],
      } as any);

      mockMessageRepository.searchMessages = jest.fn().mockResolvedValue(mockResults as any);

      // Act
      const results = await messageService.searchMessages(conversationId, userId, query, 20);

      // Assert
      expect(results[0].snippet).toHaveLength(150);
    });
  });

  describe('getMessagesAround', () => {
    const messageId = '507f1f77bcf86cd799439013';
    const conversationId = '507f1f77bcf86cd799439011';
    const userId = '507f1f77bcf86cd799439012';

    it('should return messages around target message', async () => {
      // Arrange
      const targetMessage = {
        _id: messageId,
        conversationId,
        content: 'Target message',
        createdAt: new Date('2024-01-15'),
        senderId: userId,
      };

      const mockMessages = [
        {
          _id: '507f1f77bcf86cd799439010',
          content: 'Before 1',
          createdAt: new Date('2024-01-14'),
        },
        targetMessage,
        {
          _id: '507f1f77bcf86cd799439015',
          content: 'After 1',
          createdAt: new Date('2024-01-16'),
        },
      ];

      mockMessageRepository.findById = jest.fn().mockResolvedValue(targetMessage as any);
      mockConversationService.getConversationById = jest.fn().mockResolvedValue({
        _id: conversationId,
        participants: [userId],
      } as any);
      mockMessageRepository.findMessagesAround = jest.fn().mockResolvedValue(mockMessages as any);

      // Act
      const result = await messageService.getMessagesAround(messageId, userId, 50);

      // Assert
      expect(result.centerMessageId).toBe(messageId);
      expect(result.messages).toHaveLength(3);
      expect(result.messages[1]._id).toBe(messageId);
      expect(mockMessageRepository.findById).toHaveBeenCalledWith(messageId);
      expect(mockConversationService.getConversationById).toHaveBeenCalledWith(
        conversationId,
        userId
      );
      expect(mockMessageRepository.findMessagesAround).toHaveBeenCalledWith(messageId, 50);
    });

    it('should throw error if message not found', async () => {
      // Arrange
      mockMessageRepository.findById = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        messageService.getMessagesAround(messageId, userId, 50)
      ).rejects.toThrow('Message not found');
    });

    it('should throw error if user not participant', async () => {
      // Arrange
      const targetMessage = {
        _id: messageId,
        conversationId,
        content: 'Target message',
        createdAt: new Date(),
        senderId: userId,
      };

      mockMessageRepository.findById = jest.fn().mockResolvedValue(targetMessage as any);
      mockConversationService.getConversationById = jest
        .fn()
        .mockRejectedValue(new AppError('Not authorized to access this conversation', 403));

      // Act & Assert
      await expect(
        messageService.getMessagesAround(messageId, userId, 50)
      ).rejects.toThrow('Not authorized to access this conversation');
    });
  });
});
