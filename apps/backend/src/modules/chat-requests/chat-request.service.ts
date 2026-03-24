import { IChatRequest, IChatRequestService, IChatRequestRepository } from './chat-request.interface.js';
import ChatRequestRepository from './chat-request.repository.js';
import { UserService } from '../users/index.js';
import ConversationService from '../conversations/conversation.service.js';
import AppError from '../../utils/AppError.js';
import User from '../users/user.model.js';
import { withTransaction } from '../../utils/transaction.helper.js';
import ChatRequest from './chat-request.model.js';
import Conversation from '../conversations/conversation.model.js';
import mongoose from 'mongoose';

const DECLINE_COOLDOWN_DAYS = 7;

export class ChatRequestService implements IChatRequestService {
  constructor(private chatRequestRepository: IChatRequestRepository = ChatRequestRepository) { }

  async sendRequest(senderId: string, receiverEmail: string): Promise<IChatRequest> {
    const receiver = await User.findOne({ email: receiverEmail, deletedAt: null });
    if (!receiver) {
      throw new AppError('User not found', 404);
    }

    const receiverId = receiver._id.toString();

    if (senderId === receiverId) {
      throw new AppError('Cannot send request to yourself', 400);
    }

    const isSenderBlocked = await UserService.isBlocked(receiverId, senderId);
    if (isSenderBlocked) {
      throw new AppError('Cannot send request to this user', 403);
    }

    const isReceiverBlocked = await UserService.isBlocked(senderId, receiverId);
    if (isReceiverBlocked) {
      throw new AppError('Cannot send request to blocked user', 403);
    }

    const existingRequest = await this.chatRequestRepository.findActiveRequest(senderId, receiverId);
    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        throw new AppError('Request already pending', 409);
      }
      if (existingRequest.status === 'ACCEPTED') {
        throw new AppError('Request already accepted', 409);
      }
    }

    const reverseRequest = await this.chatRequestRepository.findActiveRequest(receiverId, senderId);
    if (reverseRequest && reverseRequest.status === 'PENDING') {
      throw new AppError('This user has already sent you a request', 409);
    }

    const lastDeclined = await this.chatRequestRepository.findLastDeclinedRequest(senderId, receiverId);
    if (lastDeclined && lastDeclined.respondedAt) {
      const daysSinceDecline = (Date.now() - lastDeclined.respondedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDecline < DECLINE_COOLDOWN_DAYS) {
        const daysRemaining = Math.ceil(DECLINE_COOLDOWN_DAYS - daysSinceDecline);
        throw new AppError(`Cannot resend request. Please wait ${daysRemaining} more day(s)`, 409);
      }
    }

    return this.chatRequestRepository.create(senderId, receiverId);
  }

  /**
   * Accept chat request with atomic transaction
   * Ensures request status update and conversation creation happen atomically
   * Rolls back both operations if either fails
   * 
   * Transaction operations:
   * 1. Update request status to ACCEPTED
   * 2. Create or get conversation between sender and receiver
   */
  async acceptRequest(requestId: string, userId: string): Promise<{ request: IChatRequest; conversationId: string }> {
    // Verify request exists and validate permissions (outside transaction)
    const request = await this.chatRequestRepository.findById(requestId);
    console.log('request: ', request);

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.receiverId._id.toString() !== userId) {
      throw new AppError('Only the receiver can accept this request', 403);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('Request is not pending', 400);
    }

    const senderId = request.senderId._id.toString();
    const receiverId = userId;

    // Execute within transaction for atomicity
    const result = await withTransaction(async (session) => {
      // 1. Update request status to ACCEPTED
      const sessionOption = session ? { session } : {};
      const updatedRequest = await ChatRequest.findByIdAndUpdate(
        requestId,
        {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
        { new: true, ...sessionOption } // Pass session for transaction
      ).populate('senderId receiverId', 'username email avatar');

      if (!updatedRequest) {
        throw new AppError('Failed to update request', 500);
      }

      // 2. Create or get conversation atomically
      const senderObjectId = new mongoose.Types.ObjectId(senderId);
      const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

      // Check if conversation already exists
      const query = Conversation.findOne({
        type: 'direct',
        participants: { $all: [senderObjectId, receiverObjectId], $size: 2 },
        deletedAt: null,
      });
      
      // Only add session if it exists
      let conversation = session ? await query.session(session) : await query;

      // Create new conversation if doesn't exist
      if (!conversation) {
        const conversationResult = await Conversation.create(
          [{
            participants: [senderObjectId, receiverObjectId],
            type: 'direct',
          }],
          sessionOption
        );
        conversation = conversationResult[0];
      }

      // Populate participants
      await conversation.populate('participants', 'username avatar');

      return {
        request: updatedRequest,
        conversationId: conversation._id.toString(),
      };
    });

    return result;
  }

  async declineRequest(requestId: string, userId: string): Promise<IChatRequest> {
    const request = await this.chatRequestRepository.findById(requestId);

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.receiverId._id.toString() !== userId) {
      throw new AppError('Only the receiver can decline this request', 403);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('Request is not pending', 400);
    }

    const updatedRequest = await this.chatRequestRepository.updateStatus(requestId, 'DECLINED');
    if (!updatedRequest) {
      throw new AppError('Failed to update request', 500);
    }

    return updatedRequest;
  }

  async blockSender(requestId: string, userId: string): Promise<IChatRequest> {
    const request = await this.chatRequestRepository.findById(requestId);

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.receiverId._id.toString() !== userId) {
      throw new AppError('Only the receiver can block the sender', 403);
    }

    const senderId = request.senderId._id.toString();
    await UserService.blockUser(userId, senderId);

    const updatedRequest = await this.chatRequestRepository.updateStatus(requestId, 'BLOCKED');
    if (!updatedRequest) {
      throw new AppError('Failed to update request', 500);
    }

    return updatedRequest;
  }

  async listIncomingRequests(userId: string, page: number, limit: number): Promise<IChatRequest[]> {
    return this.chatRequestRepository.listIncoming(userId, page, limit);
  }

  async listOutgoingRequests(userId: string, page: number, limit: number): Promise<IChatRequest[]> {
    return this.chatRequestRepository.listOutgoing(userId, page, limit);
  }
}

export default new ChatRequestService();
