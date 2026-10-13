# ESS AI SALES AGENT — REMAINING WORK & ROADMAP

**Date:** October 13, 2026  
**Auditor:** Principal AI Architect & Technical Project Auditor  
**Total Estimated Remaining Work:** **~32%** of the full end-to-end Master Prompt specification

---

## 1. Ranked Outstanding Tasks

Tasks are ordered strictly by risk, reliability impact, and architectural importance.

```
Priority Ranking:
1. Model GPU Fine-Tuning Execution & Checkpoint Convergence (Model Quality)
2. Direct WhatsApp Cloud API Inbound Webhook Listener (Core Functionality)
3. Direct PostgreSQL pgvector Hybrid Retrieval in Next.js (Architecture & RAG)
4. Distributed Rate Limiting & Session Cache via Redis (Security & Scalability)
5. User Feedback Capture & Active Learning Data Loop (Continuous Improvement)
6. Distributed Observability, OpenTelemetry & APM Tracing (Operations & Cost)
```

---

## 2. Granular Task Breakdown & Effort Estimates

### Task 1: Complete Multi-Epoch SFT/QLoRA GPU Training
- **Priority:** #1 (Model Quality & Domain Specialization)
- **Current State:** Training script (`scripts/train_lora.py`) and zero-leakage dataset splits (`data/training/ess-sales/`) are ready and validated. Seed adapter exists in `artifacts/ess_llama3.2_lora/`. Full cluster training on all 14,885 turns has not yet been executed.
- **Action Required:**
  1. Provision an NVIDIA GPU instance (e.g., Google Colab A100/T4, RunPod, or AWS `g5.xlarge`).
  2. Execute `python scripts/train_lora.py` for 3 epochs with bfloat16 and 4-bit BitsAndBytes.
  3. Validate loss convergence across the 1,775 validation samples.
  4. Export fine-tuned LoRA weights and convert to GGUF format for Ollama.
  5. Deploy model to the remote VPS container and verify inference benchmarks.
- **Estimated Effort:** **1 to 2 Days** (Compute time: ~3–5 hours on A100 GPU).
- **Evidence for Estimate:** The dataset is fully cleaned, partitioned, and validated; the training script parses the data with zero schema errors. Effort is limited to GPU execution, conversion, and deployment testing.

---

### Task 2: Implement Direct WhatsApp Cloud API Inbound Webhook Receiver
- **Priority:** #2 (Core Functionality Impact)
- **Current State:** WhatsApp is supported as a sales qualification category, contact channel, and in training dialogues. The dashboard displays WhatsApp in the integrations tab. However, Next.js lacks an inbound `/api/whatsapp/webhook` route to receive real Meta Cloud API events.
- **Action Required:**
  1. Create `frontend/app/api/whatsapp/webhook/route.js`.
  2. Implement Meta webhook verification (`GET` with `hub.challenge` and `hub.verify_token`).
  3. Implement event processor (`POST`) to parse incoming text messages, map sender phone numbers to sessions, invoke `handleSalesFlowTurn`, and respond via WhatsApp Graph API.
- **Estimated Effort:** **2 to 3 Days**.
- **Evidence for Estimate:** The sales flow state machine already accepts `sessionId` and returns plain text replies; integrating Meta's HTTP Graph API requires endpoint scaffolding and secret verification.

---

### Task 3: Unify PostgreSQL pgvector Retrieval Inside Next.js Runtime
- **Priority:** #3 (RAG & Knowledge Grounding)
- **Current State:** pgvector SQL cosine distance queries (`<=>`) are implemented in the Python FastAPI service (`app/rag.py`). In the Next.js runtime, knowledge lookups fall back to JSON text matching and an in-memory vector array in `frontend/lib/crawler/engine.js`.
- **Action Required:**
  1. Wire `frontend/lib/crawler/engine.js` directly to `queryDb` in `frontend/lib/db/dbPool.js`.
  2. Execute SQL query `SELECT content, (embedding <=> $1::vector) AS distance FROM "DocumentChunk" ORDER BY distance ASC LIMIT $2`.
  3. Deprecate the in-memory array (`vectorStorePoints`) to guarantee multi-worker persistence.
- **Estimated Effort:** **1 to 2 Days**.
- **Evidence for Estimate:** The PostgreSQL database already has `pgvector` enabled and table schemas configured in `idempotent_migration.sql`; only the Node.js database client query needs to be hooked up.

---

### Task 4: Distributed Rate Limiting & Session Storage via Redis
- **Priority:** #4 (Security & Scalability)
- **Current State:** Rate limiting uses an in-memory `Map` inside `route.js`. This is vulnerable to partitioning if the container scales horizontally across multiple replicas.
- **Action Required:**
  1. Add Redis service to `docker-compose.yml` (`redis:7-alpine`).
  2. Install `ioredis` in `frontend/package.json`.
  3. Replace in-memory `rateLimitMap` with Redis sliding window atomic Lua scripts.
- **Estimated Effort:** **1 Day**.
- **Evidence for Estimate:** Standard sliding-window rate limiting pattern using Redis ZSET is well-established and requires minimal code changes.

---

### Task 5: User Feedback Capture & Active Learning Data Pipeline
- **Priority:** #5 (Feedback-Driven Improvement)
- **Current State:** An admin evaluation endpoint exists (`/api/admin/ai/evaluate`), but end-users cannot rate messages in `widget.js`. No pipeline exists to harvest corrected responses for retraining.
- **Action Required:**
  1. Add thumbs-up and thumbs-down action buttons to chat bubbles in `frontend/public/widget.js`.
  2. Add `/api/chat/feedback` endpoint to persist negative ratings with user commentary to PostgreSQL table `"MessageFeedback"`.
  3. Build an export script in `scripts/export_feedback_to_sft.js` to convert human-corrected responses into SFT training rows.
- **Estimated Effort:** **2 to 3 Days**.
- **Evidence for Estimate:** Frontend widget modification, database schema addition, and export formatting require full-stack integration across UI, API, and dataset scripts.

---

### Task 6: Distributed Observability, OpenTelemetry & APM Tracing
- **Priority:** #6 (Operational Cost & Maintainability)
- **Current State:** Basic console logs exist (`[INFERENCE]`, `[DB_QUERY_FAIL]`). Real-time dashboard metrics for token usage, latency distribution (p50, p95, p99), and provider cost accounting are absent.
- **Action Required:**
  1. Integrate OpenTelemetry instrumentation for Next.js.
  2. Record token usage and latency metrics in PostgreSQL `"InferenceMetric"` table.
  3. Expose aggregated charts in the admin dashboard under `/admin/usage`.
- **Estimated Effort:** **2 to 3 Days**.
- **Evidence for Estimate:** Pre-built Next.js OpenTelemetry packages exist; the effort lies in aggregating and visualizing metrics within the admin dashboard.

---

## 3. Summary of Total Effort to 100% Completion

| Phase | Tasks Included | Estimated Effort |
|---|---|:---:|
| **Phase 1: Model Convergence** | GPU SFT Training, GGUF conversion, deployment | 1–2 Days |
| **Phase 2: Channel Expansion** | Meta WhatsApp Cloud API webhook handler | 2–3 Days |
| **Phase 3: RAG & Persistence** | Direct SQL pgvector in Node, Redis rate limiting | 2–3 Days |
| **Phase 4: Feedback & Observability** | Feedback widget UI, active learning, OpenTelemetry | 3–5 Days |
| **TOTAL TO 100% COMPLETION** | **All 6 Outstanding Roadmap Epics** | **8 to 13 Working Days** |
