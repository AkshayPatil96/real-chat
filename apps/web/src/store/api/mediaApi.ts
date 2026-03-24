import { api } from './api';

export type MediaFilterType = 'image' | 'video' | 'file' | 'link' | 'all';

export interface MediaItem {
  messageId: string;
  type: 'text' | 'image' | 'video' | 'file' | 'audio';
  fileKey?: string;
  content?: string; // For links
  createdAt: string;
  senderId: string;
}

export interface MediaListResponse {
  items: MediaItem[];
  nextCursor: string | null;
}

export interface GetMediaArgs {
  conversationId: string;
  type?: MediaFilterType;
  cursor?: string;
  limit?: number;
}

/**
 * RTK Query API for media operations
 * 
 * Used for:
 * - Media tab (images + videos)
 * - Docs tab (files)
 * - Links tab (text messages with URLs)
 * - Image viewer carousel
 * 
 * Independent pagination from chat messages
 */
export const mediaApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Get media items in a conversation
     * Uses cursor-based pagination
     */
    getConversationMedia: builder.query<MediaListResponse, GetMediaArgs>({
      query: ({ conversationId, type = 'all', cursor, limit = 20 }) => ({
        url: `/conversations/${conversationId}/media`,
        params: {
          type,
          ...(cursor && { cursor }),
          limit,
        },
      }),
      transformResponse: (response: { data: MediaListResponse }) => response.data,
      // Cache media items per conversation and type
      providesTags: (_result, _error, args) => [
        { type: 'Media' as const, id: `${args.conversationId}-${args.type}` },
      ],
    }),
  }),
});

export const {
  useGetConversationMediaQuery,
  useLazyGetConversationMediaQuery,
} = mediaApi;
