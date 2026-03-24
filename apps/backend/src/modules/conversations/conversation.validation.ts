/**
 * Conversation Validation Schemas
 * 
 * Zod schemas for conversation-related API requests
 * Provides runtime type safety and input validation
 */

import { z } from 'zod';
import { 
  objectIdSchema, 
  paginationOffsetSchema, 
  paginationCursorSchema,
  conversationIdParamSchema 
} from '../../middlewares/validation.middleware.js';

/**
 * Create Conversation Request Body
 */
export const createConversationBodySchema = z.object({
  otherUserId: objectIdSchema,
});

/**
 * Get Conversation By ID Param (uses "id" as param name)
 */
export const conversationIdSchema = z.object({
  id: objectIdSchema,
});

/**
 * List Conversations Query (offset pagination - legacy)
 */
export const listConversationsOffsetQuerySchema = paginationOffsetSchema;

/**
 * List Conversations Query (cursor pagination - recommended)
 */
export const listConversationsCursorQuerySchema = paginationCursorSchema;

/**
 * Combined validation schemas for convenience
 */
export const ConversationValidation = {
  createConversation: {
    body: createConversationBodySchema,
  },
  getConversation: {
    params: conversationIdSchema,
  },
  listConversationsOffset: {
    query: listConversationsOffsetQuerySchema,
  },
  listConversationsCursor: {
    query: listConversationsCursorQuerySchema,
  },
  deleteConversation: {
    params: conversationIdSchema,
  },
};
