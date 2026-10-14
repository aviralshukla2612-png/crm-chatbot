/**
 * PostgreSQL Connection Pool & Durable Storage Manager
 * Uses 'pg' connection pooling with automatic schema initialization,
 * transaction support, and graceful fallback for local development.
 * Aligned 1:1 with Prisma and idempotent_migration.sql schema.
 */

import { createRequire } from "module";
import { validateEnvironment } from "../config/envValidator.js";

const require = createRequire(import.meta.url);

let Pool = null;
try {
  const pgModule = require("pg");
  Pool = pgModule.Pool || pgModule.default?.Pool || pgModule;
} catch {
  try {
    const pgModule = require("../../../frontend/node_modules/pg");
    Pool = pgModule.Pool || pgModule.default?.Pool || pgModule;
  } catch {
    try {
      const pgModule = require("../../node_modules/pg");
      Pool = pgModule.Pool || pgModule.default?.Pool || pgModule;
    } catch {
      // Fallback mode when running outside Docker without local pg
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/ess_chatbot?schema=public";

let pool = null;
let isConnected = false;
let initPromise = null;

export function getDbPool() {
  if (!Pool) return null;
  if (!pool) {
    const envStatus = validateEnvironment(process.env);
    if (!envStatus.valid && process.env.NODE_ENV === "production") {
      console.error("[DB_CONFIG_ERROR] Database environment validation failed:", envStatus.errors.join("; "));
    }

    const poolConfig = {
      max: parseInt(process.env.DB_POOL_MAX || "20", 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    if (process.env.POSTGRES_HOST && process.env.POSTGRES_PASSWORD) {
      poolConfig.host = process.env.POSTGRES_HOST;
      poolConfig.port = parseInt(process.env.POSTGRES_PORT || "5432", 10);
      poolConfig.database = process.env.POSTGRES_DB || "ess_chatbot";
      poolConfig.user = process.env.POSTGRES_USER || "postgres";
      poolConfig.password = process.env.POSTGRES_PASSWORD;
    } else {
      poolConfig.connectionString = process.env.DATABASE_URL || DATABASE_URL;
    }

    pool = new Pool(poolConfig);

    pool.on("error", (err) => {
      console.error("[DB_POOL_ERROR] Unexpected error on idle client:", err.message);
    });
  }
  return pool;
}

/**
 * Initializes PostgreSQL schema with pgvector and HNSW indexes
 * Matches Prisma schema and idempotent_migration.sql definitions
 */
export async function initPostgresTables() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const p = getDbPool();
      if (!p) return null;
      const client = await p.connect();

      try {
        await client.query("BEGIN;");

        // 1. Enable pgvector extension
        await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

        // 2. Organizations Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Organization" (
            "id" VARCHAR(64) PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "slug" VARCHAR(128) UNIQUE NOT NULL,
            "plan" VARCHAR(64) DEFAULT 'Enterprise',
            "status" VARCHAR(64) DEFAULT 'ACTIVE',
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 3. Bots Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Bot" (
            "id" VARCHAR(64) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "name" VARCHAR(255) NOT NULL,
            "description" TEXT,
            "avatar" VARCHAR(32) DEFAULT '🤖',
            "primaryColor" VARCHAR(32) DEFAULT '#4f46e5',
            "status" VARCHAR(64) DEFAULT 'Active',
            "systemPrompt" TEXT,
            "welcomeMessage" TEXT DEFAULT 'Hello! How can I help you today?',
            "launcherPosition" VARCHAR(32) DEFAULT 'bottom-right',
            "brandingEnabled" BOOLEAN DEFAULT TRUE,
            "allowedDomains" TEXT[] DEFAULT ARRAY['*']::TEXT[],
            "webhookUrl" TEXT,
            "webhookSecret" TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 3.5. Visitors Table (Persistent identity, opaque token hashes)
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Visitor" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "visitorTokenHash" VARCHAR(128) NOT NULL,
            "leadId" VARCHAR(128),
            "name" VARCHAR(255),
            "email" VARCHAR(255),
            "phone" VARCHAR(64),
            "metadata" JSONB DEFAULT '{}'::JSONB,
            "lastSeenAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "lastConversationAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "uq_visitor_token_bot" UNIQUE ("botId", "visitorTokenHash")
          );
        `);

        // 4. Conversations Table (Supports 24h visibility window and qualification persistence)
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Conversation" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "visitorId" VARCHAR(128),
            "leadId" VARCHAR(128),
            "visitorName" VARCHAR(255) DEFAULT 'Website Visitor',
            "visitorEmail" VARCHAR(255),
            "visitorPhone" VARCHAR(64),
            "visitorLocation" VARCHAR(128),
            "status" VARCHAR(64) DEFAULT 'Active',
            "isLead" BOOLEAN DEFAULT FALSE,
            "leadScore" VARCHAR(32),
            "lastMessage" TEXT,
            "qualificationState" JSONB DEFAULT '{}'::JSONB,
            "lastActivityAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "historyExpiresAt" TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Migration statements to ensure existing database instances acquire new columns idempotently
        await client.query(`
          ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "visitorId" VARCHAR(128);
          ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "leadId" VARCHAR(128);
          ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "qualificationState" JSONB DEFAULT '{}'::JSONB;
          ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "historyExpiresAt" TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');
        `);

        // 5. Messages Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Message" (
            "id" VARCHAR(128) PRIMARY KEY,
            "conversationId" VARCHAR(128) NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
            "role" VARCHAR(32) NOT NULL,
            "content" TEXT NOT NULL,
            "tokens" INT,
            "latencyMs" INT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 6. Leads Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Lead" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "name" VARCHAR(255) NOT NULL,
            "email" VARCHAR(255),
            "phone" VARCHAR(64),
            "company" VARCHAR(255) DEFAULT 'Direct Inbound',
            "score" VARCHAR(32) DEFAULT 'Medium',
            "status" VARCHAR(64) DEFAULT 'New',
            "inquiry" TEXT,
            "budget" VARCHAR(64) DEFAULT '₹50,000+',
            "source" VARCHAR(128) DEFAULT 'Web Chatbot Widget',
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 7. Knowledge Documents Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "KnowledgeDocument" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "name" VARCHAR(255) NOT NULL,
            "type" VARCHAR(32) DEFAULT 'PDF',
            "sizeBytes" INT DEFAULT 0,
            "status" VARCHAR(64) DEFAULT 'Ready',
            "chunksCount" INT DEFAULT 0,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 8. Knowledge Chunks with Vector(768) & HNSW Index
        await client.query(`
          CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
            "id" VARCHAR(128) PRIMARY KEY,
            "documentId" VARCHAR(128) NOT NULL REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE,
            "organizationId" VARCHAR(64) NOT NULL,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "chunkIndex" INT DEFAULT 0,
            "content" TEXT NOT NULL,
            "contentHash" VARCHAR(64),
            "embedding" VECTOR(768),
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 9. Webhook Config Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "WebhookConfig" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "url" TEXT NOT NULL,
            "secret" TEXT NOT NULL,
            "events" TEXT[] DEFAULT ARRAY['lead_captured']::TEXT[],
            "isActive" BOOLEAN DEFAULT TRUE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 10. Audit Log Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "AuditLog" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL,
            "userId" VARCHAR(64),
            "action" VARCHAR(128) NOT NULL,
            "resourceType" VARCHAR(64) NOT NULL,
            "resourceId" VARCHAR(128) NOT NULL,
            "ipAddress" VARCHAR(64),
            "metadata" TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 11. User Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "User" (
            "id" VARCHAR(64) PRIMARY KEY,
            "name" VARCHAR(255) NOT NULL,
            "email" VARCHAR(255) UNIQUE NOT NULL,
            "passwordHash" TEXT NOT NULL,
            "role" VARCHAR(64) DEFAULT 'MEMBER',
            "status" VARCHAR(64) DEFAULT 'ACTIVE',
            "emailVerifiedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 12. OrganizationMembership Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "OrganizationMembership" (
            "id" VARCHAR(64) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "userId" VARCHAR(64) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
            "role" VARCHAR(64) DEFAULT 'MEMBER',
            "status" VARCHAR(64) DEFAULT 'ACTIVE',
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "uq_org_user" UNIQUE ("organizationId", "userId")
          );
        `);

        // 13. Subscription Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Subscription" (
            "id" VARCHAR(64) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "provider" VARCHAR(64) DEFAULT 'razorpay',
            "providerCustomerId" VARCHAR(128),
            "providerSubscriptionId" VARCHAR(128),
            "planId" VARCHAR(64) DEFAULT 'STARTER',
            "status" VARCHAR(64) DEFAULT 'active',
            "currentPeriodStart" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "currentPeriodEnd" TIMESTAMP WITH TIME ZONE,
            "cancelAtPeriodEnd" BOOLEAN DEFAULT FALSE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 14. UsageRecord Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "UsageRecord" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "botId" VARCHAR(64),
            "conversationId" VARCHAR(128),
            "metric" VARCHAR(64) NOT NULL,
            "quantity" INT DEFAULT 1,
            "periodKey" VARCHAR(32) NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 15. ApiKey Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "ApiKey" (
            "id" VARCHAR(64) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "name" VARCHAR(255) NOT NULL,
            "keyHash" VARCHAR(128) NOT NULL UNIQUE,
            "prefix" VARCHAR(32) NOT NULL,
            "role" VARCHAR(64) DEFAULT 'MEMBER',
            "lastUsedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 16. BillingEvent Table (Idempotent Webhooks)
        await client.query(`
          CREATE TABLE IF NOT EXISTS "BillingEvent" (
            "id" VARCHAR(128) PRIMARY KEY,
            "provider" VARCHAR(64) NOT NULL,
            "eventId" VARCHAR(128) UNIQUE NOT NULL,
            "eventType" VARCHAR(128) NOT NULL,
            "organizationId" VARCHAR(64),
            "payload" JSONB,
            "processedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 17. WhatsAppMapping Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "WhatsAppMapping" (
            "id" VARCHAR(64) PRIMARY KEY,
            "phoneNumberId" VARCHAR(128) UNIQUE NOT NULL,
            "organizationId" VARCHAR(64) NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "webhookSecret" TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create HNSW vector similarity index for sub-10ms approximate nearest neighbor search
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hnsw 
          ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops)
          WITH (m = 16, ef_construction = 64);
        `);

        // B-tree indexes for fast tenant filtering & SaaS lookups
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_bot_org ON "Bot" ("organizationId");
          CREATE INDEX IF NOT EXISTS idx_visitor_lookup ON "Visitor" ("botId", "visitorTokenHash");
          CREATE INDEX IF NOT EXISTS idx_visitor_tenant ON "Visitor" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON "Conversation" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_conversation_visitor ON "Conversation" ("visitorId", "lastActivityAt");
          CREATE INDEX IF NOT EXISTS idx_conversation_history_expiry ON "Conversation" ("historyExpiresAt");
          CREATE INDEX IF NOT EXISTS idx_leads_tenant ON "Lead" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_documents_tenant ON "KnowledgeDocument" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant ON "KnowledgeChunk" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_user_email ON "User" ("email");
          CREATE INDEX IF NOT EXISTS idx_membership_lookup ON "OrganizationMembership" ("organizationId", "userId");
          CREATE INDEX IF NOT EXISTS idx_subscription_org ON "Subscription" ("organizationId");
          CREATE INDEX IF NOT EXISTS idx_usage_org_metric_period ON "UsageRecord" ("organizationId", "metric", "periodKey");
          CREATE INDEX IF NOT EXISTS idx_apikey_hash ON "ApiKey" ("keyHash");
        `);

        await client.query("COMMIT;");
        isConnected = true;
        console.log("✅ [POSTGRES_INIT] PostgreSQL schema and HNSW vector index initialized successfully.");
      } catch (err) {
        await client.query("ROLLBACK;");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn(`⚠️ [POSTGRES_INIT_FAIL] PostgreSQL unavailable (${err.message}). Stores will operate with local persistence.`);
      isConnected = false;
    }
  })();

  return initPromise;
}

/**
 * Execute a query with connection pooling and error handling
 */
export async function queryDb(sql, params = []) {
  try {
    const p = getDbPool();
    if (!p) {
      return { ok: false, error: "Database pool unavailable", rows: [], rowCount: 0 };
    }
    const result = await p.query(sql, params);
    isConnected = true;
    return { ok: true, rows: result.rows, rowCount: result.rowCount };
  } catch (err) {
    console.error(`[DB_QUERY_FAIL] ${err.message}`);
    return { ok: false, error: err.message, rows: [], rowCount: 0 };
  }
}

export function isDbConnected() {
  return isConnected;
}
