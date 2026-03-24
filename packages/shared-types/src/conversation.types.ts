import type { ConversationType } from './common.types';

export interface ConversationParticipant {
  id: string;
  username: string;
  avatar?: string;
}

export interface ConversationDTO {
  id: string;
  participants: ConversationParticipant[];
  type: ConversationType;
  name?: string;
  lastMessage?: {
    messageId: string;
    content: string;
    senderId: string;
    type: 'text' | 'image' | 'file' | 'video' | 'audio';
    timestamp: string;
  };
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationDTO {
  otherUserId: string;
}

export interface ConversationListDTO {
  conversations: ConversationDTO[];
  page: number;
  limit: number;
}
