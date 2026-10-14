# EMPEROR SMART SOLUTIONS — COMMERCIAL MULTI-TENANT B2B SAAS ARCHITECTURE

## 1. System Overview

The Emperor Smart Solutions (ESS) AI Chatbot platform has been elevated from a single-client qualification bot to a **multi-tenant B2B SaaS platform**. It enables organizations to register, configure custom AI sales bots, ingest website documentation, embed chat widgets, and automate lead qualification with monthly billing and quota enforcement.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT TOUCHPOINTS                              │
│   Web Visitors (Floating Widget)   │   WhatsApp Cloud API   │ Customer CRM  │
└─────────────────────────────────────┬───────────────────────┬───────────────┘
                                      │                       │
                                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE & REVERSE PROXY                              │
│         Cloudflare SSL / Nginx Reverse Proxy (Host Port 3300 -> 3000)       │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NEXT.JS 16 APPLICATION RUNTIME                        │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │ Route Middleware      │  │ Public Chat & Widget  │  │ WhatsApp Inbound │ │
│  │ Session & Role Guards │  │ Origin & Quota Guards │  │ Webhook Handler  │ │
│  └──────────┬────────────┘  └──────────┬────────────┘  └────────┬─────────┘ │
│             │                          │                        │           │
│             ▼                          ▼                        ▼           │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     CORE APPLICATION DOMAIN SERVICES                   │ │
│  │  - Auth & RBAC Guard: Session tokens, scrypt constant-time hashing    │ │
│  │  - Sales Qualification Engine: 8-category non-destructive state flow  │ │
│  │  - Contact Extraction: Regex + NLP Indian mobile (+91) scoring        │ │
│  │  - Billing & Quota Manager: Razorpay subscriptions, atomic counters   │ │
│  │  - Background Crawler Queue: Decoupled page ingestion with SSRF guard  │ │
│  │  - Distributed Rate Limiter: Redis Sliding Window + fallback           │ │
│  └─────────────────────────────────────┬──────────────────────────────────┘ │
└────────────────────────────────────────┼────────────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
┌──────────────────────────────────────┐    ┌─────────────────────────────────┐
│     POSTGRESQL 16 + PGVECTOR         │    │       REDIS 7 DISTRIBUTED       │
│ - Organizations, Users, Memberships  │    │ - Cluster sliding-window rate   │
│ - Bots, Conversations, Messages      │    │   limits (Lua atomics)          │
│ - Leads, Subscriptions, UsageRecords │    │ - Queue locks and session cache │
│ - KnowledgeChunks + HNSW vector index│    └─────────────────────────────────┘
└──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI INFERENCE PROVIDERS                              │
│   Primary: Groq Llama 3.3 70B (Sub-second consultative generation)          │
│   Fallback: Self-Hosted Ollama Llama 3.2 1B (Air-gapped on internal bridge) │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Core Architectural Pillars

1. **Strict Multi-Tenancy:**
   All business entities (`Bot`, `Conversation`, `Lead`, `KnowledgeDocument`, `KnowledgeChunk`, `Subscription`, `UsageRecord`) are strictly scoped by `organizationId`. Cross-tenant data leakage is prevented at the database query and API guard layers.

2. **Defense-in-Depth Security:**
   - Server-side route protection middleware (`frontend/middleware.js`).
   - Constant-time password hashing via native `scrypt` with cryptographic salts.
   - Tamper-proof HMAC-SHA256 session tokens in `HttpOnly`, `SameSite=Lax` cookies.
   - SSRF protection rejecting RFC 1918 private IPs and cloud metadata (`169.254.169.254`).
   - Suffix-spoofing domain guards preventing unauthorized iframe/widget embeddings.

3. **Atomic Quota Enforcement:**
   Every incoming public chat message or crawling job checks subscription status and reserves usage before invoking external LLM inference. High usage cannot run up unbounded API expenses.

4. **Distributed Scalability:**
   Rate limiting is powered by Redis sorted sets with atomic Lua scripts, ensuring identical limits across horizontal container replicas.
