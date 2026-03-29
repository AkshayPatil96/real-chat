import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';

/**
 * Production-grade Rate Limiting
 * - No heavy logging in hot path
 * - Safe Redis usage
 * - Internal + health routes excluded
 * - Balanced limits for real usage
 */

/**
 * Create Redis store safely
 */
function createRateLimitStore() {
  try {
    const redisClient = getRedisClient();

    if (redisClient && redisClient.isReady) {
      return new RedisStore({
        sendCommand: (...args: string[]) => {
          return redisClient.sendCommand(args);
        },
        prefix: 'rl:',
      });
    }
  } catch {
    // fallback to memory store
  }

  return undefined;
}

/**
 * Common skip logic
 */
function shouldSkip(req: any) {
  return (
    req.path === '/health' || // health checks
    req.ip === '127.0.0.1' || // localhost
    req.ip === '::1'
  );
}

/**
 * Lightweight handler (NO logging)
 */
function rateLimitHandler(req: any, res: any) {
  const retryAfter = req.rateLimit?.resetTime
    ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
    : 60;

  res.status(429).json({
    success: false,
    error: 'Too many requests',
    retryAfter,
  });
}

/**
 * Global limiter (balanced)
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // increased from 100
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  skip: shouldSkip,
});

/**
 * Auth limiter (strict but safe)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // slightly relaxed from 5
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  skip: shouldSkip,
});

/**
 * Message limiter
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // increased from 30
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  skip: shouldSkip,
});

/**
 * Chat request limiter
 */
export const chatRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50, // increased from 20
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  skip: shouldSkip,
});

/**
 * Upload limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20, // increased from 10
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  skip: shouldSkip,
});

/**
 * Conversation limiter
 */
export const conversationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  skip: shouldSkip,
});