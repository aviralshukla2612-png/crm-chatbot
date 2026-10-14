# REDIS DISTRIBUTED STATE & BACKGROUND JOBS

## 1. Redis Architecture (`frontend/lib/redis/redisClient.js`)
The platform supports horizontal clustering through Redis (`ioredis`):
- **Connection Configuration:** Automatically connects to `REDIS_URL` or `REDIS_HOST:REDIS_PORT`.
- **Fault-Tolerant Fallback:** If Redis is temporarily unavailable or disconnected, the system logs a non-fatal warning and automatically falls back to in-memory sliding windows without crashing or dropping traffic.

## 2. Distributed Sliding-Window Rate Limiting (`frontend/lib/security/distributedRateLimit.js`)
- Utilizes Redis Sorted Sets (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`) evaluated inside an atomic Lua script.
- Eliminates the distributed multi-container synchronization gap where independent containers behind a round-robin load balancer fail to share rate limit counts.
- Protects public chat (`40 req/min/IP/bot`), login attempts (`10 attempts/15 min/IP`), and crawler requests.

## 3. Asynchronous Crawler & Ingestion Queue (`frontend/lib/crawler/crawlerQueue.js`)
- Decouples website crawling and document parsing from the synchronous Next.js request thread.
- **SSRF Validation:** Re-evaluates destination IP and scheme before initiating HTTP requests, blocking localhost, RFC 1918 subnets, and cloud metadata (`169.254.169.254`).
- **Tenant Concurrency Limits:** Enforces a maximum of 2 active crawl jobs per organization to prevent single-tenant queue monopolization.
- **Job Lifecycle:** Tracks statuses (`queued`, `processing`, `completed`, `failed`) and stores chunked knowledge vectors directly into PostgreSQL table `KnowledgeChunk`.
