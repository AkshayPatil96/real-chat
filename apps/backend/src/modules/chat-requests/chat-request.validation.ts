/**
 * Chat Request Validation Schemas
 * 
 * Zod schemas for chat request-related API requests
 * Provides runtime type safety and input validation
 */

import { z } from 'zod';
import { objectIdSchema } from '../../middlewares/validation.middleware.js';

/**
 * Send Chat Request Body (by email)
 */
export const sendChatRequestByEmailBodySchema = z.object({
  receiverEmail: z.string().email('Valid email is required'),
  message: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message must be less than 500 characters')
    .optional(),
});

/**
 * Send Chat Request Body (by user ID)
 */
export const sendChatRequestBodySchema = z.object({
  receiverId: objectIdSchema,
  message: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message must be less than 500 characters')
    .optional(),
});

/**
 * Chat Request ID Param
 */
export const chatRequestIdParamSchema = z.object({
  requestId: objectIdSchema,
});

/**
 * Combined validation schemas for convenience
 */
export const ChatRequestValidation = {
  sendRequestByEmail: {
    body: sendChatRequestByEmailBodySchema,
  },
  sendRequest: {
    body: sendChatRequestBodySchema,
  },
  acceptRequest: {
    params: chatRequestIdParamSchema,
  },
  declineRequest: {
    params: chatRequestIdParamSchema,
  },
};

// Legacy exports for backward compatibility
export const validateSendRequest = sendChatRequestByEmailBodySchema;
export const validateRequestId = chatRequestIdParamSchema;
