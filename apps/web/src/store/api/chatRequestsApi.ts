import { api } from './api';
import type {
  ChatRequest,
  SendChatRequestRequest,
  SendChatRequestResponse,
  ListChatRequestsResponse,
  AcceptChatRequestResponse,
  DeclineChatRequestResponse,
  BlockSenderResponse,
} from '@repo/api-core';

interface ListChatRequestsArgs {
  page?: number;
  limit?: number;
}

export const chatRequestsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    sendChatRequest: builder.mutation<ChatRequest, SendChatRequestRequest>({
      query: (body) => ({
        url: '/chat-requests',
        method: 'POST',
        body,
      }),
      transformResponse: (response: SendChatRequestResponse) => response.request,
      invalidatesTags: [{ type: 'ChatRequest', id: 'OUTGOING' }],
    }),

    listIncomingRequests: builder.query<ChatRequest[], ListChatRequestsArgs>({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/chat-requests/incoming',
        params: { page, limit },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatRequest' as const, id })),
              { type: 'ChatRequest', id: 'INCOMING' },
            ]
          : [{ type: 'ChatRequest', id: 'INCOMING' }],
      transformResponse: (response: ListChatRequestsResponse) => response.requests,
    }),

    listOutgoingRequests: builder.query<ChatRequest[], ListChatRequestsArgs>({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/chat-requests/outgoing',
        params: { page, limit },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ChatRequest' as const, id })),
              { type: 'ChatRequest', id: 'OUTGOING' },
            ]
          : [{ type: 'ChatRequest', id: 'OUTGOING' }],
      transformResponse: (response: ListChatRequestsResponse) => response.requests,
    }),

    acceptChatRequest: builder.mutation<AcceptChatRequestResponse, string>({
      query: (requestId) => ({
        url: `/chat-requests/${requestId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ChatRequest', id },
        { type: 'ChatRequest', id: 'INCOMING' },
        { type: 'Conversation', id: 'LIST' },
      ],
    }),

    declineChatRequest: builder.mutation<ChatRequest, string>({
      query: (requestId) => ({
        url: `/chat-requests/${requestId}/decline`,
        method: 'POST',
      }),
      transformResponse: (response: DeclineChatRequestResponse) => response.request,
      invalidatesTags: (_result, _error, id) => [
        { type: 'ChatRequest', id },
        { type: 'ChatRequest', id: 'INCOMING' },
      ],
    }),

    blockSender: builder.mutation<ChatRequest, string>({
      query: (requestId) => ({
        url: `/chat-requests/${requestId}/block`,
        method: 'POST',
      }),
      transformResponse: (response: BlockSenderResponse) => response.request,
      invalidatesTags: (_result, _error, id) => [
        { type: 'ChatRequest', id },
        { type: 'ChatRequest', id: 'INCOMING' },
      ],
    }),
  }),
});

export const {
  useSendChatRequestMutation,
  useListIncomingRequestsQuery,
  useListOutgoingRequestsQuery,
  useAcceptChatRequestMutation,
  useDeclineChatRequestMutation,
  useBlockSenderMutation,
} = chatRequestsApi;
