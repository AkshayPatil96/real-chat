import { Request, Response, NextFunction } from 'express';
import ClerkWebhookService from './clerk-webhook.service.js';
import AppError from '../../../utils/AppError.js';

export class ClerkWebhookController {
  /**
   * Handle Clerk webhook
   */
  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Get headers
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        throw new AppError('Missing svix headers', 400);
      }

      // Get raw body (should be a Buffer from express.raw middleware)
      const payload = req.body instanceof Buffer 
        ? req.body.toString('utf8')
        : typeof req.body === 'string' 
          ? req.body 
          : JSON.stringify(req.body);

      console.log('📥 Webhook payload type:', typeof req.body);
      console.log('📥 Webhook payload length:', payload.length);

      // Verify and process webhook
      const event = ClerkWebhookService.verifyWebhook(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });

      await ClerkWebhookService.processEvent(event);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ClerkWebhookController;