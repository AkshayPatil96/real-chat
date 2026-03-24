export interface UserDTO {
  id: string;
  clerkId: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  clerkId: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface UpdateUserDTO {
  username?: string;
  avatar?: string;
}

export interface BlockUserDTO {
  targetUserId: string;
}
