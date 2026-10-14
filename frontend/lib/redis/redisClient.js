/**
 * Distributed Redis Client & Connection Manager
 * Supports Redis Cluster / Standalone with automatic retry,
 * timeouts, and graceful local fallback when Redis is offline.
 */

let Redis = null;
try {
  const ioredis = await import("ioredis");
  Redis = ioredis.default || ioredis;
} catch {
  // ioredis not available in this environment
}

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null;

let redisClient = null;
let isConnected = false;

export function getRedisClient() {
  if (!Redis || !REDIS_URL) return null;

  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        connectTimeout: 3000,
        maxRetriesPerRequest: 2,
        retryStrategy(times) {
          if (times > 3) return null; // stop retrying after 3 attempts
          return Math.min(times * 200, 1000);
        },
      });

      redisClient.on("connect", () => {
        isConnected = true;
        console.log("✅ [REDIS] Connected to distributed Redis instance.");
      });

      redisClient.on("error", (err) => {
        isConnected = false;
        // Suppress repeated connection logs
      });
    } catch {
      redisClient = null;
    }
  }

  return isConnected ? redisClient : null;
}

export function isRedisConnected() {
  return isConnected && Boolean(redisClient);
}
