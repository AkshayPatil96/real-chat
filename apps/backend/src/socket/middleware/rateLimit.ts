import { Socket } from 'socket.io';
import { RedisClientType } from 'redis';
import logger from '../../utils/logger.js';

const RATE_LIMIT_WINDOW = 60; // 1 minute
const MAX_EVENTS_PER_WINDOW = 100;

export function createRateLimitMiddleware(redisClient: RedisClientType) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    const userId = (socket as any).userId;

    if (!userId) {
      return next();
    }

    const key = `ratelimit:socket:${userId}`;

    try {
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, RATE_LIMIT_WINDOW);
      }

      if (current > MAX_EVENTS_PER_WINDOW) {
        logger.warn(`Rate limit exceeded for user ${userId}`);
        return next(new Error('Rate limit exceeded'));
      }

      next();
    } catch (error: any) {
      logger.error(error, 'Error in rate limit middleware');
      next(); // Allow through on error
    }
  };
}
