import { Router } from 'express';
import ConversationController from './conversation.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { conversationLimiter } from '../../middlewares/rate-limit.middleware.js';
import { validateMultiple, validate } from '../../middlewares/validation.middleware.js';
import { ConversationValidation } from './conversation.validation.js';

const router: Router = Router();
router.use(protect);

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     summary: List all conversations for the authenticated user (legacy offset pagination)
 *     deprecated: true
 *     description: Use /api/v1/conversations/cursor for better performance
 *     tags: [Conversations]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
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
 *           default: 20
 *         description: Number of conversations per page
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', 
  validateMultiple(ConversationValidation.listConversationsOffset), 
  ConversationController.listConversations
);

/**
 * @swagger
 * /api/v1/conversations/cursor:
 *   get:
 *     summary: List conversations with cursor-based pagination (RECOMMENDED)
 *     description: |
 *       Efficient cursor-based pagination for conversations. Provides O(1) performance,
 *       prevents duplicates during realtime updates, and scales to large conversation lists.
 *       
 *       Direction: newest → oldest (by conversation creation time)
 *       
 *       Usage:
 *       1. First request: GET /conversations/cursor?limit=20
 *       2. Subsequent requests: GET /conversations/cursor?cursor={nextCursor}&limit=20
 *     tags: [Conversations]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque cursor for pagination (base64 encoded)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of conversations per page (max 100)
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     hasNextPage:
 *                       type: boolean
 *                       description: Whether more conversations exist
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
 */
router.get('/cursor', 
  validateMultiple(ConversationValidation.listConversationsCursor), 
  ConversationController.listConversationsCursor
);

/**
 * @swagger
 * /api/v1/conversations:
 *   post:
 *     summary: Create a new conversation or get existing one
 *     tags: [Conversations]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otherUserId
 *             properties:
 *               otherUserId:
 *                 type: string
 *                 description: MongoDB ObjectId of the other user
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Conversation created or retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 */
router.post('/',
  conversationLimiter, // Production Hardening: Rate limit conversation creation (20/hour)
  validate(ConversationValidation.createConversation.body, 'body'),
  ConversationController.createConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   get:
 *     summary: Get a specific conversation by ID
 *     tags: [Conversations]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the conversation
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get('/:id', 
  validateMultiple({ params: ConversationValidation.getConversation.params }), 
  ConversationController.getConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Conversations]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the conversation
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Conversation deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.delete('/:id', 
  validateMultiple(ConversationValidation.deleteConversation), 
  ConversationController.deleteConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}/media:
 *   get:
 *     summary: Get media items in a conversation (images, videos, files, links)
 *     description: |
 *       Fetch media items with cursor-based pagination.
 *       Used for media viewer, docs tab, and links tab.
 *       Independent pagination from chat messages.
 *       
 *       Returns minimal data: messageId, type, fileKey, content (for links), createdAt, senderId
 *       Client constructs CloudFront URLs from fileKey.
 *     tags: [Conversations]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, file, link, all]
 *           default: all
 *         description: Type of media to filter
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Pagination cursor (base64 encoded)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Media items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           messageId:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [text, image, video, file, audio]
 *                           fileKey:
 *                             type: string
 *                           content:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           senderId:
 *                             type: string
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Conversation not found
 */
router.get('/:id/media', 
  conversationLimiter,
  ConversationController.getConversationMedia
);

export default router;
