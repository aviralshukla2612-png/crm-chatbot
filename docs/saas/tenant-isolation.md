# MULTI-TENANT DATA ISOLATION & API BOUNDARIES

## 1. Isolation Strategy
Tenant isolation is enforced across three distinct structural boundaries:

1. **Database Schema Scoping:**
   Every entity (`Bot`, `Conversation`, `Message`, `Lead`, `KnowledgeDocument`, `KnowledgeChunk`, `Subscription`, `UsageRecord`) contains a foreign key or mandatory indexed column `"organizationId"`.
2. **API Guard Scoping (`frontend/lib/auth/guard.js`):**
   `requireAuth(request)` resolves the trusted server-side identity and active `organizationId`. Endpoints inject `principal.organizationId` into all database queries.
3. **Data Access Layer Scoping (`botsStore.js`, `leadsStore.js`, `conversationsStore.js`):**
   Stores refuse cross-tenant lookups. If Organization B attempts to fetch an entity owned by Organization A, the data layer returns `null` or empty sets.

## 2. API Route Classification & Authorization Matrix

| Route | Classification | Auth Guard | Tenant Scope |
|---|---|---|---|
| `POST /api/auth/login` | Public | IP Rate Limiter | Global |
| `POST /api/auth/register` | Public | IP Rate Limiter | Creates Org |
| `GET /api/auth/me` | Authenticated | `requireAuth` | User context |
| `GET /api/bots` | Private | `requireAuth` | `organizationId` |
| `POST /api/bots` | Private | `requireOrgRole(['ORG_OWNER', 'ORG_ADMIN'])` | `organizationId` |
| `GET /api/leads` | Private | `requireAuth` | `organizationId` |
| `GET /api/conversations` | Private | `requireAuth` | `organizationId` |
| `GET /api/billing/subscription`| Private | `requireAuth` | `organizationId` |
| `POST /api/billing/checkout` | Private | `requireOrgRole(['ORG_OWNER', 'ORG_ADMIN'])` | `organizationId` |
| `POST /api/billing/webhook` | External Webhook | HMAC Signature | Payload Org |
| `POST /api/public/chat/[botId]`| Public Embed | Domain Whitelist + Quota Guard | Bot Org |
| `GET/POST /api/whatsapp/webhook`| External Webhook| Meta Challenge / Signature | Phone Mapping |
| `GET/POST /api/admin/*` | Super Admin | `requireSuperAdmin` | Platform-wide |

## 3. Verification Evidence
All cross-tenant access scenarios were verified via automated tests in `tests/security/tenantIsolation.test.js`:
- Organization A bots cannot be retrieved or listed by Organization B.
- Confidential leads captured under Organization A are invisible to Organization B.
- Multi-turn conversation transcripts belonging to one organization cannot be queried by another.
