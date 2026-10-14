# AUDIT REPORT: POSTGRESQL, REDIS & PERSISTENCE INTEGRITY

**Audit Date:** October 14, 2026  
**Audited Components:** `frontend/lib/db/dbPool.js`, `frontend/lib/redis/redisClient.js`, `frontend/lib/crawler/crawlerQueue.js`, `docker-compose.yml`  
**Verdict:** **VERIFIED WITH OBSERVATIONAL NOTES (Grade: B+ / 85%)**

---

## 1. PostgreSQL 16 & pgvector Schema
- **Database Status:** Operational in Docker on internal bridge `ess_internal` on port 5432.
- **Tables Initialized:**
  - `Organization` (Tenants, plans, status)
  - `User` (User credentials, roles, email verification)
  - `OrganizationMembership` (Org-user association with unique constraint `uq_org_user`)
  - `Bot` (Chatbot configuration, allowed origins, system prompt)
  - `Conversation` & `Message` (12-turn memory window)
  - `Lead` (Transactional lead records with 10-digit Indian phones)
  - `KnowledgeDocument` & `KnowledgeChunk` (Vector embeddings with 768 dimensions and HNSW index)
  - `Subscription` (Razorpay customer and plan status)
  - `UsageRecord` (Atomic counters for messages and crawls)
  - `ApiKey` (Hashed server-to-server credentials)
  - `BillingEvent` (Idempotent webhook ledger)
  - `AuditLog` (Administrative audit trail)

## 2. Distributed Redis State & Graceful Degradation
- **Implementation:** `frontend/lib/redis/redisClient.js`, `frontend/lib/security/distributedRateLimit.js`
- **Rate Limiting Mechanism:** Redis Sorted Sets with atomic Lua script calculating request timestamps.
- **Failover Verification:** When Redis is disconnected or offline during local test execution, the rate limiter falls back to an in-memory sliding window map without throwing unhandled exceptions.

## 3. Crawler Queue & SSRF Hardening
- **Implementation:** `frontend/lib/crawler/crawlerQueue.js`
- **SSRF Guard:** Checks `isSafePublicWebUrl(url)` before job creation. Rejects RFC 1918 subnets, localhost, and AWS/GCP metadata (`169.254.169.254`).
- **Concurrency Limiting:** Enforces maximum 2 concurrent crawl jobs per tenant to prevent resource monopolization.
