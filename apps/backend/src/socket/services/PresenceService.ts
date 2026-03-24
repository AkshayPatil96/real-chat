import { RedisClientType } from 'redis';

const PRESENCE_TTL = 120;
const PRESENCE_KEY_PREFIX = 'presence:';

const getPresenceKey = (userId: string) => `${PRESENCE_KEY_PREFIX}${userId}`;

export function createPresenceService(redis: RedisClientType) {
  return {
    async setOnline(userId: string): Promise<void> {
      const key = getPresenceKey(userId);
      await redis.incr(key);
      await redis.expire(key, PRESENCE_TTL);
    },

    async setOffline(userId: string): Promise<void> {
      const key = getPresenceKey(userId);
      const count = await redis.decr(key);
      if (count <= 0) await redis.del(key);
    },

    async isOnline(userId: string): Promise<boolean> {
      return (await redis.exists(getPresenceKey(userId))) === 1;
    },

    async refreshPresence(userId: string): Promise<void> {
      const key = getPresenceKey(userId);
      await redis.expire(key, PRESENCE_TTL);
    },

    async getOnlineStatus(userIds: string[]): Promise<Record<string, boolean>> {
      const pipeline = redis.multi();
      userIds.forEach((id) => pipeline.exists(getPresenceKey(id)));
      const results = await pipeline.exec();

      return userIds.reduce((acc, id, i) => {
        // Redis multi().exec() returns array of [error, result] tuples
        const result = results?.[i];
        acc[id] = Array.isArray(result) ? result[1] === 1 : result === 1;
        return acc;
      }, {} as Record<string, boolean>);
    },
  };
}

export type PresenceService = ReturnType<typeof createPresenceService>;

// For easy imports
export default createPresenceService;
