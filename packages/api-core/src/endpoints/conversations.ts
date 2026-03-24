import type { HttpClient } from '../http/types.js';
import type {
  ListConversationsResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  GetConversationResponse,
  DeleteConversationResponse,
} from '../types/conversation.js';

export interface ListConversationsOptions {
  page?: number;
  limit?: number;
}

export function createConversationEndpoints(client: HttpClient) {
  return {
    /**
     * List all conversations for the authenticated user
     */
    listConversations: (options: ListConversationsOptions = {}) => {
      const { page = 1, limit = 20 } = options;
      return client.get<ListConversationsResponse>(`/api/conversations?page=${page}&limit=${limit}`);
    },

    /**
     * Create a new direct conversation or retrieve existing one
     */
    createConversation: (data: CreateConversationRequest) =>
      client.post<CreateConversationResponse>('/api/conversations', data),

    /**
     * Get a specific conversation by ID
     */
    getConversation: (conversationId: string) =>
      client.get<GetConversationResponse>(`/api/conversations/${conversationId}`),

    /**
     * Delete a conversation (soft delete - removes from your view only)
     */
    deleteConversation: (conversationId: string) =>
      client.delete<DeleteConversationResponse>(`/api/conversations/${conversationId}`),
  };
}
