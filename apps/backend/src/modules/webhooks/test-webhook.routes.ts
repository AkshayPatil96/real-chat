import { Router } from 'express';
import ClerkWebhookService from './clerk/clerk-webhook.service.js';

const router: Router = Router();

// Only enable in development
if (process.env.NODE_ENV === 'development') {

  /**
   * Test endpoint to simulate Clerk webhooks locally
   * Usage: POST http://localhost:8001/api/webhooks/test/:eventType
   */
  router.post('/test/:eventType', async (req, res) => {
    try {
      const { eventType } = req.params;

      // Mock webhook events
      const mockEvents: Record<string, any> = {
        'user.created': {
          type: 'user.created',
          data: {
            id: 'user_test_' + 123,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            email_addresses: [
              { email_address: `test${Date.now()}@example.com` }
            ],
            image_url: 'https://img.clerk.com/test.jpg',
          }
        },
        'user.updated': {
          type: 'user.updated',
          data: {
            id: req.body.userId || 'user_test_123',
            first_name: 'Updated',
            last_name: 'UserNew',
            username: 'updateduser',
            email_addresses: [
              { email_address: 'updated@example.com' }
            ],
            image_url: 'https://img.clerk.com/updated.jpg',
          }
        },
        'user.deleted': {
          type: 'user.deleted',
          data: {
            id: req.body.userId || 'user_test_123',
          }
        }
      };

      const mockEvent = mockEvents[eventType];

      if (!mockEvent) {
        return res.status(400).json({
          error: 'Invalid event type',
          validTypes: Object.keys(mockEvents)
        });
      }

      console.log(`🧪 Testing mock webhook: ${eventType}`);

      // Process the mock event (skip signature verification)
      await ClerkWebhookService.processEvent(mockEvent);

      res.json({
        success: true,
        message: `Mock ${eventType} event processed successfully`,
        eventType,
        data: mockEvent.data
      });
    } catch (error: any) {
      console.error('Mock webhook error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get list of available test events
  router.get('/test', (req, res) => {
    res.json({
      message: 'Available test webhook events',
      events: [
        {
          type: 'user.created',
          endpoint: 'POST /api/webhooks/test/user.created',
          description: 'Creates a new test user'
        },
        {
          type: 'user.updated',
          endpoint: 'POST /api/webhooks/test/user.updated',
          description: 'Updates an existing user',
          body: '{ "userId": "user_xxx" }'
        },
        {
          type: 'user.deleted',
          endpoint: 'POST /api/webhooks/test/user.deleted',
          description: 'Deletes a user',
          body: '{ "userId": "user_xxx" }'
        }
      ]
    });
  });
}

export default router;