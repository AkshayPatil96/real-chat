import { ConversationDTO as SharedConversationDTO, CreateConversationDTO as SharedCreateConversationDTO } from '@repo/shared-types';
import { IConversation } from './conversation.interface.js';

export type ConversationDTO = SharedConversationDTO;
export type CreateConversationDTO = SharedCreateConversationDTO;

export class ConversationMapper {
  static toDTO(conversation: IConversation, unreadCount?: number): ConversationDTO {
    // Add defensive logging for debugging
    if (!conversation) {
      console.error('❌ Conversation is null/undefined');
      throw new Error('Cannot map null conversation to DTO');
    }

    return {
      id: conversation._id?.toString() || '',
      participants: (conversation.participants || [])
        .filter((p: any) => p && (p._id || typeof p === 'string')) // Filter out null/undefined participants
        .map((p: any) => ({
          id: p._id?.toString() || p.toString(), // Handle both populated and unpopulated
          username: p.username || 'Unknown',
          avatar: p.avatar,
        })),
      type: conversation.type || 'direct',
      name: conversation.name,
      lastMessage: conversation.lastMessage ? {
        messageId: conversation.lastMessage.messageId?.toString() || '',
        content: conversation.lastMessage.content || '',
        senderId: typeof conversation.lastMessage.senderId === 'string'
          ? conversation.lastMessage.senderId
          : conversation.lastMessage.senderId?.toString() || '',
        type: conversation.lastMessage.type || 'text',
        timestamp: conversation.lastMessage.timestamp?.toISOString() || new Date().toISOString(),
      } : undefined,
      unreadCount,
      createdAt: conversation.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: conversation.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  static toDTOArray(conversations: IConversation[]): ConversationDTO[] {
    return conversations.map(conv => this.toDTO(conv));
  }
}
