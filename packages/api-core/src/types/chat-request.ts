export type ChatRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';

export interface ChatRequest {
  id: string;
  senderId: string;
  receiverId: string;
  senderUsername?: string;
  senderAvatar?: string;
  senderEmail?: string;
  receiverUsername?: string;
  receiverAvatar?: string;
  receiverEmail?: string;
  status: ChatRequestStatus;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendChatRequestRequest {
  receiverEmail: string;
}

export interface SendChatRequestResponse {
  request: ChatRequest;
}

export interface ListChatRequestsResponse {
  requests: ChatRequest[];
  page: number;
  limit: number;
}

export interface AcceptChatRequestResponse {
  request: ChatRequest;
  conversationId: string;
}

export interface DeclineChatRequestResponse {
  request: ChatRequest;
}

export interface BlockSenderResponse {
  request: ChatRequest;
}
