import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  clerkId: string;
  username: string;
  email: string;
  avatar?: string;
  blockedUsers: Types.ObjectId[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRepository {
  findByClerkId(clerkId: string): Promise<IUser | null>;
  upsertFromClerk(clerkId: string, data: Partial<IUser>): Promise<IUser>;
  blockUser(userId: string, blockedUserId: string): Promise<void>;
  unblockUser(userId: string, unblockedUserId: string): Promise<void>;
  isBlocked(userId: string, targetUserId: string): Promise<boolean>;
  softDelete(userId: string): Promise<void>;
  hardDelete(userId: string): Promise<void>;
  deleteAccountByClerkId(clerkId: string): Promise<void>;
  findById(userId: string): Promise<IUser | null>;
}

export interface IUserService {
  getUserByClerkId(clerkId: string): Promise<IUser>;
  getUserById(userId: string): Promise<IUser>;
  blockUser(userId: string, targetUserId: string): Promise<void>;
  unblockUser(userId: string, targetUserId: string): Promise<void>;
  isBlocked(userId: string, targetUserId: string): Promise<boolean>;
  deleteAccount(userId: string): Promise<void>;
}