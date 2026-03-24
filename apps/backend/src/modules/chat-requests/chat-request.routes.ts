import { Router } from 'express';
import ChatRequestController from './chat-request.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validateMultiple } from '../../middlewares/validation.middleware.js';
import { ChatRequestValidation } from './chat-request.validation.js';
import { chatRequestLimiter } from '../../middlewares/rate-limit.middleware.js';

const router: Router = Router();

router.use(protect);

// Production Hardening: Rate limit chat requests (5 req/hour) to prevent spam
router.use(chatRequestLimiter);

/**
 * @swagger
 * /api/v1/chat-requests:
 *   post:
 *     summary: Send a chat request
 *     tags: [Chat Requests]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverEmail
 *             properties:
 *               receiverEmail:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Request sent successfully
 *       403:
 *         description: User is blocked or blocking
 *       409:
 *         description: Request already exists or cooldown active
 */
router.post('/', validateMultiple(ChatRequestValidation.sendRequestByEmail), ChatRequestController.sendRequest);

/**
 * @swagger
 * /api/v1/chat-requests/incoming:
 *   get:
 *     summary: List incoming chat requests
 *     tags: [Chat Requests]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Incoming requests retrieved successfully
 */
router.get('/incoming', ChatRequestController.listIncoming);

/**
 * @swagger
 * /api/v1/chat-requests/outgoing:
 *   get:
 *     summary: List outgoing chat requests
 *     tags: [Chat Requests]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Outgoing requests retrieved successfully
 */
router.get('/outgoing', ChatRequestController.listOutgoing);

/**
 * @swagger
 * /api/v1/chat-requests/{requestId}/accept:
 *   post:
 *     summary: Accept a chat request
 *     tags: [Chat Requests]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request accepted and conversation created
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Request not found
 */
router.post('/:requestId/accept', validateMultiple(ChatRequestValidation.acceptRequest), ChatRequestController.acceptRequest);

/**
 * @swagger
 * /api/v1/chat-requests/{requestId}/decline:
 *   post:
 *     summary: Decline a chat request
 *     tags: [Chat Requests]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request declined successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Request not found
 */
router.post('/:requestId/decline', validateMultiple(ChatRequestValidation.declineRequest), ChatRequestController.declineRequest);

/**
 * @swagger
 * /api/v1/chat-requests/{requestId}/block:
 *   post:
 *     summary: Block sender and update request
 *     tags: [Chat Requests]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sender blocked successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Request not found
 */
router.post('/:requestId/block', validateMultiple(ChatRequestValidation.declineRequest), ChatRequestController.blockSender);

export default router;
