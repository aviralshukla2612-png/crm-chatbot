# ESS PostgreSQL, Redis, and Backup Readiness Audit Report

**Document ID:** `ESS-DATABASE-AND-BACKUP-READINESS-001`  
**Classification:** Database Administration & Disaster Recovery Audit  
**Target:** PostgreSQL 16 (`pgvector`), Redis 7, Backup & Restore Procedures  
**Status:** **MIGRATION SCRIPTS READY / RUNTIME OPERATING ON HYBRID FALLBACK**  

---

## 1. PostgreSQL Schema and Connection Pooling

### 1.1 Pool Architecture
- **Implementation:** `frontend/lib/db/dbPool.js`
- **Driver:** `pg` (Node-Postgres) ConnectionPool.
- **Configured Limits:** Max 20 connections, idle timeout 30,000ms, connection timeout 5,000ms.
- **Resilience Behavior:** If `DATABASE_URL` is unreachable or unconfigured, the pool catches errors and gracefully falls back to local in-memory stores (`frontend/data/*.json`) to avoid hard server boot crashes in development and staging environments.

### 1.2 Migration Script Analysis (`idempotent_migration.sql`)
- Located at: `frontend/data/idempotent_migration.sql`
- **Extensions:** `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`, `CREATE EXTENSION IF NOT EXISTS vector;`
- **Tables Defined:**
  - `organizations`: Multi-tenant root (UUID primary key, tier, active status).
  - `users`: Identity accounts with bcrypt/scrypt hash storage, foreign key to `organizations`.
  - `organization_members`: Role assignment (`superadmin`, `subadmin`, `member`).
  - `bots`: Tenant bots with foreign key to `organizations(id) ON DELETE CASCADE`.
  - `conversations` & `messages`: Thread history scoped by `organization_id`.
  - `leads`: CRM leads captured by AI, scoped by `organization_id`.
  - `knowledge_documents` & `knowledge_chunks`: Document store with 768-dimension `vector(768)` for embeddings, cosine distance index (`ivfflat`).
  - `organization_quotas` & `usage_records`: Atomic quota counters.
  - `subscriptions` & `payment_transactions`: Financial audit records.

---

## 2. Redis and Background Crawling

### 2.1 Distributed Rate Limiting
- **Implementation:** `frontend/lib/security/distributedRateLimit.js`
- **Engine:** Redis sliding-window token bucket.
- **Failure Mode:** If Redis connection drops, the limiter automatically falls back to an in-memory `LRUCache`. In a multi-replica setup, this fallback is process-local; therefore, Redis must be monitored to prevent cross-replica limit inflation.

### 2.2 Background Crawling Durability
- **Implementation:** `frontend/lib/crawler/crawlerQueue.js`
- **Execution:** Currently operates an asynchronous in-process task queue with concurrent promise batching (concurrency cap: 2 per organization).
- **Production Assessment:** For large enterprise knowledge bases, an in-process queue loses unfinished jobs if the container restarts. Future upgrade should back the crawler queue with BullMQ on Redis.

---

## 3. Backup and Disaster Recovery Runbook

### 3.1 Backup Script (`scripts/backup_postgres.sh`)
- Generates gzip-compressed PostgreSQL custom-format dump (`pg_dump -Fc`).
- Retains 14 days of local rotating backups.
- Includes timestamped metadata.

### 3.2 Restoration Drill Runbook
To verify disaster recovery without endangering production data:
1. Spin up an isolated PostgreSQL container:
   ```bash
   docker run --name pg-restore-drill -e POSTGRES_PASSWORD=restore_test -d postgres:16
   ```
2. Restore the latest backup archive:
   ```bash
   pg_restore -h localhost -p 5432 -U postgres -d postgres /backups/ess_backup_YYYYMMDD.dump
   ```
3. Run verification query to confirm organization and bot count.
4. Tear down the test container:
   ```bash
   docker stop pg-restore-drill && docker rm pg-restore-drill
   ```
