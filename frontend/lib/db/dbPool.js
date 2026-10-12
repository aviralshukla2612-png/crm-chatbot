/**
 * PostgreSQL Connection Pool & Durable Storage Manager
 * Uses 'pg' connection pooling with automatic schema initialization,
 * transaction support, and graceful fallback for local development.
 * Aligned 1:1 with Prisma and idempotent_migration.sql schema.
 */

import pg from "pg";
import { validateEnvironment } from "../config/envValidator.js";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/ess_chatbot?schema=public";

let pool = null;
let isConnected = false;
let initPromise = null;

export function getDbPool() {
  if (!pool) {
    const envStatus = validateEnvironment(process.env);
    if (!envStatus.valid && process.env.NODE_ENV === "production") {
      console.error("[DB_CONFIG_ERROR] Database environment validation failed:", envStatus.errors.join("; "));
    }

    pool = new Pool({
      connectionString: DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || "20", 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 4000,
    });

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

        // 4. Conversations Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS "Conversation" (
            "id" VARCHAR(128) PRIMARY KEY,
            "organizationId" VARCHAR(64) NOT NULL,
            "botId" VARCHAR(64) NOT NULL REFERENCES "Bot"("id") ON DELETE CASCADE,
            "visitorName" VARCHAR(255) DEFAULT 'Website Visitor',
            "visitorEmail" VARCHAR(255),
            "visitorPhone" VARCHAR(64),
            "visitorLocation" VARCHAR(128),
            "status" VARCHAR(64) DEFAULT 'Active',
            "isLead" BOOLEAN DEFAULT FALSE,
            "leadScore" VARCHAR(32),
            "lastMessage" TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
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

        // Create HNSW vector similarity index for sub-10ms approximate nearest neighbor search
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hnsw 
          ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops)
          WITH (m = 16, ef_construction = 64);
        `);

        // B-tree indexes for fast tenant filtering
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_bot_org ON "Bot" ("organizationId");
          CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON "Conversation" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_leads_tenant ON "Lead" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_documents_tenant ON "KnowledgeDocument" ("organizationId", "botId");
          CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant ON "KnowledgeChunk" ("organizationId", "botId");
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
    const result = await p.query(sql, params);
    return { ok: true, rows: result.rows, rowCount: result.rowCount };
  } catch (err) {
    return { ok: false, error: err.message, rows: [], rowCount: 0 };
  }
}

export function isDbConnected() {
  return isConnected;
}
