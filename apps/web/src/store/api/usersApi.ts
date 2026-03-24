import { api } from './api';
import type {
  User,
  GetUserResponse,
} from '@repo/api-core';

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<User, void>({
      query: () => '/users/me',
      providesTags: ['User'],
      transformResponse: (response: GetUserResponse) => response.user,
    }),

    blockUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/users/${userId}/block`,
        method: 'POST',
      }),
      transformResponse: () => undefined,
      invalidatesTags: ['User', 'Conversation'],
    }),

    unblockUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/users/${userId}/unblock`,
        method: 'POST',
      }),
      transformResponse: () => undefined,
      invalidatesTags: ['User', 'Conversation'],
    }),

    deleteAccount: builder.mutation<void, void>({
      query: () => ({
        url: '/users/me',
        method: 'DELETE',
      }),
      transformResponse: () => undefined,
      invalidatesTags: ['User', 'Conversation', 'Message'],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useDeleteAccountMutation,
} = usersApi;
