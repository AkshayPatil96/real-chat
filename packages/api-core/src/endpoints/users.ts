import type { HttpClient } from '../http/types.js';
import type {
  GetUserResponse,
  BlockUserResponse,
  UnblockUserResponse,
  DeleteAccountResponse,
} from '../types/user.js';

export function createUserEndpoints(client: HttpClient) {
  return {
    /**
     * Get the authenticated user's profile
     */
    getCurrentUser: () => client.get<GetUserResponse>('/api/users/me'),

    /**
     * Block another user
     */
    blockUser: (targetUserId: string) =>
      client.post<BlockUserResponse>(`/api/users/block/${targetUserId}`),

    /**
     * Unblock a previously blocked user
     */
    unblockUser: (targetUserId: string) =>
      client.delete<UnblockUserResponse>(`/api/users/block/${targetUserId}`),

    /**
     * Soft delete the authenticated user's account
     */
    deleteAccount: () => client.delete<DeleteAccountResponse>('/api/users/me'),
  };
}
