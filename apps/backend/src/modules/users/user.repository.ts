import User from './user.model.js';
import { IUser, IUserRepository } from './user.interface.js';
import mongoose from 'mongoose';
import AppError from '../../utils/AppError.js';

export class UserRepository implements IUserRepository {
  async findByClerkId(clerkId: string): Promise<IUser | null> {
    try {
      return await User.findOne({ clerkId, deletedAt: null });
    } catch (error) {
      console.error('Error finding user by Clerk ID:', error);
      throw new AppError('Database error while finding user', 500);
    }
  }

  async upsertFromClerk(clerkId: string, data: Partial<IUser>): Promise<IUser> {
    try {
      const user = await User.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            ...data,
            clerkId,
            deletedAt: null // Ensure user is not soft-deleted
          }
        },
        { upsert: true, new: true, runValidators: true }
      );

      if (!user) {
        throw new AppError('Failed to create or update user', 500);
      }

      return user;
    } catch (error: any) {
      console.error('Error upserting user:', error);

      // Handle duplicate key errors
      if (error.code === 11000) {
        throw new AppError('User with this email already exists', 409);
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        throw new AppError(`Validation error: ${error.message}`, 400);
      }

      throw new AppError('Failed to create or update user', 500);
    }
  }

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(blockedUserId)) {
        throw new AppError('Invalid user ID format', 400);
      }

      const result = await User.findByIdAndUpdate(
        userId,
        {
          $addToSet: { blockedUsers: new mongoose.Types.ObjectId(blockedUserId) },
        },
        { new: true }
      );

      if (!result) {
        throw new AppError('User not found', 404);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error blocking user:', error);
      throw new AppError('Failed to block user', 500);
    }
  }

  async unblockUser(userId: string, unblockedUserId: string): Promise<void> {
    try {
      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(unblockedUserId)) {
        throw new AppError('Invalid user ID format', 400);
      }

      await User.findByIdAndUpdate(
        userId,
        {
          $pull: { blockedUsers: new mongoose.Types.ObjectId(unblockedUserId) },
        }
      );
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw new AppError('Failed to unblock user', 500);
    }
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
        return false;
      }

      const user = await User.findById(userId).select('blockedUsers').lean();

      if (!user) {
        return false;
      }

      return user.blockedUsers?.some((id) => id.toString() === targetUserId) || false;
    } catch (error) {
      console.error('Error checking block status:', error);
      return false; // Fail-safe: assume not blocked on error
    }
  }

  async softDelete(userId: string): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', 400);
      }

      const result = await User.findByIdAndUpdate(
        userId,
        { deletedAt: new Date() },
        { new: true }
      );

      if (!result) {
        throw new AppError('User not found', 404);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error soft deleting user:', error);
      throw new AppError('Failed to delete user', 500);
    }
  }

  async hardDelete(userId: string): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID format', 400);
      }

      const result = await User.findByIdAndDelete(userId);

      if (!result) {
        throw new AppError('User not found', 404);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error hard deleting user:', error);
      throw new AppError('Failed to permanently delete user', 500);
    }
  }

  async deleteAccountByClerkId(clerkId: string): Promise<void> {
    try {
      const result = await User.findOneAndDelete({ clerkId });
      if (!result) {
        throw new AppError('User not found', 404);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Error deleting account by Clerk ID:', error);
      throw new AppError('Failed to delete account', 500);
    }
  }

  async findById(userId: string): Promise<IUser | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return null;
      }

      return await User.findOne({ _id: userId, deletedAt: null });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new AppError('Database error while finding user', 500);
    }
  }
}

export default new UserRepository();