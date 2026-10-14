/**
 * Distributed Sliding-Window Rate Limiter
 * Utilizes Redis Sorted Sets for atomic cluster-wide rate limiting,
 * falling back gracefully to process memory when Redis is disconnected.
 */

import { getRedisClient, isRedisConnected } from "../redis/redisClient.js";

const memoryFallbackMap = new Map();

const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local current = redis.call('ZCARD', key)

if current < limit then
  redis.call('ZADD', key, now, now .. '_' .. math.random(1000, 9999))
  redis.call('PEXPIRE', key, window)
  return {1, limit - current - 1, 0}
else
  return {0, 0, math.ceil(window / 1000)}
end
`;

export async function checkDistributedRateLimit(key, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  const redis = getRedisClient();

  // 1. Try Redis Atomic Sliding Window
  if (redis && isRedisConnected()) {
    try {
      const res = await redis.eval(
        LUA_SLIDING_WINDOW,
        1,
        `ratelimit:${key}`,
        now,
        windowMs,
        maxRequests
      );

      const [allowed, remaining, retrySec] = res;
      return {
        ok: allowed === 1,
        remaining,
        retrySec: retrySec || 0,
        backend: "redis",
      };
    } catch (err) {
      // Fallback to local memory on Redis execution error
    }
  }

  // 2. In-Memory Fallback
  const entry = memoryFallbackMap.get(key);
  if (!entry || now > entry.resetAt) {
    memoryFallbackMap.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, retrySec: 0, backend: "memory" };
  }

  if (entry.count >= maxRequests) {
    const retrySec = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, remaining: 0, retrySec, backend: "memory" };
  }

  entry.count++;
  return { ok: true, remaining: maxRequests - entry.count, retrySec: 0, backend: "memory" };
}
