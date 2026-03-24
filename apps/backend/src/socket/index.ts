import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RedisClientType } from 'redis';
import { verifyToken } from '@clerk/backend';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { createPresenceService } from './services/PresenceService.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { registerRoomHandlers } from './handlers/room.handler.js';

/**
 * Global Socket.IO instance
 * Used by REST endpoints to emit real-time events
 */
let ioInstance: SocketIOServer | null = null;

/**
 * Get Socket.IO instance
 * @returns Socket.IO server instance or null if not initialized
 */
export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Initialize Socket.IO server with authentication and handlers
 * 
 * @param httpServer - HTTP server instance
 * @param redisClient - Redis client for presence tracking
 * @returns Socket.IO server instance
 */
export async function initializeSocket(
  httpServer: Server,
  redisClient: RedisClientType
): Promise<SocketIOServer> {
  // Create Socket.IO server
  const io = new SocketIOServer(httpServer, {
    path: '/api/v1/socket.io',
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Initialize Presence Service
  const presenceService = createPresenceService(redisClient);

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token with Clerk
      const verifiedToken = await verifyToken(token, {
        secretKey: config.clerk.secretKey,
      });

      const clerkUserId = verifiedToken.sub;

      // Get or create user in MongoDB
      const { UserService } = await import('../modules/users/index.js');
      const user = await UserService.upsertUser(clerkUserId);

      // Attach MongoDB user ID to socket
      // @ts-ignore - dynamic property
      socket.userId = user._id.toString();

      // @ts-ignore - also store Clerk ID if needed
      socket.clerkUserId = clerkUserId;

      next();
    } catch (err: any) {
      logger.warn({ err }, 'Socket Authentication Failed');
      next(new Error('Authentication error'));
    }
  });

  // Connection Handler
  io.on('connection', (socket) => {
    // @ts-ignore
    const userId = socket.userId;
    logger.info(`User connected: ${userId}`);

    // Production Hardening: Join user-specific room for targeted events
    // Used for unread count updates and other user-specific notifications
    socket.join(`user:${userId}`);

    // Register all event handlers
    // 1. Room Handlers (join / leave)
    registerRoomHandlers(socket);
    // 2. Presence Handlers (redis-backed, TTL-based)
    registerPresenceHandlers(io, socket, presenceService);
    // 3. Typing Handlers (room-scoped, ephemeral)
    registerTypingHandlers(io, socket);
    // 4. Chat Handlers (uses rooms)
    registerChatHandlers(io, socket);

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
    });
  });

  // Store instance globally for REST endpoints
  ioInstance = io;

  logger.info('Socket.IO initialized successfully');
  return io;
}
