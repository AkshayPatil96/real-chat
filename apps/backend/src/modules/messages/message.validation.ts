/**
 * Message Validation Schemas
 * 
 * Zod schemas for message-related API requests
 * Provides runtime type safety and input validation
 */

import { z } from 'zod';
import { 
  objectIdSchema, 
  paginationOffsetSchema, 
  paginationCursorSchema,
  conversationIdParamSchema,
  messageIdParamSchema 
} from '../../middlewares/validation.middleware.js';

/**
 * Send Message Request Body
 * - For text messages: content is required
 * - For media messages: fileKey is required, content is optional
 */
export const sendMessageBodySchema = z.object({
  content: z.string()
    .trim()
    .max(5000, 'Message content must be less than 5000 characters')
    .optional()
    .default(''),
  fileKey: z.string().min(1, 'File key is required').optional(),
}).refine(
  (data) => {
    // At least content or fileKey must be provided
    return (data.content && data.content.length > 0) || data.fileKey;
  },
  {
    message: 'Either message content or fileKey must be provided',
  }
);

/**
 * Get Messages Query (offset pagination - legacy)
 */
export const getMessagesOffsetQuerySchema = paginationOffsetSchema;

/**
 * Get Messages Query (cursor pagination - recommended)
 */
export const getMessagesCursorQuerySchema = paginationCursorSchema;

/**
 * Conversation ID Param
 */
export const conversationIdSchema = conversationIdParamSchema;

/**
 * Message ID Param
 */
export const messageIdSchema = messageIdParamSchema;

/**
 * Combined validation schemas for convenience
 */
export const MessageValidation = {
  sendMessage: {
    params: conversationIdParamSchema,
    body: sendMessageBodySchema,
  },
  getMessagesOffset: {
    params: conversationIdParamSchema,
    query: getMessagesOffsetQuerySchema,
  },
  getMessagesCursor: {
    params: conversationIdParamSchema,
    query: getMessagesCursorQuerySchema,
  },
  markAsRead: {
    params: messageIdParamSchema,
  },
  deleteMessage: {
    params: messageIdParamSchema,
  },
  getUnreadCount: {
    params: conversationIdParamSchema,
  },
};
