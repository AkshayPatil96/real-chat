// @ts-nocheck
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ChatRequestService } from '../chat-request.service.js';
import ChatRequestRepository from '../chat-request.repository.js';
import { UserService } from '../../users/index.js';
import ConversationService from '../../conversations/conversation.service.js';
import User from '../../users/user.model.js';
import AppError from '../../../utils/AppError.js';
import ChatRequest from '../chat-request.model.js';
import Conversation from '../../conversations/conversation.model.js';

// Mock dependencies
jest.mock('../chat-request.repository.js');
jest.mock('../../users/index.js');
jest.mock('../../conversations/conversation.service.js');
jest.mock('../../users/user.model.js');

// Mock Mongoose models (used in transactions)
jest.mock('../chat-request.model.js');
jest.mock('../../conversations/conversation.model.js');

// Mock transaction helper to execute without sessions in tests
jest.mock('../../../utils/transaction.helper.js', () => ({
  withTransaction: jest.fn((callback) => callback(null)),
}));

describe('ChatRequestService', () => {
  let chatRequestService: ChatRequestService;
  let mockChatRequestRepository: jest.Mocked<typeof ChatRequestRepository>;
  let mockUserService: jest.Mocked<typeof UserService>;
  let mockConversationService: jest.Mocked<typeof ConversationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChatRequestRepository = ChatRequestRepository as any;
    mockUserService = UserService as any;
    mockConversationService = ConversationService as any;
    chatRequestService = new ChatRequestService(mockChatRequestRepository);
  });

  describe('sendRequest', () => {
    const senderId = '507f1f77bcf86cd799439011';
    const receiverEmail = 'receiver@example.com';
    const receiverId = '507f1f77bcf86cd799439012';

    it('should successfully send a chat request', async () => {
      // Arrange
      const mockReceiver = {
        _id: receiverId,
        email: receiverEmail,
        username: 'receiver',
      };

      const mockRequest = {
        _id: '507f1f77bcf86cd799439013',
        senderId,
        receiverId,
        status: 'PENDING',
      };

      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockReceiver);
      (mockUserService.isBlocked as any) = jest.fn().mockResolvedValue(false);
      (mockChatRequestRepository.findActiveRequest as any) = jest.fn().mockResolvedValue(null);
      (mockChatRequestRepository.findLastDeclinedRequest as any) = jest.fn().mockResolvedValue(null);
      (mockChatRequestRepository.create as any) = jest.fn().mockResolvedValue(mockRequest as any);

      // Act
      const result = await chatRequestService.sendRequest(senderId, receiverEmail);

      // Assert
      expect(result).toEqual(mockRequest);
      expect(User.findOne).toHaveBeenCalledWith({ email: receiverEmail, deletedAt: null });
      expect(mockUserService.isBlocked).toHaveBeenCalledTimes(2);
      expect(mockChatRequestRepository.create).toHaveBeenCalledWith(senderId, receiverId);
    });

    it('should throw error if receiver not found', async () => {
      // Arrange
      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(
        chatRequestService.sendRequest(senderId, receiverEmail)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when trying to send request to self', async () => {
      // Arrange
      const mockReceiver = {
        _id: senderId, // Same as sender
        email: receiverEmail,
      };

      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockReceiver);

      // Act & Assert
      await expect(
        chatRequestService.sendRequest(senderId, receiverEmail)
      ).rejects.toThrow('Cannot send request to yourself');
    });

    it('should throw error if sender is blocked by receiver', async () => {
      // Arrange
      const mockReceiver = {
        _id: receiverId,
        email: receiverEmail,
      };

      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockReceiver);
      mockUserService.isBlocked = jest
        .fn()
        .mockResolvedValueOnce(true) // Sender blocked by receiver
        .mockResolvedValueOnce(false);

      // Act & Assert
      await expect(
        chatRequestService.sendRequest(senderId, receiverEmail)
      ).rejects.toThrow('Cannot send request to this user');
    });

    it('should throw error if sender blocked receiver', async () => {
      // Arrange
      const mockReceiver = {
        _id: receiverId,
        email: receiverEmail,
      };

      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockReceiver);
      mockUserService.isBlocked = jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true); // Sender blocked receiver

      // Act & Assert
      await expect(
        chatRequestService.sendRequest(senderId, receiverEmail)
      ).rejects.toThrow('Cannot send request to blocked user');
    });

    it('should throw error if pending request already exists', async () => {
      // Arrange
      const mockReceiver = {
        _id: receiverId,
        email: receiverEmail,
      };

      const existingRequest = {
        _id: '507f1f77bcf86cd799439013',
        senderId,
        receiverId,
        status: 'PENDING',
      };

      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockReceiver);
      (mockUserService.isBlocked as any) = jest.fn().mockResolvedValue(false);
      mockChatRequestRepository.findActiveRequest = jest
        .fn()
        .mockResolvedValue(existingRequest as any);

      // Act & Assert
      await expect(
        chatRequestService.sendRequest(senderId, receiverEmail)
      ).rejects.toThrow('Request already pending');
    });

    it('should throw error if declined request is in cooldown period', async () => {
      // Arrange
      const mockReceiver = {
        _id: receiverId,
        email: receiverEmail,
      };

      const declinedRequest = {
        _id: '507f1f77bcf86cd799439013',
        senderId,
        receiverId,
        status: 'DECLINED',
        respondedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      (User.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockReceiver);
      (mockUserService.isBlocked as any) = jest.fn().mockResolvedValue(false);
      (mockChatRequestRepository.findActiveRequest as any) = jest.fn().mockResolvedValue(null);
      mockChatRequestRepository.findLastDeclinedRequest = jest
        .fn()
        .mockResolvedValue(declinedRequest as any);

      // Act & Assert
      await expect(
        chatRequestService.sendRequest(senderId, receiverEmail)
      ).rejects.toThrow(/Cannot resend request.*day\(s\)/);
    });
  });

  describe('acceptRequest', () => {
    const requestId = '507f1f77bcf86cd799439013';
    const userId = '507f1f77bcf86cd799439012'; // Receiver

    it('should successfully accept request and create conversation', async () => {
      // Arrange
      const mockRequest = {
        _id: requestId,
        senderId: { _id: '507f1f77bcf86cd799439011' },
        receiverId: { _id: userId },
        status: 'PENDING',
      };

      const updatedRequest = { 
        ...mockRequest, 
        status: 'ACCEPTED',
        respondedAt: expect.any(Date),
      };

      const mockConversation = {
        _id: '507f1f77bcf86cd799439014',
        participants: ['507f1f77bcf86cd799439011', userId],
        populate: jest.fn().mockReturnThis(),
      };

      (mockChatRequestRepository.findById as any) = jest.fn().mockResolvedValue(mockRequest as any);
      
      (ChatRequest.findByIdAndUpdate as any) = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(updatedRequest),
      });
      
      (Conversation.findOne as any) = jest.fn().mockResolvedValue(null);
      (Conversation.create as any) = jest.fn().mockResolvedValue([{
        ...mockConversation,
        populate: jest.fn().mockResolvedValue(mockConversation),
      }]);

      // Act
      const result = await chatRequestService.acceptRequest(requestId, userId);

      // Assert
      expect(result.conversationId).toBe(mockConversation._id);
      expect(ChatRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        requestId,
        {
          status: 'ACCEPTED',
          respondedAt: expect.any(Date),
        },
        { new: true }
      );
    });

    it('should throw error if request not found', async () => {
      // Arrange
      (mockChatRequestRepository.findById as any) = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(chatRequestService.acceptRequest(requestId, userId)).rejects.toThrow(
        'Request not found'
      );
    });

    it('should throw error if user is not the receiver', async () => {
      // Arrange
      const mockRequest = {
        _id: requestId,
        senderId: { _id: '507f1f77bcf86cd799439011' },
        receiverId: { _id: '507f1f77bcf86cd799439015' }, // Different user
        status: 'PENDING',
      };

      (mockChatRequestRepository.findById as any) = jest.fn().mockResolvedValue(mockRequest as any);

      // Act & Assert
      await expect(chatRequestService.acceptRequest(requestId, userId)).rejects.toThrow(
        'Only the receiver can accept this request'
      );
    });

    it('should throw error if request is not pending', async () => {
      // Arrange
      const mockRequest = {
        _id: requestId,
        senderId: { _id: '507f1f77bcf86cd799439011' },
        receiverId: { _id: userId },
        status: 'ACCEPTED', // Already accepted
      };

      (mockChatRequestRepository.findById as any) = jest.fn().mockResolvedValue(mockRequest as any);

      // Act & Assert
      await expect(chatRequestService.acceptRequest(requestId, userId)).rejects.toThrow(
        'Request is not pending'
      );
    });
  });

  describe('declineRequest', () => {
    const requestId = '507f1f77bcf86cd799439013';
    const userId = '507f1f77bcf86cd799439012';

    it('should successfully decline request', async () => {
      // Arrange
      const mockRequest = {
        _id: requestId,
        senderId: { _id: '507f1f77bcf86cd799439011' },
        receiverId: { _id: userId },
        status: 'PENDING',
      };

      const updatedRequest = { ...mockRequest, status: 'DECLINED' };

      (mockChatRequestRepository.findById as any) = jest.fn().mockResolvedValue(mockRequest as any);
      mockChatRequestRepository.updateStatus = jest
        .fn()
        .mockResolvedValue(updatedRequest as any);

      // Act
      const result = await chatRequestService.declineRequest(requestId, userId);

      // Assert
      expect(result).toEqual(updatedRequest);
      expect(mockChatRequestRepository.updateStatus).toHaveBeenCalledWith(
        requestId,
        'DECLINED'
      );
    });

    it('should throw error if user is not the receiver', async () => {
      // Arrange
      const mockRequest = {
        _id: requestId,
        senderId: { _id: '507f1f77bcf86cd799439011' },
        receiverId: { _id: '507f1f77bcf86cd799439015' },
        status: 'PENDING',
      };

      (mockChatRequestRepository.findById as any) = jest.fn().mockResolvedValue(mockRequest as any);

      // Act & Assert
      await expect(chatRequestService.declineRequest(requestId, userId)).rejects.toThrow(
        'Only the receiver can decline this request'
      );
    });
  });
});
