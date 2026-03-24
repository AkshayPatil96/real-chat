import mongoose, { Document } from 'mongoose';

export type ChatRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';

export interface IChatRequest extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: ChatRequestStatus;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatRequestRepository {
  findById(requestId: string): Promise<IChatRequest | null>;
  findActiveRequest(senderId: string, receiverId: string): Promise<IChatRequest | null>;
  create(senderId: string, receiverId: string): Promise<IChatRequest>;
  updateStatus(requestId: string, status: ChatRequestStatus): Promise<IChatRequest | null>;
  listIncoming(userId: string, page: number, limit: number): Promise<IChatRequest[]>;
  listOutgoing(userId: string, page: number, limit: number): Promise<IChatRequest[]>;
  findLastDeclinedRequest(senderId: string, receiverId: string): Promise<IChatRequest | null>;
}

export interface IChatRequestService {
  sendRequest(senderId: string, receiverEmail: string): Promise<IChatRequest>;
  acceptRequest(requestId: string, userId: string): Promise<{ request: IChatRequest; conversationId: string }>;
  declineRequest(requestId: string, userId: string): Promise<IChatRequest>;
  blockSender(requestId: string, userId: string): Promise<IChatRequest>;
  listIncomingRequests(userId: string, page: number, limit: number): Promise<IChatRequest[]>;
  listOutgoingRequests(userId: string, page: number, limit: number): Promise<IChatRequest[]>;
}
