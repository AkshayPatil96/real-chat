import swaggerJsdoc from 'swagger-jsdoc';
import config from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Real-Chat API',
      version: '1.0.0',
      description: 'Production-grade real-time chat system with REST APIs and Socket.IO',
      contact: {
        name: 'API Support',
        email: 'support@realchat.com',
      },
    },
    servers: [
      {
        url: config.env === 'production' ? 'https://api.realchat.com/api/v1' : `http://localhost:${config.port}/api/v1`,
        description: config.env === 'production' ? 'Production server (v1)' : 'Development server (v1)',
      },
    ],
    components: {
      securitySchemes: {
        ClerkAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Clerk JWT token obtained from frontend authentication',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            clerkId: { type: 'string', example: 'user_2abc123def' },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            participants: { type: 'array', items: { type: 'string' } },
            type: { type: 'string', enum: ['direct', 'group'], example: 'direct' },
            name: { type: 'string', example: 'Team Chat' },
            lastMessage: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                senderId: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            conversationId: { type: 'string' },
            senderId: { type: 'string' },
            content: { type: 'string', example: 'Hello, how are you?' },
            deliveryState: { type: 'string', enum: ['sent', 'delivered', 'read'], example: 'sent' },
            readBy: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Error message' },
            statusCode: { type: 'integer', example: 400 },
          },
        },
      },
    },
    security: [{ ClerkAuth: [] }],
  },
  apis: ['./src/modules/*//*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
