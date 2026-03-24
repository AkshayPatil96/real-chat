import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

/**
 * Production Hardening: Rate Limiting with Redis Store
 * 
 * Protects against brute force attacks and abuse by limiting request rates.
 * Uses Redis for distributed rate limiting across multiple instances.
 * Different tiers for different route sensitivities.
 */

/**
 * Check if Redis is available for rate limiting
 * Falls back to memory store in development if Redis is unavailable
 */
function createRateLimitStore() {
  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isReady) {
      logger.info('Rate limiting using Redis store (distributed)');
      return new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: 'rl:', // Rate limit key prefix in Redis
      });
    }
  } catch (error) {
    logger.warn('Redis not available, using memory store for rate limiting');
  }
  
  // Fallback to memory store (not suitable for production with multiple instances)
  return undefined; // Uses default MemoryStore
}

/**
 * Standard handler for rate limit exceeded
 */
function rateLimitHandler(req: any, res: any) {
  logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
  const retryAfter = req.rateLimit?.resetTime
    ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
    : 900;
  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter,
  });
}

// Global rate limit: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  store: createRateLimitStore(),
  handler: rateLimitHandler,
});

// Strict limiter for authentication routes: 5 requests per 15 minutes (Task 4 requirement)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Reduced from 10 to 5 as per requirement
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: false, // Count all requests to prevent brute force
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
});

// Message routes: 30 requests per minute per user (Task 4 requirement)
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Reduced from 50 to 30 as per requirement
  message: 'You are sending messages too quickly. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  // Note: Default IP-based limiting to avoid IPv6 validation issues
  // Per-user rate limiting would require advanced setup with skipFailedRequests
});

// Chat request routes: 20 requests per hour (prevents spam) - Updated per Task 4
export const chatRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 5 to 20 for usability
  message: 'You have sent too many chat requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  // Note: Default IP-based limiting to avoid IPv6 validation issues
});

// Upload routes: 10 requests per hour (Task 4 requirement)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Strict limit for uploads to prevent storage abuse
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  // Note: Default IP-based limiting to avoid IPv6 validation issues
});

// Conversation creation: 20 per hour (prevents abuse)
export const conversationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'You have created too many conversations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore(),
  handler: rateLimitHandler,
  // Note: Default IP-based limiting to avoid IPv6 validation issues
});
