import { Router } from 'express';
import MessageController from './message.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { messageLimiter } from '../../middlewares/rate-limit.middleware.js';
import { validateMultiple } from '../../middlewares/validation.middleware.js';
import { MessageValidation } from './message.validation.js';

const router: Router = Router();

// All routes require authentication
router.use(protect);

// Production Hardening: Rate limit message sending (50 req/min)
router.use(messageLimiter);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get all messages in a conversation (legacy offset pagination)
 *     deprecated: true
 *     description: Use /api/v1/conversations/{conversationId}/messages/cursor for better performance
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the conversation
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:conversationId/messages', 
  validateMultiple(MessageValidation.getMessagesOffset), 
  MessageController.getMessages
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages/cursor:
 *   get:
 *     summary: Get messages with cursor-based pagination (RECOMMENDED)
 *     description: |
 *       Efficient cursor-based pagination for messages. Provides O(1) performance,
 *       prevents duplicates during realtime updates, and scales to large conversations.
 *       
 *       Direction: newest → oldest (reverse chronological)
 *       
 *       Usage:
 *       1. First request: GET /messages/cursor?limit=50
 *       2. Subsequent requests: GET /messages/cursor?cursor={nextCursor}&limit=50
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the conversation
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque cursor for pagination (base64 encoded)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of messages per page (max 100)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     hasNextPage:
 *                       type: boolean
 *                       description: Whether more messages exist
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                       description: Cursor for next page (null if no more pages)
 *                     limit:
 *                       type: integer
 *                       description: Number of items per page
 *       400:
 *         description: Invalid cursor
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:conversationId/messages/cursor', 
  validateMultiple(MessageValidation.getMessagesCursor), 
  MessageController.getMessagesCursor
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages:
 *   post:
 *     summary: Send a message to a conversation
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the conversation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *                 example: Hello, how are you?
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.post('/conversations/:conversationId/messages', 
  validateMultiple(MessageValidation.sendMessage), 
  MessageController.sendMessage
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/unread-count:
 *   get:
 *     summary: Get unread message count for a conversation
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the conversation
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:conversationId/unread-count', 
  validateMultiple(MessageValidation.getUnreadCount), 
  MessageController.getUnreadCount
);

/**
 * @swagger
 * /api/v1/messages/{messageId}/read:
 *   patch:
 *     summary: Mark a message as read
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the message
 *     responses:
 *       200:
 *         description: Message marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
router.patch('/messages/:messageId/read', 
  validateMultiple(MessageValidation.markAsRead), 
  MessageController.markAsRead
);

/**
 * @swagger
 * /api/v1/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the message
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Message deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message not found
 */
router.delete('/messages/:messageId', 
  validateMultiple(MessageValidation.deleteMessage), 
  MessageController.deleteMessage
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages/search:
 *   get:
 *     summary: Search messages within a conversation
 *     description: |
 *       Case-insensitive search for messages within a specific conversation.
 *       Returns lightweight results suitable for search UI with snippets.
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the conversation
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       messageId:
 *                         type: string
 *                       conversationId:
 *                         type: string
 *                       snippet:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       senderId:
 *                         type: string
 *       400:
 *         description: Invalid query parameter
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get('/conversations/:conversationId/messages/search', 
  MessageController.searchMessages
);

/**
 * @swagger
 * /api/v1/messages/around/{messageId}:
 *   get:
 *     summary: Get messages around a specific message (jump-to-message)
 *     description: |
 *       Fetches messages before and after a target message.
 *       Used for jump-to-message functionality in chat UI.
 *       Returns messages centered around the target message.
 *     tags: [Messages]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the target message
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Total number of messages to fetch (split between before/after)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 centerMessageId:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Message or conversation not found
 */
router.get('/messages/around/:messageId', 
  MessageController.getMessagesAround
);

export default router;
