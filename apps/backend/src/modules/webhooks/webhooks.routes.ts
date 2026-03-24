import { Router } from 'express';
import ClerkWebhookController from './clerk/clerk-webhook.controller.js';

const router: Router = Router();

/**
 * @swagger
 * /api/webhooks/clerk:
 *   post:
 *     summary: Clerk webhook endpoint
 *     tags: [Webhooks]
 *     description: Receives events from Clerk (user.created, user.updated, user.deleted)
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */
router.post('/clerk', ClerkWebhookController.handleWebhook);

export default router;