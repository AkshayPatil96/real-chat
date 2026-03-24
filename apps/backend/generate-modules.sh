#!/bin/bash

# This script generates the remaining modular structure files
# Run from apps/backend directory

# Conversations module files
cat > src/modules/conversations/conversation.interface.ts << 'EOF'
import { IConversation } from './conversation.model.js';

export interface IConversationRepository {
  findByParticipants(participantIds: string[]): Promise<IConversation | null>;
  listForUser(userId: string, page: number, limit: number): Promise<IConversation[]>;
  create(participantIds: string[], type: 'direct' | 'group', name?: string): Promise<IConversation>;
  updateLastMessage(conversationId: string, content: string, senderId: string): Promise<void>;
  softDelete(conversationId: string): Promise<void>;
  findById(conversationId: string): Promise<IConversation | null>;
}

export interface IConversationService {
  createOrGetConversation(userId: string, otherUserId: string): Promise<IConversation>;
  listConversations(userId: string, page: number, limit: number): Promise<IConversation[]>;
  getConversationById(conversationId: string, userId: string): Promise<IConversation>;
  deleteConversation(conversationId: string, userId: string): Promise<void>;
}

export { IConversation };
EOF

cat > src/modules/conversations/conversation.dto.ts << 'EOF'
import { ConversationDTO as SharedConversationDTO, CreateConversationDTO as SharedCreateConversationDTO } from '@repo/shared-types';
import { IConversation } from './conversation.interface.js';

export type ConversationDTO = SharedConversationDTO;
export type CreateConversationDTO = SharedCreateConversationDTO;

export class ConversationMapper {
  static toDTO(conversation: IConversation): ConversationDTO {
    return {
      id: conversation._id.toString(),
      participants: conversation.participants.map(p => p.toString()),
      type: conversation.type,
      name: conversation.name,
      lastMessage: conversation.lastMessage ? {
        content: conversation.lastMessage.content,
        senderId: conversation.lastMessage.senderId.toString(),
        timestamp: conversation.lastMessage.timestamp.toISOString(),
      } : undefined,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  static toDTOArray(conversations: IConversation[]): ConversationDTO[] {
    return conversations.map(this.toDTO);
  }
}
EOF

cat > src/modules/conversations/conversation.repository.ts << 'EOF'
import Conversation from './conversation.model.js';
import { IConversation, IConversationRepository } from './conversation.interface.js';
import mongoose from 'mongoose';

export class ConversationRepository implements IConversationRepository {
  async findByParticipants(participantIds: string[]): Promise<IConversation | null> {
    const objectIds = participantIds.map((id) => new mongoose.Types.ObjectId(id));
    
    return Conversation.findOne({
      type: 'direct',
      participants: { $all: objectIds, $size: 2 },
      deletedAt: null,
    });
  }

  async listForUser(userId: string, page = 1, limit = 20): Promise<IConversation[]> {
    const skip = (page - 1) * limit;
    
    return Conversation.find({
      participants: new mongoose.Types.ObjectId(userId),
      deletedAt: null,
    })
      .sort({ 'lastMessage.timestamp': -1 })
      .skip(skip)
      .limit(limit)
      .populate('participants', 'username avatar');
  }

  async create(participantIds: string[], type: 'direct' | 'group' = 'direct', name?: string): Promise<IConversation> {
    const objectIds = participantIds.map((id) => new mongoose.Types.ObjectId(id));
    
    return Conversation.create({
      participants: objectIds,
      type,
      name,
    });
  }

  async updateLastMessage(conversationId: string, content: string, senderId: string): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content,
        senderId: new mongoose.Types.ObjectId(senderId),
        timestamp: new Date(),
      },
    });
  }

  async softDelete(conversationId: string): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, { deletedAt: new Date() });
  }

  async findById(conversationId: string): Promise<IConversation | null> {
    return Conversation.findOne({ _id: conversationId, deletedAt: null });
  }
}

export default new ConversationRepository();
EOF

echo "Conversation module files created successfully!"
