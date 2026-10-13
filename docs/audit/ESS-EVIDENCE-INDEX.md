# ESS AI SALES AGENT — EVIDENCE & ARTIFACT INDEX

This index compiles all physical files, datasets, scripts, configurations, test suites, and remote endpoints verified during the comprehensive audit.

---

## 1. Application Core & AI Orchestration

| File Path | Component | Key Lines / Functions | Verified Behavior |
|---|---|---|---|
| [`frontend/lib/ai/salesFlowManager.js`](file:///d:/ollama/frontend/lib/ai/salesFlowManager.js) | Deterministic Sales State Machine | Lines 18–180, `handleSalesFlowTurn` | Manages 7 core services + Educational ERP; non-destructive slot filling; budget bound tracking |
| [`frontend/lib/ai/leadExtractor.js`](file:///d:/ollama/frontend/lib/ai/leadExtractor.js) | Lead & Entity Extraction | Lines 45–180, `extractLeadDetails` | Extracts 10-digit Indian phones; protects titles (`Dr.`, `Principal`); excludes `"Both"` and `"Yes"` from name slot |
| [`frontend/lib/ai/intentClassifier.js`](file:///d:/ollama/frontend/lib/ai/intentClassifier.js) | Intent Guardrails & Classification | Lines 50–160, `classifyMessageIntent` | Classifies out-of-scope entertainment, prompt injection, and legitimate technical questions |
| [`frontend/lib/ai/masterPrompt.js`](file:///d:/ollama/frontend/lib/ai/masterPrompt.js) | System Prompt & Injection Filters | Lines 10–55, `checkInputScopeAndSafety` | Intercepts DAN, developer mode, and prompt leaks; dynamic Hindi/Hinglish language detection |
| [`frontend/lib/ai/inferenceProvider.js`](file:///d:/ollama/frontend/lib/ai/inferenceProvider.js) | Multi-Provider Inference Router | Lines 40–180, `InferenceProvider.generate` | Unified interface for Ollama, Groq, vLLM, and Mock with bounded concurrency and timeout fallback |

---

## 2. Database, Storage & Persistence

| File Path | Component | Key Lines / Functions | Verified Behavior |
|---|---|---|---|
| [`frontend/lib/db/dbPool.js`](file:///d:/ollama/frontend/lib/db/dbPool.js) | PostgreSQL Connection Pool | Lines 10–70, `getDbPool`, `initPostgresTables` | Resilient module resolution across host & container; initializes pgvector extension and schemas |
| [`frontend/lib/db/leadsStore.js`](file:///d:/ollama/frontend/lib/db/leadsStore.js) | Lead Store & Deduplication | Lines 120–200, `createLead` | Dual-write persistence (JSON cache + Postgres upsert); deduplication by `sessionId`, `email`, or clean `phone` |
| [`frontend/lib/db/conversationsStore.js`](file:///d:/ollama/frontend/lib/db/conversationsStore.js) | Conversation Session Store | Lines 30–120, `addMessage` | Session-based message history persistence; context extraction for multi-turn recall |
| [`frontend/lib/db/documentsStore.js`](file:///d:/ollama/frontend/lib/db/documentsStore.js) | Document Knowledge Store | Lines 15–80, `chunkDocumentText`, `searchDocuments` | Text chunking (450 chars, 60 overlap); keyword term frequency score matching |
| [`frontend/lib/db/schema.prisma`](file:///d:/ollama/frontend/lib/db/schema.prisma) | Prisma ORM Schema | Models: Organization, Bot, Conversation, Lead | Multi-tenant relational schema matching PostgreSQL tables |
| [`frontend/data/idempotent_migration.sql`](file:///d:/ollama/frontend/data/idempotent_migration.sql) | SQL Migration Script | Lines 1–350 | Creates pgvector extension, HNSW vector indexes, and all SaaS tables idempotently |

---

## 3. Security, SSRF & Network Protections

| File Path | Component | Key Lines / Functions | Verified Behavior |
|---|---|---|---|
| [`frontend/lib/security/domainGuard.js`](file:///d:/ollama/frontend/lib/security/domainGuard.js) | Origin Whitelist Guard | Lines 10–45, `checkDomainAuthorization` | Origin verification with regex prevention against subdomain spoofing attacks |
| [`frontend/lib/security/ssrf.js`](file:///d:/ollama/frontend/lib/security/ssrf.js) | Server-Side Request Forgery Defense | Lines 20–120, `validateUrlForSSRF` | Blocks RFC 1918 private IPs, loopback (`127.0.0.1`), cloud metadata (`169.254.169.254`) |
| [`frontend/lib/integrations/webhookDispatcher.js`](file:///d:/ollama/frontend/lib/integrations/webhookDispatcher.js) | Outbound Webhook Delivery | Lines 15–70, `WebhookDispatcher.dispatch` | Computes HMAC SHA-256 signatures; handles exponential backoff (3 retries) |
| [`frontend/lib/config/envValidator.js`](file:///d:/ollama/frontend/lib/config/envValidator.js) | Configuration Auditor | Lines 10–80, `validateEnvironment` | Rejects placeholder passwords and insecure settings in production mode |

---

## 4. Frontend, Streaming & Embeddable Widget

| File Path | Component | Key Lines / Functions | Verified Behavior |
|---|---|---|---|
| [`frontend/public/widget.js`](file:///d:/ollama/frontend/public/widget.js) | Pure Vanilla JS Embeddable Widget | Lines 1–788 (26.9 KB) | Zero-dependency widget; floating launcher, quick reply chip rendering, session persistence |
| [`frontend/lib/db/sseBroker.js`](file:///d:/ollama/frontend/lib/db/sseBroker.js) | Server-Sent Events (SSE) Broker | Lines 1–45 | Handles progressive token delivery to connected chat clients |
| [`frontend/app/api/public/chat/[botId]/route.js`](file:///d:/ollama/frontend/app/api/public/chat/[botId]/route.js) | Public Chat API Route | Lines 120–350, `POST` handler | Central endpoint orchestrating rate limiting, domain checks, state machine, inference, and persistence |
| [`frontend/package.json`](file:///d:/ollama/frontend/package.json) | Frontend Dependencies | Next.js 16.4.0, React 19.3.0, pg 8.23.1 | Clean compilation of 40 routes via `npm run build` |

---

## 5. Training Data, Scripts & Model Artifacts

| File Path | Component | Size / Format | Verified Metrics |
|---|---|---|---|
| [`scripts/train.parquet`](file:///d:/ollama/scripts/train.parquet) | Raw Hugging Face Dataset | 4,782,593 bytes | 20,940 source rows parsed with zero errors |
| [`data/training/ess-sales/train.jsonl`](file:///d:/ollama/data/training/ess-sales/train.jsonl) | SFT Training Split | 22,957,226 bytes | 14,885 turns across 1,338 conversations (0% data leakage) |
| [`data/training/ess-sales/validation.jsonl`](file:///d:/ollama/data/training/ess-sales/validation.jsonl) | SFT Validation Split | 2,753,295 bytes | 1,775 turns across 167 conversations (0% data leakage) |
| [`data/training/ess-sales/test.jsonl`](file:///d:/ollama/data/training/ess-sales/test.jsonl) | Held-Out Test Split | 4,402,906 bytes | 2,956 turns across 168 conversations (0% data leakage) |
| [`data/training/ess-sales/source_manifest.json`](file:///d:/ollama/data/training/ess-sales/source_manifest.json) | Dataset Provenance Manifest | 991 bytes | Source URL, SHA-256 checksum, revision hash |
| [`data/training/ess-sales/data_quality_report.json`](file:///d:/ollama/data/training/ess-sales/data_quality_report.json) | Data Quality Audit Report | 2,054 bytes | Identifies 91.7% step-inflation and topic distribution |
| [`scripts/train_lora.py`](file:///d:/ollama/scripts/train_lora.py) | QLoRA Training Pipeline Script | 195 lines | Configured for BitsAndBytes 4-bit, LoRA r=16, alpha=32 |
| [`scripts/Modelfile`](file:///d:/ollama/scripts/Modelfile) | Ollama Model Definition | 70 lines | System prompt v2.2.0, temperature 0.2, stop tokens |
| [`artifacts/ess_llama3.2_lora/adapter_model.safetensors`](file:///d:/ollama/artifacts/ess_llama3.2_lora/adapter_model.safetensors) | LoRA Adapter Checkpoint | 22,574,152 bytes | Seed weights for Llama-3.2-1B |

---

## 6. Test Suites & Benchmarks

| File Path | Description | Executed Assertions | Status |
|---|---|:---:|:---:|
| [`tests/unit/`](file:///d:/ollama/tests/unit) | Unit test suite | 24 tests | 100% Pass |
| [`tests/security/`](file:///d:/ollama/tests/security) | Security & isolation tests | 5 tests | 100% Pass |
| [`tests/integration/`](file:///d:/ollama/tests/integration) | Integration tests & failure modes | 65 tests | 100% Pass |
| [`scripts/simulate_real_conversations.js`](file:///d:/ollama/scripts/simulate_real_conversations.js) | Multi-turn real-world conversation simulator | 40 checks | 100% Pass |
| [`scripts/run_ai_evaluation.js`](file:///d:/ollama/scripts/run_ai_evaluation.js) | Continuous AI intelligence benchmark | 25 scenarios | 100% Pass |
| [`scripts/test_deployed_api.sh`](file:///d:/ollama/scripts/test_deployed_api.sh) | Live deployed production API benchmark | 10 scenarios | 100% Pass |

---

## 7. Remote Production Deployment

| Target | Host / URL | Container Name | Status |
|---|---|---|---|
| **Live Chatbot API** | `http://187.127.158.24:3300/api/public/chat/bot_aa` | `ess-frontend` | Up & Healthy (Port `3300:3000`) |
| **PostgreSQL + pgvector** | `187.127.158.24:5432` | `ess-postgres` | Up & Healthy |
| **Ollama Inference Engine** | `187.127.158.24:11434` | `ess-ollama` | Up & Healthy (Model: `llama3.2:1b`) |
| **FastAPI RAG Service** | `http://127.0.0.1:8008` (Host internal) | `ess-fastapi-rag` | Up |
