/**
 * PostgreSQL Connection Pool & Durable Storage Manager
 * Uses 'pg' connection pooling with automatic schema initialization,
 * transaction support, and graceful fallback for local development.
 */

import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgrespassword@localhost:5432/rag_db";

let pool = null;
let isConnected = false;
let initPromise = null;

export function getDbPool() {
  if (!pool) {
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
          CREATE TABLE IF NOT EXISTS organizations (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(128) UNIQUE NOT NULL,
            plan VARCHAR(64) DEFAULT 'Enterprise',
            status VARCHAR(64) DEFAULT 'ACTIVE',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 3. Bots Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS bots (
            id VARCHAR(64) PRIMARY KEY,
            organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            avatar VARCHAR(32) DEFAULT '🤖',
            primary_color VARCHAR(32) DEFAULT '#4f46e5',
            status VARCHAR(64) DEFAULT 'Active',
            system_prompt TEXT,
            welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
            allowed_domains TEXT[] DEFAULT ARRAY['*']::TEXT[],
            webhook_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 4. Conversations Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS conversations (
            id VARCHAR(128) PRIMARY KEY,
            organization_id VARCHAR(64) NOT NULL,
            bot_id VARCHAR(64) NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
            visitor_name VARCHAR(255) DEFAULT 'Website Visitor',
            visitor_email VARCHAR(255),
            visitor_phone VARCHAR(64),
            visitor_location VARCHAR(128),
            status VARCHAR(64) DEFAULT 'Active',
            is_lead BOOLEAN DEFAULT FALSE,
            lead_score VARCHAR(32),
            last_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 5. Messages Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR(128) PRIMARY KEY,
            conversation_id VARCHAR(128) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role VARCHAR(32) NOT NULL,
            content TEXT NOT NULL,
            tokens INT,
            latency_ms INT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 6. Leads Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS leads (
            id VARCHAR(128) PRIMARY KEY,
            organization_id VARCHAR(64) NOT NULL,
            bot_id VARCHAR(64) NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(64),
            company VARCHAR(255) DEFAULT 'Direct Inbound',
            score VARCHAR(32) DEFAULT 'Medium',
            status VARCHAR(64) DEFAULT 'New',
            inquiry TEXT,
            budget VARCHAR(64) DEFAULT '₹50,000+',
            source VARCHAR(128) DEFAULT 'Web Chatbot Widget',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 7. Knowledge Documents Table
        await client.query(`
          CREATE TABLE IF NOT EXISTS knowledge_documents (
            id VARCHAR(128) PRIMARY KEY,
            organization_id VARCHAR(64) NOT NULL,
            bot_id VARCHAR(64) NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(32) DEFAULT 'PDF',
            size_bytes INT DEFAULT 0,
            status VARCHAR(64) DEFAULT 'Ready',
            chunks_count INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 8. Knowledge Chunks with Vector(768) & HNSW Index
        await client.query(`
          CREATE TABLE IF NOT EXISTS knowledge_chunks (
            id VARCHAR(128) PRIMARY KEY,
            document_id VARCHAR(128) NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
            organization_id VARCHAR(64) NOT NULL,
            bot_id VARCHAR(64) NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
            chunk_index INT DEFAULT 0,
            content TEXT NOT NULL,
            content_hash VARCHAR(64),
            embedding VECTOR(768),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Create HNSW vector similarity index for sub-10ms approximate nearest neighbor search
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hnsw 
          ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
          WITH (m = 16, ef_construction = 64);
        `);

        // B-tree indexes for fast tenant filtering
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant ON knowledge_chunks(organization_id, bot_id);
          CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(organization_id, bot_id);
          CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(organization_id, bot_id);
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
      console.warn(`⚠️ [POSTGRES_INIT_FAIL] PostgreSQL unavailable (${err.message}). Stores will operate with in-memory persistence.`);
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
