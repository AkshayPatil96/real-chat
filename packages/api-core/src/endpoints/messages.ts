import type { HttpClient } from '../http/types.js';
import type {
  ListMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetUnreadCountResponse,
  MarkAsReadResponse,
  DeleteMessageResponse,
  SearchMessagesResponse,
  MessagesAroundResponse,
} from '../types/message.js';

export interface ListMessagesOptions {
  page?: number;
  limit?: number;
}

export function createMessageEndpoints(client: HttpClient) {
  return {
    /**
     * Retrieve paginated messages from a conversation
     */
    getMessages: (conversationId: string, options: ListMessagesOptions = {}) => {
      const { page = 1, limit = 50 } = options;
      return client.get<ListMessagesResponse>(
        `/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
      );
    },

    /**
     * Send a new message to a conversation
     */
    sendMessage: (conversationId: string, data: SendMessageRequest) =>
      client.post<SendMessageResponse>(`/api/conversations/${conversationId}/messages`, data),

    /**
     * Get the count of unread messages in a conversation
     */
    getUnreadCount: (conversationId: string) =>
      client.get<GetUnreadCountResponse>(`/api/conversations/${conversationId}/unread-count`),

    /**
     * Mark a message as read by the authenticated user
     */
    markAsRead: (messageId: string) =>
      client.patch<MarkAsReadResponse>(`/api/messages/${messageId}/read`),

    /**
     * Delete a message (soft delete for sender only)
     */
    deleteMessage: (messageId: string) =>
      client.delete<DeleteMessageResponse>(`/api/messages/${messageId}`),

    /**
     * Search messages within a conversation
     */
    searchMessages: (conversationId: string, query: string, limit = 20) =>
      client.get<SearchMessagesResponse>(
        `/api/conversations/${conversationId}/messages/search?query=${encodeURIComponent(query)}&limit=${limit}`
      ),

    /**
     * Get messages around a specific message (jump-to-message)
     */
    getMessagesAround: (messageId: string, limit = 50) =>
      client.get<MessagesAroundResponse>(`/api/messages/around/${messageId}?limit=${limit}`),
  };
}
