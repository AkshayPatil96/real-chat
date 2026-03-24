import ChatRequest from './chat-request.model.js';
import { IChatRequest, IChatRequestRepository, ChatRequestStatus } from './chat-request.interface.js';
import mongoose from 'mongoose';

export class ChatRequestRepository implements IChatRequestRepository {
  async findById(requestId: string): Promise<IChatRequest | null> {
    return ChatRequest.findById(requestId)
      .populate('senderId', 'username avatar email')
      .populate('receiverId', 'username avatar email');
  }

  async findActiveRequest(senderId: string, receiverId: string): Promise<IChatRequest | null> {
    return ChatRequest.findOne({
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      status: { $in: ['PENDING', 'ACCEPTED'] },
    });
  }

  async create(senderId: string, receiverId: string): Promise<IChatRequest> {
    return ChatRequest.create({
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      status: 'PENDING',
    });
  }

  async updateStatus(requestId: string, status: ChatRequestStatus): Promise<IChatRequest | null> {
    return ChatRequest.findByIdAndUpdate(
      requestId,
      {
        status,
        respondedAt: new Date(),
      },
      { new: true }
    )
      .populate('senderId', 'username avatar email')
      .populate('receiverId', 'username avatar email');
  }

  async listIncoming(userId: string, page: number, limit: number): Promise<IChatRequest[]> {
    const skip = (page - 1) * limit;

    return ChatRequest.find({
      receiverId: new mongoose.Types.ObjectId(userId),
      status: 'PENDING',
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username avatar email');
  }

  async listOutgoing(userId: string, page: number, limit: number): Promise<IChatRequest[]> {
    const skip = (page - 1) * limit;

    return ChatRequest.find({
      senderId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('receiverId', 'username avatar email');
  }

  async findLastDeclinedRequest(senderId: string, receiverId: string): Promise<IChatRequest | null> {
    return ChatRequest.findOne({
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      status: 'DECLINED',
    }).sort({ respondedAt: -1 });
  }
}

export default new ChatRequestRepository();
