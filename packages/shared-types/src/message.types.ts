import type { DeliveryState } from './common.types';
import type { UserDTO } from './user.types';

export type MessageType = 'text' | 'image' | 'file' | 'video' | 'audio';

export interface MessageAttachment {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  thumbnailUrl?: string;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: Partial<UserDTO>;
  content: string;
  type: MessageType;
  deliveryState: DeliveryState;
  readBy: string[];
  attachment?: MessageAttachment;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageDTO {
  conversationId: string;
  content: string;
  attachment?: MessageAttachment;
}

export interface MessageListDTO {
  messages: MessageDTO[];
  page: number;
  limit: number;
}

export interface UnreadCountDTO {
  count: number;
}

export interface MarkAsReadDTO {
  messageId: string;
}
