import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/express';
import AppError from '../../../utils/AppError.js';
import {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
} from './clerk-webhook.handlers.js';

export class ClerkWebhookService {
  private readonly webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

    if (!this.webhookSecret) {
      throw new Error('CLERK_WEBHOOK_SECRET is not configured');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, headers: {
    'svix-id': string;
    'svix-timestamp': string;
    'svix-signature': string;
  }): WebhookEvent {
    try {
      const wh = new Webhook(this.webhookSecret);

      return wh.verify(payload, headers) as WebhookEvent;
    } catch (error) {
      console.error('Webhook verification failed:', error);
      throw new AppError('Webhook verification failed', 400);
    }
  }

  /**
   * Process webhook event
   */
  async processEvent(event: WebhookEvent): Promise<void> {
    const { type, data } = event;

    console.log(`📨 Processing webhook: ${type}`);

    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;

      case 'user.updated':
        await handleUserUpdated(data);
        break;

      case 'user.deleted':
        await handleUserDeleted(data);
        break;

      // case 'session.created':
      //   await handleUserCreated(data);
      //   break;

      default:
        console.log(`⚠️  Unhandled webhook type: ${type}`);
    }
  }
}

export default new ClerkWebhookService();