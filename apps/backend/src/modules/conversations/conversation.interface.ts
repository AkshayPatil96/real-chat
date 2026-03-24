import mongoose, { Document } from 'mongoose';
import { PaginatedResponse } from '../../types/pagination.types.js';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  type: 'direct' | 'group';
  name?: string;
  lastMessage?: {
    messageId: mongoose.Types.ObjectId;
    content: string;
    senderId: mongoose.Types.ObjectId;
    type: 'text' | 'image' | 'file' | 'video' | 'audio';
    timestamp: Date;
  };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationRepository {
  findByParticipants(participantIds: string[]): Promise<IConversation | null>;
  listForUser(userId: string, page: number, limit: number): Promise<IConversation[]>;
  listForUserCursor(userId: string, cursor: string | undefined, limit: number): Promise<IConversation[]>;
  create(participantIds: string[], type: 'direct' | 'group', name?: string): Promise<IConversation>;
  updateLastMessage(conversationId: string, content: string, senderId: string): Promise<void>;
  softDelete(conversationId: string): Promise<void>;
  findById(conversationId: string): Promise<IConversation | null>;
}

export interface IConversationService {
  createOrGetConversation(userId: string, otherUserId: string): Promise<IConversation>;
  listConversations(userId: string, page: number, limit: number): Promise<IConversation[]>;
  listConversationsCursor(userId: string, cursor: string | undefined, limit: number): Promise<PaginatedResponse<IConversation>>;
  getConversationById(conversationId: string, userId: string): Promise<IConversation>;
  deleteConversation(conversationId: string, userId: string): Promise<void>;
}
