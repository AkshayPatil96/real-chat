export interface User {
  id: string;
  clerkId: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetUserResponse {
  user: User;
}

export interface BlockUserResponse {
  message: string;
}

export interface UnblockUserResponse {
  message: string;
}

export interface DeleteAccountResponse {
  message: string;
}
