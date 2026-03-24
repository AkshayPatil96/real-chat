export type ConversationType = 'direct' | 'group';

export interface LastMessage {
  messageId: string;
  content: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio';
  timestamp: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  type: ConversationType;
  name?: string;
  lastMessage?: LastMessage;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListConversationsResponse {
  conversations: Conversation[];
  page: number;
  limit: number;
}

export interface CreateConversationRequest {
  otherUserId: string;
}

export interface CreateConversationResponse {
  conversation: Conversation;
}

export interface GetConversationResponse {
  conversation: Conversation;
}

export interface DeleteConversationResponse {
  message: string;
}
