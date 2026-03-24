/**
 * User Validation Schemas
 * 
 * Zod schemas for user-related API requests
 * Provides runtime type safety and input validation
 */

import { z } from 'zod';
import { objectIdSchema, userIdParamSchema } from '../../middlewares/validation.middleware.js';

/**
 * User ID Param
 */
export const userIdSchema = userIdParamSchema;

/**
 * Block/Unblock User Request Body
 */
export const blockUserBodySchema = z.object({
  targetUserId: objectIdSchema,
});

/**
 * Upsert User Request Body (Clerk webhook)
 */
export const upsertUserBodySchema = z.object({
  clerkId: z.string().min(1, 'Clerk ID is required'),
  email: z.string().email('Invalid email format'),
  username: z.string().min(1, 'Username is required').max(50, 'Username must be less than 50 characters'),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

/**
 * Combined validation schemas for convenience
 */
export const UserValidation = {
  getUser: {
    params: userIdParamSchema,
  },
  blockUser: {
    body: blockUserBodySchema,
  },
  unblockUser: {
    body: blockUserBodySchema,
  },
  upsertUser: {
    body: upsertUserBodySchema,
  },
};
