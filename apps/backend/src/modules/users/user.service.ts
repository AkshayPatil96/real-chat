import { IUser, IUserService, IUserRepository } from './user.interface.js';
import UserRepository from './user.repository.js';
import AppError from '../../utils/AppError.js';
import { clerkClient } from '@clerk/express';

export class UserService implements IUserService {
  constructor(private userRepository: IUserRepository = UserRepository) { }

  async getUserByClerkId(clerkId: string): Promise<IUser> {
    const user = await this.userRepository.findByClerkId(clerkId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async upsertUser(clerkId: string, userData?: Partial<IUser>): Promise<IUser> {
    try {
      // User doesn't exist - need to create
      let userDataToCreate = userData;

      // If no userData provided, fetch from Clerk
      if (!userDataToCreate || !userDataToCreate.email) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);

          userDataToCreate = {
            username: clerkUser.username || clerkUser.fullName || clerkUser.firstName || 'User',
            email: clerkUser.emailAddresses[0]?.emailAddress,
            avatar: clerkUser.imageUrl,
            ...userData, // Merge with any provided data
          };
        } catch (clerkError) {
          console.error('Error fetching user from Clerk:', clerkError);
          throw new AppError('Failed to fetch user data from authentication provider', 500);
        }
      }

      // Validate required fields
      if (!userDataToCreate.email) {
        throw new AppError('Email is required to create user', 400);
      }

      // Create user in database
      const user = await this.userRepository.upsertFromClerk(clerkId, userDataToCreate);

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error in upsertUser:', error);
      throw new AppError('Failed to upsert user', 500);
    }
  }

  async getUserById(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) {
      throw new AppError('Cannot block yourself', 400);
    }

    const targetUser = await this.userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('Target user not found', 404);
    }

    try {
      await this.userRepository.blockUser(userId, targetUserId);
    } catch (error) {
      console.error('Error blocking user:', error);
      throw new AppError('Failed to block user', 500);
    }
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    try {
      await this.userRepository.unblockUser(userId, targetUserId);
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw new AppError('Failed to unblock user', 500);
    }
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    try {
      return await this.userRepository.isBlocked(userId, targetUserId);
    } catch (error) {
      console.error('Error checking block status:', error);
      return false; // Default to not blocked on error
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    try {
      await this.userRepository.softDelete(userId);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new AppError('Failed to delete account', 500);
    }
  }

  async hardDeleteAccount(userId: string): Promise<void> {
    try {
      await this.userRepository.hardDelete(userId);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new AppError('Failed to delete account', 500);
    }
  }

  async deleteAccountByClerkId(clerkId: string): Promise<void> {
    try {
      await this.userRepository.deleteAccountByClerkId(clerkId);
    } catch (error) {
      console.error('Error deleting account by Clerk ID:', error);
      throw new AppError('Failed to delete account', 500);
    }
  }
}

export default new UserService();