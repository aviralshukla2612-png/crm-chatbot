# ESS AI Sales Agent: Architecture Audit

> **System:** Emperor Smart Solutions (ESS) AI Chatbot SaaS  
> **Repository:** `ess-chatbot`  
> **Environment:** Next.js 16 (App Router) + PostgreSQL (pgvector) + Ollama / Groq / OpenAI  

---

## 1. Actual Architecture Discovered

During repository inspection, the actual architecture was audited across frontend, backend, database, security, and inference layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                   │
│  - Public Chatbot Widget (frontend/public/widget.js)                   │
│  - Next.js Admin & Dashboard (App Router, Turbopack, Tailwind CSS)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SSE / HTTP JSON
┌───────────────────────────────────▼────────────────────────────────────┐
│                       SECURITY & GATEWAY TIER                          │
│  - DomainGuard (frontend/lib/security/domainGuard.js)                  │
│  - SSRF Protection (frontend/lib/security/ssrf.js)                     │
│  - Webhook Dispatcher HMAC SHA-256 (frontend/lib/security/webhook.js)  │
│  - Rate Limiting & Multi-Tenant Scoping (botId verification)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                     SALES & CONVERSATION ORCHESTRATION                 │
│  - Public Chat Route (frontend/app/api/public/chat/[botId]/route.js)   │
│  - SalesFlowManager (frontend/lib/ai/salesFlowManager.js)              │
│    * Deterministic State Machine (website, mobile, school ERP, etc.)   │
│    * Sequential qualification & Quick Replies generator                │
│  - IntentClassifier (frontend/lib/ai/intentClassifier.js)             │
│    * Business-only guardrail, out-of-scope refusal (Salman Khan, etc.) │
│  - LeadExtractor (frontend/lib/ai/leadExtractor.js)                    │
│    * Regex & NLP for Indian 10-digit/12-digit phones, names, emails    │
│    * Anti-hallucination non-name word filter                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    KNOWLEDGE RETRIEVAL & INFERENCE                     │
│  - RAG Retrieval (frontend/lib/ai/ragService.js)                       │
│    * PostgreSQL pgvector embeddings, cosine similarity search          │
│    * Tenant-isolated document search & citations                       │
│  - InferenceProvider (frontend/lib/ai/inferenceProvider.js)            │
│    * Ollama local fallback + Groq / OpenAI streaming                   │
│    * Master System Prompt v1.3.0 (frontend/lib/ai/masterPrompt.js)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                          PERSISTENCE LAYER                             │
│  - Dual-write Storage:                                                 │
│    * JSON store cache (conversationsStore.js, leadsStore.js)           │
│    * PostgreSQL ACID tables (Lead, Conversation, Document, Bot)        │
│    * SSE Broker (sseBroker.js) for live updates to /leads and /admin   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Inventory

| Component | File Path | Verified Status |
| :--- | :--- | :--- |
| **Public Chat Route** | `frontend/app/api/public/chat/[botId]/route.js` | Production ready; handles streaming & SSE |
| **Sales Flow State Machine** | `frontend/lib/ai/salesFlowManager.js` | Covers 7 core services + Educational ERP |
| **Lead Extraction** | `frontend/lib/ai/leadExtractor.js` | Multi-turn name, phone, email & inquiry extraction |
| **Intent Classifier** | `frontend/lib/ai/intentClassifier.js` | Business vs. Trivia vs. Prompt Injection |
| **Domain Security** | `frontend/lib/security/domainGuard.js` | Allowed origins and subdomain protection |
| **SSRF Defense** | `frontend/lib/security/ssrf.js` | Blocks localhost, RFC1918, and cloud metadata IPs |
| **Inference Provider** | `frontend/lib/ai/inferenceProvider.js` | Ollama, Groq, OpenAI with graceful fallback |
| **Database Pool** | `frontend/lib/db/dbPool.js` | PostgreSQL pg pool with graceful error handling |
| **Leads Store** | `frontend/lib/db/leadsStore.js` | Dual-write JSON + PostgreSQL with SSE broadcast |
| **AI Evaluation Engine** | `scripts/run_ai_evaluation.js` | 25 continuous evaluation scenarios |
| **Dataset Acquisition** | `scripts/acquire_and_analyze_dataset.js`| Automated Hugging Face parquet downloader & audit |
| **Preprocessing & Splits**| `scripts/preprocess_sales_dataset.js` | Leakage-safe grouped conversation SFT pipeline |
| **Fine-Tuning Script** | `scripts/train_lora.py` | PyTorch QLoRA 4-bit (NF4) training pipeline |

---

## 3. Findings & Architectural Constraints

1. **Deterministic Logic vs. Model Weight Separation:** Business boundaries (refusing non-business queries, sequential qualification questions, lead persistence) run in deterministic application code rather than relying on LLM self-discipline.
2. **Multi-Tenant Isolation:** Bot configurations, knowledge base embeddings, and leads are indexed with `botId` and `organizationId`, preventing cross-tenant leakage.
3. **Dual Persistence Mode:** Supports seamless local offline development via file-backed JSON stores and seamless enterprise production via PostgreSQL (`DATABASE_URL`).
