import { createClient, RedisClientType } from 'redis';
import config from './env.js';
import logger from '../utils/logger.js';

let redisClient: RedisClientType | undefined;

/**
 * Connect to Redis
 */
export async function connectRedis(): Promise<RedisClientType> {
  try {
    redisClient = createClient({ url: config.redis.url }) as RedisClientType;
    
    redisClient.on('error', (err: any) => {
      logger.error(err, 'Redis Client Error');
    });
    
    await redisClient.connect();
    logger.info('Connected to Redis');
    
    return redisClient;
  } catch (error: any) {
    logger.error(error, 'Redis Connection Failed');
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClientType | undefined {
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed.');
    }
  } catch (error: any) {
    logger.error(error, 'Error closing Redis connection');
    throw error;
  }
}
