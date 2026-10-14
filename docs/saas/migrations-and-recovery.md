# DATABASE MIGRATIONS, SEEDING & DATA RECOVERY

## 1. Authoritative Persistence Architecture
PostgreSQL 16 + `pgvector` is now the authoritative persistent store for all SaaS entities. Local JSON files (`bots.json`, `leads.json`, `conversations.json`) are maintained exclusively as read-through caches and local development fallbacks, preventing dual-write divergence.

## 2. Idempotent Schema Initialization
The database schema (`frontend/lib/db/dbPool.js`) is automatically initialized during container startup using idempotent DDL statements (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

### Added SaaS Entities:
1. `"User"` (Credentials, roles, verification)
2. `"Organization"` (Tenants, slugs, plans)
3. `"OrganizationMembership"` (Tenant RBAC mapping)
4. `"Subscription"` (Billing provider, periods, status)
5. `"UsageRecord"` (Atomic counters for messages and crawls)
6. `"ApiKey"` (Hashed server-to-server credentials)
7. `"BillingEvent"` (Idempotent webhook ledger)
8. `"WhatsAppMapping"` (Meta phone number to tenant mapping)

## 3. Automated Backup & Recovery Procedures
- **Automated Backup:** Handled via script `scripts/backup_postgres.sh`. Produces compressed `.sql.gz` dump files with checksum validation.
- **Verification & Restoration:** Handled via `scripts/restore_verify.sh`. Restores database into an isolated temporary schema to verify table integrity and row counts before confirming backup validity.
