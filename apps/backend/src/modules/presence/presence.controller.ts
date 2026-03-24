import { Request, Response } from 'express';
import { createPresenceService } from '../../socket/services/PresenceService.js';
import { RedisClientType } from 'redis';
import { getRedisClient } from '../../config/redis.js';

/**
 * POST /api/presence/status
 * Returns online status for a list of userIds
 */
export async function getPresenceStatus(req: Request, res: Response) {
  const { userIds } = req.body;

  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds must be an array' });
  }

  // Get Redis client lazily (after server initialization)
  const redisClient = getRedisClient();
  if (!redisClient) {
    return res.status(503).json({ error: 'Redis not connected' });
  }

  const presenceService = createPresenceService(redisClient as RedisClientType);
  const status = await presenceService.getOnlineStatus(userIds);

  res.json(status);
}
