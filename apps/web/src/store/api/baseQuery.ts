import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Token provider that can be set by the app
let tokenProvider: (() => Promise<string | null>) | null = null;

/**
 * Set the token provider function (should be called from a client component with useAuth)
 */
export function setTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider;
}

/**
 * Custom base query that injects Clerk JWT token into every request.
 * Uses a token provider function set by the app's auth context.
 * Normalizes errors for consistent handling.
 */
export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers) => {
      try {
        if (tokenProvider) {
          const token = await tokenProvider();
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        }
      } catch (error) {
        console.warn('[BaseQuery] Failed to get auth token:', error);
      }
      
      return headers;
    },
  });

  const result = await rawBaseQuery(args, api, extraOptions);

  // Normalize error shape
  if (result.error) {
    const error = result.error as FetchBaseQueryError;
    
    // Handle network errors
    if ('status' in error && error.status === 'FETCH_ERROR') {
      return {
        error: {
          status: 'FETCH_ERROR',
          error: 'Network request failed. Please check your connection.',
        } as FetchBaseQueryError,
      };
    }

    // Handle timeout errors
    if ('status' in error && error.status === 'TIMEOUT_ERROR') {
      return {
        error: {
          status: 'TIMEOUT_ERROR',
          error: 'Request timed out. Please try again.',
        } as FetchBaseQueryError,
      };
    }
  }

  return result;
};
