import { requireAuth, clerkClient, getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError.js';
import { UserService } from '../modules/users/index.js';

/**
 * Middleware to check authentication and sync user to MongoDB.
 * 
 * This middleware:
 * 1. Checks for a valid Clerk session
 * 2. Syncs user data to MongoDB (creates if doesn't exist)
 * 3. Attaches MongoDB user ID to req.userId
 */
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    
    // Check authentication
    if (!auth?.userId) {
      console.log('❌ Auth check failed - no userId');
      return next(new AppError('Not authorized - No user ID', 401));
    }

    const clerkUserId = auth.userId;

    // Sync user to MongoDB (create if doesn't exist)
    // Only fetch from Clerk if user doesn't exist in our DB
    const user = await UserService.upsertUser(clerkUserId);

    // Attach MongoDB user ID to request for use in controllers
    req.userId = user._id.toString();

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next(new AppError('Authentication failed', 401));
  }
};

// Export Clerk's strict middleware if needed directly
export { requireAuth };
