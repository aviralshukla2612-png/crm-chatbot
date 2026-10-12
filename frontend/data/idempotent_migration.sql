-- =========================================================
-- ESS CHATBOT SaaS — COMPLETE POSTGRESQL & PGVECTOR MIGRATION
-- Generated: 2026-10-12T09:17:44.131Z
-- =========================================================
BEGIN;

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS "Organization" (
  "id" VARCHAR(64) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(128) UNIQUE NOT NULL,
  "plan" VARCHAR(64) DEFAULT 'Enterprise',
  "status" VARCHAR(64) DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bots Table
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

-- 4. Conversations Table
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

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS "Message" (
  "id" VARCHAR(128) PRIMARY KEY,
  "conversationId" VARCHAR(128) NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "role" VARCHAR(32) NOT NULL,
  "content" TEXT NOT NULL,
  "tokens" INT,
  "latencyMs" INT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Leads Table
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

-- 7. Knowledge Documents Table
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

-- 8. Knowledge Chunks Table (with Vector(768))
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

-- 9. Webhook Config Table
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

-- 10. Audit Log Table
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

-- Indexes for performance & vector search
CREATE INDEX IF NOT EXISTS idx_bot_org ON "Bot" ("organizationId");
CREATE INDEX IF NOT EXISTS idx_conversation_tenant ON "Conversation" ("organizationId", "botId");
CREATE INDEX IF NOT EXISTS idx_lead_tenant ON "Lead" ("organizationId", "botId");
CREATE INDEX IF NOT EXISTS idx_document_tenant ON "KnowledgeDocument" ("organizationId", "botId");
CREATE INDEX IF NOT EXISTS idx_chunk_tenant ON "KnowledgeChunk" ("organizationId", "botId");
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_hnsw 
ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Organization & Bot: aa (bot_aa)
INSERT INTO "Organization" ("id", "name", "slug", "plan", "status", "createdAt", "updatedAt")
VALUES ('org_default', 'Emperor Smart Solutions', 'org-bot_aa', 'Enterprise', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Bot" ("id", "organizationId", "name", "description", "avatar", "primaryColor", "status", "systemPrompt", "welcomeMessage", "createdAt", "updatedAt")
VALUES ('bot_aa', 'org_default', 'aa', 'Official AI assistant for Emperor Smart Solutions.', '⚡', '#4f46e5', 'Active', 'You are the official AI assistant for Emperor Smart Solutions (ESS), founded by Yash Sharma (Founder) and Karan Makwana (Co-Founder). Provide verified facts about services, founders, developer hiring, office location in Ahmedabad, and budget tiers. Never fabricate or invent facts.', 'Hello! I am the AI assistant for Emperor Smart Solutions. How can I help you today?', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "systemPrompt" = EXCLUDED."systemPrompt",
  "updatedAt" = NOW();

INSERT INTO "Lead" ("id", "organizationId", "botId", "name", "email", "phone", "company", "score", "status", "inquiry", "budget", "source", "createdAt", "updatedAt")
VALUES ('lead_1791787975361_b7dj', 'org_default', 'aa', 'Vikram Joshi', 'vikram@enterprise.in', '+91 99887 76655', 'Direct Inbound', 'High', 'New', 'Full Stack Next.js + Flutter development quote', '₹50,000+', 'Web Chatbot Widget', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "phone" = EXCLUDED."phone",
  "email" = EXCLUDED."email",
  "updatedAt" = NOW();

INSERT INTO "Lead" ("id", "organizationId", "botId", "name", "email", "phone", "company", "score", "status", "inquiry", "budget", "source", "createdAt", "updatedAt")
VALUES ('lead_1791608783809_j20l', 'org_default', 'aa', 'Sarah Connor', 'sarah@sky.net', '+1 555-0199', 'Website Embed Visitor', 'High', 'New', 'Hello! My name is Sarah Connor (sarah@sky.net). Do you offer enterprise CRM and ERP software?', '₹50,000+', 'Web Chatbot Widget', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "phone" = EXCLUDED."phone",
  "email" = EXCLUDED."email",
  "updatedAt" = NOW();

INSERT INTO "Lead" ("id", "organizationId", "botId", "name", "email", "phone", "company", "score", "status", "inquiry", "budget", "source", "createdAt", "updatedAt")
VALUES ('lead_1791608185636_9oft', 'org_default', 'aa', 'John Doe', 'john.doe@innovate.io', '+91 99999 88888', 'Website Embed Visitor', 'High', 'New', 'Hi, my name is John Doe and my email is john.doe@innovate.io. We need pricing for your ERP web application.', '₹50,000+', 'Web Chatbot Widget', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "phone" = EXCLUDED."phone",
  "email" = EXCLUDED."email",
  "updatedAt" = NOW();

INSERT INTO "Lead" ("id", "organizationId", "botId", "name", "email", "phone", "company", "score", "status", "inquiry", "budget", "source", "createdAt", "updatedAt")
VALUES ('lead_seed_01', 'org_default', 'aa', 'Rohan Varma', 'rohan.v@techlogix.co', '+91 98200 12345', 'TechLogix Global', 'High', 'New', 'Interested in custom ERP & CRM automation pipeline with real-time vector search.', '₹1,50,000', 'Web Chatbot Widget', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "phone" = EXCLUDED."phone",
  "email" = EXCLUDED."email",
  "updatedAt" = NOW();

INSERT INTO "KnowledgeDocument" ("id", "organizationId", "botId", "name", "type", "sizeBytes", "status", "chunksCount", "createdAt", "updatedAt")
VALUES ('doc_emperor_smart_solutions_01', 'org_default', 'all', 'Emperor_Smart_Solutions_Company_Profile.pdf', 'PDF', 5601, 'Ready', 5, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "KnowledgeChunk" ("id", "documentId", "organizationId", "botId", "chunkIndex", "content", "createdAt")
VALUES ('chk_doc_emperor_smart_solutions_01_0', 'doc_emperor_smart_solutions_01', 'org_default', 'all', 0, 'Company Identity & Leadership — Emperor Smart Solutions:
Emperor Smart Solutions (ESS) was founded by Yash Sharma (Founder) and Karan Makwana (Co-Founder).
It is an ISO 27001 & ISO 9001 certified digital engineering and enterprise AI company with 50+ projects delivered and 30+ happy clients.
• Founder: Yash Sharma
• Co-Founder: Karan Makwana
• Head Office: 202, Shitiratna Complex, Panchvati, Navrangpura, Ahmedabad - 380009, Gujarat, India
• Phone & WhatsApp: +91 63591 20081
• Email: emperorsmartsolutions@gmail.com | sales@emperorsmartsolutions.com | contact@emperorsmartsolutions.com
• Business Hours: Monday to Saturday: 10:00 AM – 7:00 PM IST (Sunday closed)', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "KnowledgeChunk" ("id", "documentId", "organizationId", "botId", "chunkIndex", "content", "createdAt")
VALUES ('chk_doc_emperor_smart_solutions_01_1', 'doc_emperor_smart_solutions_01', 'org_default', 'all', 1, 'Core Engineering Services — Emperor Smart Solutions:
1. Custom Software & Web: Next.js, React, Node.js, Flutter, React Native, iOS, Android, microservices.
2. Enterprise AI & Machine Learning: RAG As A Service, custom LLM fine-tuning (Llama 3, GPT-4o, Claude 3.5), autonomous agents (LangChain, LlamaIndex), Vibe Coding (Cursor AI, Claude Code).
3. Cloud & DevOps: AWS, Azure, GCP, Kubernetes (EKS, AKS, GKE), Terraform IaC, CI/CD, PostgreSQL, Redis.
4. Cybersecurity: Zero-Trust, penetration testing, SOC 2 Type II, ISO 27001, HIPAA readiness, Cloudflare/AWS WAF.
5. Data & BI: Snowflake, BigQuery, Databricks, Kafka, Spark, Airflow, PowerBI, Tableau.
6. Enterprise & FinTech: Odoo, ERPNext, SAP, Salesforce, Algo trading engines (Zerodha, Angel One APIs).', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "KnowledgeChunk" ("id", "documentId", "organizationId", "botId", "chunkIndex", "content", "createdAt")
VALUES ('chk_doc_emperor_smart_solutions_01_2', 'doc_emperor_smart_solutions_01', 'org_default', 'all', 2, 'Developer Hiring & Engagement Models:
Emperor Smart Solutions offers flexible hiring models (Dedicated Pods, Hourly T&M, Fixed-Price Milestones):
• Trending AI Developers: Cursor AI, Lovable, Claude Code, Gemini AI, LangChain/RAG Engineers
• Full-Stack & Frontend: Next.js, React, Vue, Angular, MERN/MEAN
• Backend & APIs: Python/Django, Node.js, Laravel/PHP, ASP.NET Core, Go
• Mobile: Flutter, React Native, Swift, Kotlin
• Cloud/DevOps: AWS Architects, Kubernetes SRE, Terraform specialists.', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "KnowledgeChunk" ("id", "documentId", "organizationId", "botId", "chunkIndex", "content", "createdAt")
VALUES ('chk_doc_emperor_smart_solutions_01_3', 'doc_emperor_smart_solutions_01', 'org_default', 'all', 3, 'Pricing & Typical Budget Tiers — Emperor Smart Solutions:
• Rapid Prototypes: Under ₹50,000
• Standard Web & Mobile Modules: ₹50,000 – ₹2,00,000
• Comprehensive Bespoke Applications: ₹2,00,000 – ₹5,00,000
• Enterprise Platforms, AI Pipelines & Algo Trading: ₹5,00,000+
All projects include 100% bilateral NDA protection and 24-hour response SLA.', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "KnowledgeChunk" ("id", "documentId", "organizationId", "botId", "chunkIndex", "content", "createdAt")
VALUES ('chk_doc_emperor_smart_solutions_01_4', 'doc_emperor_smart_solutions_01', 'org_default', 'all', 4, 'Industries & Proven Case Studies:
• Retail & eCommerce (Osia Hypermart: 150-store chain cloud POS, 99.99% uptime)
• FinTech & Trading (AI loan approval engine: reduced latency from 48h to under 3 min)
• Healthcare (HIPAA Telehealth & WebRTC platform serving 50,000+ monthly appointments)
• Logistics, Real Estate, HR Tech (Silver One), GIS Analytics, Education & Non-Profit.', NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Conversation" ("id", "organizationId", "botId", "visitorName", "visitorEmail", "visitorPhone", "status", "isLead", "lastMessage", "createdAt", "updatedAt")
VALUES ('test_deploy_1791608783005', 'org_default', 'bot_aa', 'Sarah Connor', 'sarah@sky.net', '+1 555-0199', 'Active', true, 'Hello! My name is Sarah Connor (sarah@sky.net). Do you offer enterprise CRM and ERP software?', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Conversation" ("id", "organizationId", "botId", "visitorName", "visitorEmail", "visitorPhone", "status", "isLead", "lastMessage", "createdAt", "updatedAt")
VALUES ('session_bot_aa_1791608185637', 'org_default', 'bot_aa', 'John Doe', 'john.doe@innovate.io', '+91 99999 88888', 'Active', true, 'Hi, my name is John Doe and my email is john.doe@innovate.io. We need pricing for your ERP web application.', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Conversation" ("id", "organizationId", "botId", "visitorName", "visitorEmail", "visitorPhone", "status", "isLead", "lastMessage", "createdAt", "updatedAt")
VALUES ('c_seed_01', 'org_default', 'bot_aa', 'Acme Logistics Inquiry', 'contact@acmelogistics.com', '+91 98765 43210', 'Active', true, 'Can we schedule a live demo of the ERP integration modules?', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

COMMIT;