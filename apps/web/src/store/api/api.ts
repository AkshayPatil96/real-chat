import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

/**
 * Main RTK Query API instance for RealChat.
 * 
 * Tag types enable automatic cache invalidation:
 * - User: Current user profile
 * - Conversation: List and individual conversations
 * - Message: Messages within conversations
 * - Media: Media items in conversations (images, videos, files, links)
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Conversation', 'Message', 'ChatRequest', 'Media'],
  endpoints: () => ({}),
  // Reasonable cache lifetimes to balance freshness and performance
  keepUnusedDataFor: 60, // 60 seconds
  refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
  refetchOnReconnect: true,
  refetchOnFocus: false,
});
