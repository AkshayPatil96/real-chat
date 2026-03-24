import { api } from './api';
import type {
  Conversation,
  ListConversationsResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  GetConversationResponse,
} from '@repo/api-core';

interface ListConversationsArgs {
  page?: number;
  limit?: number;
}

export const conversationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listConversations: builder.query<Conversation[], ListConversationsArgs>({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/conversations',
        params: { page, limit },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Conversation' as const, id })),
              { type: 'Conversation', id: 'LIST' },
            ]
          : [{ type: 'Conversation', id: 'LIST' }],
      transformResponse: (response: ListConversationsResponse) => response.conversations,
    }),

    getConversation: builder.query<Conversation, string>({
      query: (conversationId) => `/conversations/${conversationId}`,
      providesTags: (_result, _error, id) => [{ type: 'Conversation', id }],
      transformResponse: (response: GetConversationResponse) => response.conversation,
    }),

    createConversation: builder.mutation<Conversation, CreateConversationRequest>({
      query: (body) => ({
        url: '/conversations',
        method: 'POST',
        body,
      }),
      transformResponse: (response: CreateConversationResponse) => response.conversation,
      invalidatesTags: [{ type: 'Conversation', id: 'LIST' }],
    }),

    deleteConversation: builder.mutation<void, string>({
      query: (conversationId) => ({
        url: `/conversations/${conversationId}`,
        method: 'DELETE',
      }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Conversation', id },
        { type: 'Conversation', id: 'LIST' },
        { type: 'Message', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListConversationsQuery,
  useGetConversationQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
} = conversationsApi;
