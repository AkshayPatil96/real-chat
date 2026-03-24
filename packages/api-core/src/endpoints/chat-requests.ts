import type { HttpClient } from '../http/types.js';
import type {
  SendChatRequestRequest,
  SendChatRequestResponse,
  ListChatRequestsResponse,
  AcceptChatRequestResponse,
  DeclineChatRequestResponse,
  BlockSenderResponse,
} from '../types/chat-request.js';

export interface ListChatRequestsOptions {
  page?: number;
  limit?: number;
}

export function createChatRequestEndpoints(client: HttpClient) {
  return {
    /**
     * Send a chat request to another user by email
     */
    sendRequest: (data: SendChatRequestRequest) =>
      client.post<SendChatRequestResponse>('/api/chat-requests', data),

    /**
     * List incoming chat requests (requests received by the authenticated user)
     */
    listIncoming: (options: ListChatRequestsOptions = {}) => {
      const { page = 1, limit = 20 } = options;
      return client.get<ListChatRequestsResponse>(`/api/chat-requests/incoming?page=${page}&limit=${limit}`);
    },

    /**
     * List outgoing chat requests (requests sent by the authenticated user)
     */
    listOutgoing: (options: ListChatRequestsOptions = {}) => {
      const { page = 1, limit = 20 } = options;
      return client.get<ListChatRequestsResponse>(`/api/chat-requests/outgoing?page=${page}&limit=${limit}`);
    },

    /**
     * Accept a chat request and create a conversation
     */
    acceptRequest: (requestId: string) =>
      client.post<AcceptChatRequestResponse>(`/api/chat-requests/${requestId}/accept`),

    /**
     * Decline a chat request
     */
    declineRequest: (requestId: string) =>
      client.post<DeclineChatRequestResponse>(`/api/chat-requests/${requestId}/decline`),

    /**
     * Block the sender of a chat request
     */
    blockSender: (requestId: string) =>
      client.post<BlockSenderResponse>(`/api/chat-requests/${requestId}/block`),
  };
}
