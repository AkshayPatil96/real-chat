import { api } from './api';

/**
 * Presence snapshot API
 * Returns online status for multiple userIds
 *
 * Redis-backed, TTL-based
 */
export const presenceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPresenceStatus: builder.query<Record<string, boolean>, string[]>({
      query: (userIds) => ({
        url: '/presence/status',
        method: 'POST',
        body: { userIds },
      }),

      // Endpoint-level option (this one IS valid here)
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useGetPresenceStatusQuery } = presenceApi;
