import mongoose, { Document, Types } from 'mongoose';
import { PaginatedResponse } from '../../types/pagination.types.js';

export type DeliveryState = 'sent' | 'delivered' | 'read';

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'video'
  | 'audio';

export interface MessageMedia {
  url: string;
  mimeType: string;
  size: number; // bytes
  name: string;
}

export interface IMessage {
  _id: Types.ObjectId;

  conversationId: Types.ObjectId;
  senderId: Types.ObjectId | any;

  type: MessageType;
  content?: string;

  media?: MessageMedia;

  deliveryState: DeliveryState;
  readBy: Types.ObjectId[];

  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  snippet: string;
  createdAt: Date;
  senderId: string;
}

export interface MessagesAroundResult {
  centerMessageId: string;
  messages: IMessage[];
}

export type MediaFilterType = 'image' | 'video' | 'file' | 'link' | 'all';

export interface MediaItem {
  messageId: string;
  type: MessageType;
  fileKey?: string;
  content?: string; // For links
  createdAt: Date;
  senderId: string;
}

export interface MediaListResult {
  items: MediaItem[];
  nextCursor: string | null;
}

export interface IMessageRepository {
  create(conversationId: string, senderId: string, content: string, type?: MessageType, media?: MessageMedia): Promise<IMessage>;
  findByConversation(conversationId: string, page: number, limit: number): Promise<IMessage[]>;
  findByConversationCursor(conversationId: string, cursor: string | undefined, limit: number): Promise<IMessage[]>;
  getUnreadCount(conversationId: string, userId: string): Promise<number>;
  markAsRead(messageId: string, userId: string): Promise<void>;
  updateDeliveryState(messageId: string, state: DeliveryState): Promise<void>;
  softDelete(messageId: string): Promise<void>;
  findById(messageId: string): Promise<IMessage | null>;
  searchMessages(conversationId: string, query: string, limit: number): Promise<MessageSearchResult[]>;
  findMessagesAround(messageId: string, limit: number): Promise<IMessage[]>;
  findMediaByConversation(conversationId: string, filterType: MediaFilterType, cursor: string | undefined, limit: number): Promise<MediaItem[]>;
}

export interface IMessageService {
  sendMessage(conversationId: string, senderId: string, content: string, fileKey?: string): Promise<IMessage>;
  getMessages(conversationId: string, userId: string, page: number, limit: number): Promise<IMessage[]>;
  getMessagesCursor(conversationId: string, userId: string, cursor: string | undefined, limit: number): Promise<PaginatedResponse<IMessage>>;
  getUnreadCount(conversationId: string, userId: string): Promise<number>;
  markAsRead(messageId: string, userId: string): Promise<void>;
  deleteMessage(messageId: string, userId: string): Promise<void>;
  updateDeliveryState(messageId: string, state: DeliveryState): Promise<void>;
  getMessageById(messageId: string): Promise<IMessage | null>;
  searchMessages(conversationId: string, userId: string, query: string, limit: number): Promise<MessageSearchResult[]>;
  getMediaByConversation(conversationId: string, userId: string, filterType: MediaFilterType, cursor: string | undefined, limit: number): Promise<MediaListResult>;
  getMessagesAround(messageId: string, userId: string, limit: number): Promise<MessagesAroundResult>;
}
