export type DeliveryState = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'file' | 'video' | 'audio';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  deliveryState: DeliveryState;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListMessagesResponse {
  messages: Message[];
  page?: number;
  limit?: number;
  pagination?: {
    limit: number;
    hasNextPage: boolean;
    nextCursor?: string;
  };
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  message: Message;
}

export interface GetUnreadCountResponse {
  count: number;
}

export interface MarkAsReadResponse {
  message: string;
}

export interface DeleteMessageResponse {
  message: string;
}

export interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  snippet: string;
  createdAt: string;
  senderId: string;
}

export interface SearchMessagesResponse {
  results: MessageSearchResult[];
}

export interface MessagesAroundResponse {
  centerMessageId: string;
  messages: Message[];
}
