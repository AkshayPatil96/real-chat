// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationService } from '../conversation.service.js';
import ConversationRepository from '../conversation.repository.js';
import { UserService } from '../../users/index.js';
import AppError from '../../../utils/AppError.js';
import Conversation from '../conversation.model.js';
import Message from '../../messages/message.model.js';

// Mock dependencies
jest.mock('../conversation.repository.js');
jest.mock('../../users/index.js');

// Mock Mongoose models (used in transactions)
jest.mock('../conversation.model.js');
jest.mock('../../messages/message.model.js');

// Mock transaction helper to execute without sessions in tests
jest.mock('../../../utils/transaction.helper.js', () => ({
  withTransaction: jest.fn((callback) => callback(null)),
}));

describe('ConversationService', () => {
  let conversationService: ConversationService;
  let mockConversationRepository: jest.Mocked<typeof ConversationRepository>;
  let mockUserService: jest.Mocked<typeof UserService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationRepository = ConversationRepository as any;
    mockUserService = UserService as any;
    conversationService = new ConversationService(mockConversationRepository);
  });

  describe('createOrGetConversation', () => {
    const userId = '507f1f77bcf86cd799439011';
    const otherUserId = '507f1f77bcf86cd799439012';

    it('should return existing conversation if found', async () => {
      // Arrange
      const mockConversation = {
        _id: '507f1f77bcf86cd799439013',
        participants: [userId, otherUserId],
        type: 'direct',
      };

      mockUserService.getUserById = jest.fn().mockResolvedValue({} as any);
      mockUserService.isBlocked = jest.fn().mockResolvedValue(false);
      mockConversationRepository.findByParticipants = jest
        .fn()
        .mockResolvedValue(mockConversation as any);

      // Act
      const result = await conversationService.createOrGetConversation(userId, otherUserId);

      // Assert
      expect(result).toEqual(mockConversation);
      expect(mockUserService.getUserById).toHaveBeenCalledTimes(2);
      expect(mockUserService.isBlocked).toHaveBeenCalledWith(userId, otherUserId);
      expect(mockUserService.isBlocked).toHaveBeenCalledWith(otherUserId, userId);
      expect(mockConversationRepository.findByParticipants).toHaveBeenCalledWith([
        userId,
        otherUserId,
      ]);
    });

    it('should create new conversation if not found', async () => {
      // Arrange
      const mockNewConversation = {
        _id: '507f1f77bcf86cd799439013',
        participants: [userId, otherUserId],
        type: 'direct',
      };

      mockUserService.getUserById = jest.fn().mockResolvedValue({} as any);
      mockUserService.isBlocked = jest.fn().mockResolvedValue(false);
      mockConversationRepository.findByParticipants = jest.fn().mockResolvedValue(null);
      mockConversationRepository.create = jest
        .fn()
        .mockResolvedValue(mockNewConversation as any);

      // Act
      const result = await conversationService.createOrGetConversation(userId, otherUserId);

      // Assert
      expect(result).toEqual(mockNewConversation);
      expect(mockConversationRepository.create).toHaveBeenCalledWith(
        [userId, otherUserId],
        'direct'
      );
    });

    it('should throw error if user is blocked', async () => {
      // Arrange
      mockUserService.getUserById = jest.fn().mockResolvedValue({} as any);
      mockUserService.isBlocked = jest
        .fn()
        .mockResolvedValueOnce(true) // userId blocked otherUserId
        .mockResolvedValueOnce(false);

      // Act & Assert
      await expect(
        conversationService.createOrGetConversation(userId, otherUserId)
      ).rejects.toThrow('Cannot create conversation with blocked user');
    });

    it('should throw error if blocked by other user', async () => {
      // Arrange
      mockUserService.getUserById = jest.fn().mockResolvedValue({} as any);
      mockUserService.isBlocked = jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true); // otherUserId blocked userId

      // Act & Assert
      await expect(
        conversationService.createOrGetConversation(userId, otherUserId)
      ).rejects.toThrow('Cannot create conversation with blocked user');
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mockUserService.getUserById = jest
        .fn()
        .mockRejectedValue(new AppError('User not found', 404));

      // Act & Assert
      await expect(
        conversationService.createOrGetConversation(userId, otherUserId)
      ).rejects.toThrow('User not found');
    });
  });

  describe('getConversationById', () => {
    const conversationId = '507f1f77bcf86cd799439013';
    const userId = '507f1f77bcf86cd799439011';

    it('should return conversation if user is participant', async () => {
      // Arrange
      const mockConversation = {
        _id: conversationId,
        participants: [
          { _id: userId },
          { _id: '507f1f77bcf86cd799439012' },
        ],
        type: 'direct',
      };

      mockConversationRepository.findById = jest
        .fn()
        .mockResolvedValue(mockConversation as any);

      // Act
      const result = await conversationService.getConversationById(conversationId, userId);

      // Assert
      expect(result).toEqual(mockConversation);
      expect(mockConversationRepository.findById).toHaveBeenCalledWith(conversationId);
    });

    it('should throw error if conversation not found', async () => {
      // Arrange
      mockConversationRepository.findById = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        conversationService.getConversationById(conversationId, userId)
      ).rejects.toThrow('Conversation not found');
    });

    it('should throw error if user is not participant', async () => {
      // Arrange
      const mockConversation = {
        _id: conversationId,
        participants: [
          { _id: '507f1f77bcf86cd799439014' },
          { _id: '507f1f77bcf86cd799439015' },
        ],
        type: 'direct',
      };

      mockConversationRepository.findById = jest
        .fn()
        .mockResolvedValue(mockConversation as any);

      // Act & Assert
      await expect(
        conversationService.getConversationById(conversationId, userId)
      ).rejects.toThrow('Not authorized to access this conversation');
    });
  });

  describe('listConversations', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('should return list of conversations', async () => {
      // Arrange
      const mockConversations = [
        { _id: '1', participants: [userId, '2'], type: 'direct' },
        { _id: '2', participants: [userId, '3'], type: 'direct' },
      ];

      mockConversationRepository.listForUser = jest
        .fn()
        .mockResolvedValue(mockConversations as any);

      // Act
      const result = await conversationService.listConversations(userId, 1, 20);

      // Assert
      expect(result).toEqual(mockConversations);
      expect(mockConversationRepository.listForUser).toHaveBeenCalledWith(userId, 1, 20);
    });

    it('should use default pagination values', async () => {
      // Arrange
      mockConversationRepository.listForUser = jest.fn().mockResolvedValue([]);

      // Act
      await conversationService.listConversations(userId);

      // Assert
      expect(mockConversationRepository.listForUser).toHaveBeenCalledWith(userId, 1, 20);
    });
  });

  describe('deleteConversation', () => {
    const conversationId = '507f1f77bcf86cd799439013';
    const userId = '507f1f77bcf86cd799439011';

    it('should successfully soft delete conversation', async () => {
      // Arrange      
      const mockConversation = {
        _id: conversationId,
        participants: [{ _id: userId }, { _id: '507f1f77bcf86cd799439012' }],
        type: 'direct',
      };

      mockConversationRepository.findById = jest
        .fn()
        .mockResolvedValue(mockConversation as any);
      
      (Conversation.findByIdAndUpdate as any) = jest.fn().mockResolvedValue(undefined);
      (Message.updateMany as any) = jest.fn().mockResolvedValue({ modifiedCount: 5 });

      // Act
      await conversationService.deleteConversation(conversationId, userId);

      // Assert
      expect(mockConversationRepository.findById).toHaveBeenCalledWith(conversationId);
      expect(Conversation.findByIdAndUpdate).toHaveBeenCalledWith(
        conversationId,
        { deletedAt: expect.any(Date) },
        {}
      );
      expect(Message.updateMany).toHaveBeenCalledWith(
        { conversationId, deletedAt: null },
        { deletedAt: expect.any(Date) },
        {}
      );
    });

    it('should throw error if user is not participant', async () => {
      // Arrange
      const mockConversation = {
        _id: conversationId,
        participants: [
          { _id: '507f1f77bcf86cd799439014' },
          { _id: '507f1f77bcf86cd799439015' },
        ],
        type: 'direct',
      };

      mockConversationRepository.findById = jest
        .fn()
        .mockResolvedValue(mockConversation as any);

      // Act & Assert
      await expect(
        conversationService.deleteConversation(conversationId, userId)
      ).rejects.toThrow('Not authorized to access this conversation');
    });
  });
});
