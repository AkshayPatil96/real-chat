import { api } from './api';
import { conversationsApi } from './conversationsApi';
import type {
  Message,
  ListMessagesResponse,
  SendMessageResponse,
  GetUnreadCountResponse,
  MessageSearchResult,
  SearchMessagesResponse,
  MessagesAroundResponse,
} from '@repo/api-core';

interface ListMessagesArgs {
  conversationId: string;
  cursor?: string;
  limit?: number;
}

interface SendMessageArgs {
  conversationId: string;
  content: string;
  fileKey?: string;
}

interface MarkAsReadArgs {
  conversationId: string;
  messageId: string;
}

interface DeleteMessageArgs {
  conversationId: string;
  messageId: string;
}

interface SearchMessagesArgs {
  conversationId: string;
  query: string;
  limit?: number;
}

interface GetMessagesAroundArgs {
  messageId: string;
  limit?: number;
}

export const messagesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMessages: builder.query<ListMessagesResponse, ListMessagesArgs>({
      query: ({ conversationId, cursor, limit = 50 }) => ({
        url: `/conversations/${conversationId}/messages/cursor`,
        params: cursor ? { cursor, limit } : { limit },
      }),
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Message', id: conversationId },
        { type: 'Message', id: 'LIST' },
      ],
      // Serialize query args to cache by conversationId only (ignore cursor for caching)
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        return `${endpointName}(${queryArgs.conversationId})`;
      },
      // Merge paginated results when loading more
      merge: (currentCache, newItems, { arg }) => {
        // If cursor is provided, we're loading older messages (prepend to start)
        if (arg.cursor && currentCache?.messages) {
          return {
            ...newItems,
            messages: [...currentCache.messages, ...newItems.messages],
          };
        }
        // Otherwise, initial load or refresh
        return newItems;
      },
      // Force refetch when cursor changes or conversation changes
      forceRefetch: ({ currentArg, previousArg }) => {
        return currentArg?.cursor !== previousArg?.cursor ||
          currentArg?.conversationId !== previousArg?.conversationId;
      },
    }),

    sendMessage: builder.mutation<Message, SendMessageArgs>({
      query: ({ conversationId, content, fileKey }) => ({
        url: `/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { content, fileKey },
      }),
      transformResponse: (response: SendMessageResponse) => response.message,
      // Optimistically update cache
      async onQueryStarted({ conversationId }, { dispatch, queryFulfilled }) {
        try {
          const { data: newMessage } = await queryFulfilled;

          // Call getMessages to update cache
          dispatch(
            messagesApi.util.invalidateTags([
              { type: 'Message', id: conversationId },
              { type: 'Message', id: 'LIST' },
            ])
          );

          /**
           * Update conversation list to show new lastMessage
           * AND move conversation to top (same UX as receiving messages)
           */
          dispatch(
            conversationsApi.util.updateQueryData(
              'listConversations',
              { page: 1, limit: 50 },
              (draft) => {
                const convIndex = draft.findIndex((c) => c.id === conversationId);
                if (convIndex === -1) return;

                const conv = draft[convIndex];

                // Update last message
                conv.lastMessage = {
                  messageId: newMessage.id,
                  content: newMessage.content,
                  senderId: newMessage.senderId,
                  type: newMessage.type || 'text',
                  timestamp: newMessage.createdAt,
                };

                // Move conversation to top (if not already there)
                if (convIndex > 0) {
                  draft.splice(convIndex, 1);
                  draft.unshift(conv);
                }
              }
            )
          );

          // // invalidate unread count
          // dispatch(
          //   messagesApi.util.invalidateTags([
          //     { type: 'Message', id: `unread-${conversationId}` },
          //   ])
          // );
        } catch {
          // Error handling happens in component
        }
      },
    }),

    getUnreadCount: builder.query<number, string>({
      query: (conversationId) => `/conversations/${conversationId}/unread-count`,
      providesTags: (_result, _error, conversationId) => [
        { type: 'Message', id: `unread-${conversationId}` },
      ],
      transformResponse: (response: GetUnreadCountResponse) => response.count,
    }),

    markAsRead: builder.mutation<void, MarkAsReadArgs>({
      query: ({ messageId }) => ({
        url: `/messages/${messageId}/read`,
        method: 'PATCH',
      }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Message', id: conversationId },
        { type: 'Message', id: `unread-${conversationId}` },
        { type: 'Conversation', id: conversationId },
      ],
    }),

    deleteMessage: builder.mutation<void, DeleteMessageArgs>({
      query: ({ messageId }) => ({
        url: `/messages/${messageId}`,
        method: 'DELETE',
      }),
      transformResponse: () => undefined,
      // Optimistically remove from cache
      async onQueryStarted({ conversationId, messageId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          messagesApi.util.updateQueryData(
            'getMessages',
            { conversationId, limit: 50 },
            (draft) => {
              draft.messages = draft.messages.filter((msg: Message) => msg.id !== messageId);
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: 'Message', id: conversationId },
        { type: 'Conversation', id: conversationId },
      ],
    }),

    searchMessages: builder.query<MessageSearchResult[], SearchMessagesArgs>({
      query: ({ conversationId, query, limit = 20 }) => ({
        url: `/conversations/${conversationId}/messages/search`,
        params: { query, limit },
      }),
      transformResponse: (response: SearchMessagesResponse) => response.results,
      // Don't cache search results aggressively
      keepUnusedDataFor: 60, // 1 minute
    }),

    getMessagesAround: builder.query<MessagesAroundResponse, GetMessagesAroundArgs>({
      query: ({ messageId, limit = 50 }) => ({
        url: `/messages/around/${messageId}`,
        params: { limit },
      }),
      // Don't cache - this is used for jump-to-message
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useGetMessagesQuery,
  useSendMessageMutation,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useDeleteMessageMutation,
  useSearchMessagesQuery,
  useLazySearchMessagesQuery,
  useGetMessagesAroundQuery,
  useLazyGetMessagesAroundQuery,
} = messagesApi;
