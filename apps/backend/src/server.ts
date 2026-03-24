import dotenv from 'dotenv';
dotenv.config();

import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RedisClientType } from 'redis';
import app from './app.js';
import config from './config/env.js';
import logger from './utils/logger.js';
import { connectMongoDB, closeMongoDB } from './config/database.js';
import { connectRedis, closeRedis } from './config/redis.js';
import { initializeSocket } from './socket/index.js';

let server: Server;
let redisClient: RedisClientType;
let io: SocketIOServer;

/**
 * Start Server
 */
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectMongoDB();
    
    // Connect to Redis
    redisClient = await connectRedis();
  } catch (error: any) {
    logger.error(error, 'Failed to connect to databases');
    process.exit(1);
  }

  server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.env} mode`);
    if (config.env === 'development') {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📡 Webhook endpoint: http://localhost:${config.port}/api/webhooks/clerk`);
      console.log(`🧪 Test webhooks: http://localhost:${config.port}/api/webhooks/test`);
    }
  });

  // Initialize Socket.IO with authentication and handlers
  io = await initializeSocket(server, redisClient as RedisClientType);

  /**
   * Graceful Shutdown
   */
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    if (io) {
      io.close(() => {
        logger.info('Socket.IO server closed.');
      });
    }

    if (server) {
      server.close(() => {
        logger.info('HTTP server closed.');
      });
    }

    try {
      await closeMongoDB();
      await closeRedis();
      process.exit(0);
    } catch (err: any) {
      logger.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
