# ESS AI SALES AGENT — CATEGORY AUDIT SCORES & EVIDENCE TABLES

This document provides granular, evidence-based assessments for all 14 fixed audit categories defined in the Master Prompt rubric.

---

## 1. Weighted Summary Scorecard

| Cat | Audit Category | Weight | Implementation Score | Verified Score | Weighted Implementation | Weighted Verified |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **A** | Repository Audit and Architecture | 5% | 92 | 88 | 4.60% | 4.40% |
| **B** | Conversation State Machine & Memory | 12% | 94 | 92 | 11.28% | 11.04% |
| **C** | Sales Behavior and Qualification | 7% | 95 | 92 | 6.65% | 6.44% |
| **D** | RAG and Knowledge Grounding | 9% | 75 | 68 | 6.75% | 6.12% |
| **E** | Tool Calling & Business Automation | 7% | 65 | 60 | 4.55% | 4.20% |
| **F** | Lead Management and Persistence | 8% | 90 | 88 | 7.20% | 7.04% |
| **G** | Training Data Quality & Preprocessing | 9% | 96 | 96 | 8.64% | 8.64% |
| **H** | Actual Model Training & Deployment | 10% | 70 | 40 | 7.00% | 4.00% |
| **I** | Evaluation & Regression Testing | 10% | 95 | 92 | 9.50% | 9.20% |
| **J** | Feedback-Driven Improvement | 5% | 35 | 25 | 1.75% | 1.25% |
| **K** | Security, Privacy & Tenant Isolation | 8% | 90 | 88 | 7.20% | 7.04% |
| **L** | Frontend, Streaming & User Experience | 3% | 88 | 82 | 2.64% | 2.46% |
| **M** | Observability, Performance & Cost | 3% | 50 | 45 | 1.50% | 1.35% |
| **N** | Production Deployment & Rollback | 4% | 85 | 80 | 3.40% | 3.20% |
| **TOTAL** | **Comprehensive Weighted Score** | **100%** | — | — | **72.66%** | **68.38%** |

- **Rounded Implementation Score:** **73%**
- **Rounded Independently Verified Score:** **68%**
- **Overall Production Readiness Index:** **71%**

---

## 2. Granular Category Evidence Tables

### Category A: Repository Audit and Architecture (Weight: 5%)
- **Implementation Score:** 92/100
- **Verification Score:** 88/100
- **Remaining Gap:** Next.js uses App Router with TurboPack, but multiple lockfiles exist in root and frontend subdirectories, generating workspace warnings during build.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Next.js App Router Architecture | `frontend/package.json` (`"next": "16.4.0"`), `frontend/app/` routes | Static inspection, `npm run build` | Pass | Clean compilation of 40 static & dynamic routes |
| Environment Configuration Safety | `frontend/lib/config/envValidator.js` | Unit test (`envValidator.test.js`) | Pass | Rejects weak passwords, detects placeholder keys |
| Multi-tenant Schema Design | `frontend/lib/db/schema.prisma`, `idempotent_migration.sql` | Static inspection, DB migration test | Pass | Multi-tenant tenant/organization relations enforced |

---

### Category B: Conversation State Machine and Memory (Weight: 12%)
- **Implementation Score:** 94/100
- **Verification Score:** 92/100
- **Remaining Gap:** Deep multi-intent resolution within a single turn (e.g., requesting 3 separate services simultaneously) defaults to the primary categorized service.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Deterministic Qualification Flow | `frontend/lib/ai/salesFlowManager.js` | `simulate_real_conversations.js`, `masterPromptScenarios.test.js` | Pass | 40/40 simulation checks passing |
| Slot Protection ("Both" != Name) | `frontend/lib/ai/leadExtractor.js` (lines 140-165) | Unit test, Live server curl | Pass | Name retained; "Both" recognized as platform |
| Budget Preservation | `salesFlowManager.js` (budget recorded as `<=`) | Integration test Scenario 4 | Pass | Budget retained without repeating inquiry |
| Multi-Turn Context Recall | Live server benchmark Test 08 | Live curl on VPS port 3300 | Pass | Recalled ₹80,000 budget and Flutter accurately |

---

### Category C: Sales Behavior and Qualification (Weight: 7%)
- **Implementation Score:** 95/100
- **Verification Score:** 92/100
- **Remaining Gap:** Open-ended consultative pitch requires live LLM generation rather than hardcoded step templates when users ask highly customized architecture questions.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| 7 Services + School ERP Support | `salesFlowManager.js` (`ALL_ESS_SERVICES`, `QUALIFICATION_FLOWS`) | Automated script `test_all_7_services.js` | Pass | Web, E-comm, Mobile, ERP, Custom, AI, WhatsApp |
| Out-of-Scope Refusal (Celebrities/Trivia) | `intentClassifier.js`, `masterPrompt.js` | Live API benchmark Test 01 | Pass | Polite refusal + redirect to ESS solutions |
| Zero-Discount & Pricing Guardrail | `app/rag.py`, `masterPrompt.js` | Continuous evaluation benchmark | Pass | Requires founder approval for commercial discounts |

---

### Category D: RAG and Knowledge Grounding (Weight: 9%)
- **Implementation Score:** 75/100
- **Verification Score:** 68/100
- **Remaining Gap:** The Next.js chat route searches an in-memory crawl array and JSON files instead of querying PostgreSQL pgvector via SQL directly. Direct pgvector SQL is only in FastAPI `app/rag.py`.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Vector Distance Search | `app/rag.py` (`<=>` pgvector operator) | Static inspection | Pass | Uses pgvector extension in PostgreSQL |
| Document Chunking & Ingestion | `frontend/lib/db/documentsStore.js` (450 chars, 60 overlap) | Unit test, DB migration test | Partial | Document search in Node uses TF keyword matching |
| Grounded Pricing Policy | `masterPrompt.js`, `test_deployed_api.sh` (Test 09) | Live runtime benchmark | Pass | Refused unrealistic 7-day guarantee; cited 2-6 weeks |

---

### Category E: Tool Calling and Business Automation (Weight: 7%)
- **Implementation Score:** 65/100
- **Verification Score:** 60/100
- **Remaining Gap:** Formal JSON schema tool calling (`tools: [...]` parameter in LLM requests) is not implemented; automation is executed deterministically by the orchestrator.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Lead Extraction Automation | `frontend/lib/ai/leadExtractor.js` | Unit test (`leadExtractor.test.js`) | Pass | Extracts name, phone, email, budget |
| Outbound Webhook Dispatching | `frontend/lib/integrations/webhookDispatcher.js` | Unit test (`webhook.test.js`) | Pass | HMAC SHA-256 signatures and 3x backoff retries |
| LLM Tool Calling Protocol | `frontend/lib/ai/inferenceProvider.js` | Static code inspection | Missing | Model is not invoked with OpenAI/Ollama function calling schemas |

---

### Category F: Lead Management and Persistence (Weight: 8%)
- **Implementation Score:** 90/100
- **Verification Score:** 88/100
- **Remaining Gap:** Leads stored in local JSON fallback if PostgreSQL connection drops; background sync worker to flush JSON to DB is manual via `migrateJsonToDb.js`.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Lead Deduplication & Idempotency | `frontend/lib/db/leadsStore.js` (lines 126-170) | Simulation Scenario 4 | Pass | Exactly 1 lead maintained per session/phone |
| Honest Failure Reporting | `leadsStore.js` / Simulation Scenario 4 | Runtime fault injection test | Pass | Reports error honestly; delivers fallback email |
| PostgreSQL Dual-Persistence | `leadsStore.js` (`queryDb("INSERT INTO \"Lead\" ...")`) | Static code analysis | Pass | Writes to JSON cache and executes Postgres upsert |

---

### Category G: Training Data Quality and Preprocessing (Weight: 9%)
- **Implementation Score:** 96/100
- **Verification Score:** 96/100
- **Remaining Gap:** The Hugging Face dataset source does not have an explicit commercial license.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Full Dataset Acquisition (20.9k rows) | `scripts/train.parquet` (4.78 MB), `source_manifest.json` | Parquet parsing via `hyparquet` | Pass | 20,940 rows verified |
| Zero Leakage Split Partitioning | `data/training/ess-sales/{train,validation,test}.jsonl` | Node validation script | Pass | 1,338 train / 167 val / 168 test conversations (0 leak) |
| SFT Format Compliance | `data/training/ess-sales/train.jsonl` | Schema validation in `train_lora.py` | Pass | Formatted as OpenAI/Llama-3.2 `messages` array |

---

### Category H: Actual Model Training and Deployment (Weight: 10%)
- **Implementation Score:** 70/100
- **Verification Score:** 40/100
- **Remaining Gap:** Training was not executed to convergence on a multi-GPU cluster. The live deployment uses base `llama3.2:1b` with system prompt grounding.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| QLoRA SFT Pipeline Script | `scripts/train_lora.py` | Static code inspection | Pass | Supports NF4 4-bit, LoRA r=16, alpha=32 |
| Adapter Checkpoint Artifacts | `artifacts/ess_llama3.2_lora/adapter_model.safetensors` | File inspection (22.5 MB) | Partial | Adapter artifact exists, but no training loss logs |
| Production Model Deployment | Live VPS `docker compose ps` (`ess-ollama`) | Runtime container inspection | Partial | Deployed model is Ollama base `llama3.2:1b` |

---

### Category I: Evaluation and Regression Testing (Weight: 10%)
- **Implementation Score:** 95/100
- **Verification Score:** 92/100
- **Remaining Gap:** Evaluation uses deterministic assertion tests and simulated multi-turn scenarios; does not yet include continuous blind LLM-as-a-judge scoring on live user queries.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Automated Regression Suite | `npm test` | Runtime CLI execution | Pass | 94/94 tests passing (12.1s duration) |
| Multi-Turn Simulation Suite | `npm run test:simulate` | Runtime CLI execution | Pass | 40/40 checks passing |
| Continuous AI Benchmark | `node scripts/run_ai_evaluation.js` | Runtime CLI execution | Pass | 25/25 scenarios passing (100% accuracy) |
| Live Deployed Benchmark | `bash scripts/test_deployed_api.sh` | Remote VPS execution | Pass | 10/10 production questions passing |

---

### Category J: Feedback-Driven Improvement (Weight: 5%)
- **Implementation Score:** 35/100
- **Verification Score:** 25/100
- **Remaining Gap:** Missing user thumbs-up/down UI, human review queue, and active learning pipeline to retrain models on corrected answers.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Evaluation API Endpoint | `frontend/app/api/admin/ai/evaluate/route.js` | Static code inspection | Pass | Allows triggering benchmark via API |
| Chatbot Widget Feedback Buttons | `frontend/public/widget.js` | Code inspection | Missing | No thumbs-up/down or rating UI in widget |
| Dataset Retraining Queue | Repository inspection | Static code inspection | Missing | No automated data curation loop |

---

### Category K: Security, Privacy, and Tenant Isolation (Weight: 8%)
- **Implementation Score:** 90/100
- **Verification Score:** 88/100
- **Remaining Gap:** Dynamic application security testing (DAST) and third-party penetration testing have not yet been performed.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Origin / Domain Locking | `frontend/lib/security/domainGuard.js` | Unit test (`tenantIsolation.test.js`) | Pass | Rejects suffix spoofing and unauthorized domains |
| SSRF Defense | `frontend/lib/security/ssrf.js` | Unit test (`ssrf.test.js`) | Pass | Blocks loopback, RFC 1918, AWS/GCP metadata |
| Prompt Injection Resistance | `masterPrompt.js` / Live benchmark Test 02 | Live curl execution | Pass | Blocks DAN, developer mode, system prompt reveal |
| Cross-Tenant Data Isolation | `tenantIsolation.test.js` / Live benchmark Test 03 | Live curl execution | Pass | Blocks cross-customer document/credential access |

---

### Category L: Frontend, Streaming, and User Experience (Weight: 3%)
- **Implementation Score:** 88/100
- **Verification Score:** 82/100
- **Remaining Gap:** Widget does not support voice input or file attachments.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Standalone Embeddable Widget | `frontend/public/widget.js` (26.9 KB) | Static inspection | Pass | Zero-dependency vanilla JS widget |
| Server-Sent Events (SSE) Streaming | `frontend/lib/db/sseBroker.js`, `route.js` | Unit test (Scenario 31) | Pass | Progressively delivers tokens to client |
| Quick Reply Pills | `widget.js` (lines 350-420) | Simulation Scenario 1 | Pass | Displays selectable chips (e.g., "Android", "iOS") |

---

### Category M: Observability, Performance, and Cost (Weight: 3%)
- **Implementation Score:** 50/100
- **Verification Score:** 45/100
- **Remaining Gap:** Missing distributed rate limiting (Redis), APM tracing (OpenTelemetry), and automated token cost accounting.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Sliding Window Rate Limiting | `frontend/app/api/public/chat/[botId]/route.js` | Static code inspection | Partial | In-memory token bucket; resets per instance |
| Latency Logging | `InferenceProvider.js`, `route.js` | Command logs | Pass | Logs TTFT and inference duration in ms |
| Distributed Tracing & Metrics | Repository inspection | Static code inspection | Missing | No Prometheus, Grafana, or OpenTelemetry |

---

### Category N: Production Deployment and Rollback (Weight: 4%)
- **Implementation Score:** 85/100
- **Verification Score:** 80/100
- **Remaining Gap:** Host port mapping conflict: port 3000 on the host is occupied by RoyalBet, requiring the ESS stack to bind to port 3300.
- **Confidence:** High

| Requirement | Evidence | Verification Method | Result | Gap |
|---|---|---|:---:|---|
| Multi-Service Docker Compose | `docker-compose.yml` | `docker compose ps` on VPS | Pass | Frontend, Postgres, Ollama, FastAPI all healthy |
| Database Backup & Restore | `scripts/backup_postgres.sh`, `scripts/restore_verify.sh` | Script inspection | Pass | Automated pg_dump and integrity check scripts |
| Rollback Documentation | `docs/ai/deployment-and-rollback.md` | Document review | Pass | Rollback instructions for Docker and migrations |
