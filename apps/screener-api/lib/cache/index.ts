import { config } from "../config";

interface CacheEntry {
  value: string;
  expiresAt: number;
}

// In-memory fallback when no Redis
const memoryStore = new Map<string, CacheEntry>();

function cleanExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}

// Clean expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(cleanExpired, 60_000);
}

async function getRedisClient() {
  if (!config.hasRedis) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: config.redisRestUrl,
    token: config.redisRestToken,
  });
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const redis = await getRedisClient();
    if (redis) {
      const val = await redis.get<T>(key);
      return val;
    }

    // In-memory fallback
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    }

    // In-memory fallback
    memoryStore.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  async del(key: string): Promise<void> {
    const redis = await getRedisClient();
    if (redis) {
      await redis.del(key);
      return;
    }
    memoryStore.delete(key);
  },

  // For testing: clear the in-memory store
  _clearMemory() {
    memoryStore.clear();
  },
};
