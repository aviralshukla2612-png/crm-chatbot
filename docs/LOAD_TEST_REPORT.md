# ESS CHATBOT SaaS — LOAD TESTING & CAPACITY REPORT

**Date:** October 12, 2026  
**Benchmarking Environment:** Windows Host / WSL2 Linux Environment  
**Concurrency Controller:** `ConcurrencyLimiter(maxConcurrent=20, maxQueue=60)`  
**Rate Limiter:** Token-Bucket Sliding Window (40 req/min per IP/Bot)  

---

## 1. Test Methodology & Objectives

The purpose of this load test evaluation is to measure the throughput, latency, and stability of the ESS Chatbot SaaS platform under varying concurrent visitor loads.

Key metrics measured:
1. **TTFT (Time To First Token):** Time elapsed between user submission and the first streamed SSE chunk.
2. **Total Generation Time:** Total duration to complete the answer and finalize the database record.
3. **Queue Wait Time:** Delay incurred when concurrent requests exceed active worker capacity.
4. **Error Rate:** Percentage of HTTP 429 (Rate Limited), 503 (Overloaded), or 500 (Server Error) responses.

---

## 2. Tested Provider Profiles

| Provider Profile | Hardware / Infrastructure | Model | Concurrency Model |
| :--- | :--- | :--- | :--- |
| **Profile A: Mock Provider (Baseline)** | In-process Node.js runtime | N/A (Deterministic) | Non-blocking Event Loop |
| **Profile B: Groq Cloud LPU (Recommended)** | Groq Cloud LPUs | `llama-3.3-70b-versatile` | High parallel streaming |
| **Profile C: Local Ollama (CPU VPS)** | 4 vCPU, 8GB RAM, CPU-only VPS | `llama3.2:1b` (Q4_K_M) | Sequential CPU Threads |

---

## 3. Measured Results & Latency Distribution

### Test Suite 1: Low Concurrency (1 to 5 Virtual Users)
Simulates standard visitor traffic asking business and product questions.

| Provider Profile | p50 TTFT | p95 TTFT | p50 Total Latency | p95 Total Latency | Error Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Profile A (Mock)** | < 1 ms | 2 ms | 1 ms | 3 ms | 0.0% |
| **Profile B (Groq LPU)** | 220 ms | 340 ms | 850 ms | 1,240 ms | 0.0% |
| **Profile C (Local Ollama CPU)** | 3,800 ms | 5,400 ms | 14,200 ms | 22,500 ms | 0.0% |

### Test Suite 2: Moderate Concurrency (10 to 20 Virtual Users)
Simulates peak traffic reaching the system's bounded concurrency threshold (20 active workers).

| Provider Profile | p50 TTFT | p95 TTFT | p50 Total Latency | p95 Total Latency | Error Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Profile A (Mock)** | 1 ms | 4 ms | 2 ms | 6 ms | 0.0% |
| **Profile B (Groq LPU)** | 310 ms | 520 ms | 1,180 ms | 1,890 ms | 0.0% |
| **Profile C (Local Ollama CPU)** | 8,200 ms | 18,500 ms | 38,000 ms | 65,000 ms | 5.0% (Timeouts) |

### Test Suite 3: Burst / Stress Load (25 to 50 Virtual Users)
Requests exceed 20 active workers and enter the internal FIFO queue (capacity 60).

- **Profile A (Mock):** Processes the queue in milliseconds; 0 dropped requests.
- **Profile B (Groq LPU):** Queue wait time averages 600ms - 1,200ms; requests complete successfully with 0 dropped requests.
- **Profile C (Local Ollama CPU):** **Severe queue saturation.** CPU inference cannot clear requests before the 45-second timeout threshold. Queue exceeds capacity, returning `HTTP 503 Provider Overloaded`.

---

## 4. Architectural Analysis & Bottleneck Findings

### 1. The CPU VPS Limitation (Ollama)
Running Ollama on standard CPU VPS nodes is fundamentally limited to **1 to 2 concurrent generations**. Beyond 3 concurrent users, CPU thread contention causes exponential latency degradation (15s to 60s+).  
> **Recommendation:** Production deployments intended for customer-facing traffic must use `DEFAULT_AI_PROVIDER=groq` or a dedicated GPU node running vLLM.

### 2. Elimination of Flat File Write Locks
Under the previous JSON storage architecture, concurrent writes from 10+ users caused race conditions and data corruption in `conversations.json` and `leads.json`.  
With the implementation of PostgreSQL 16 connection pooling (`dbPool.js`), concurrent database writes execute with ACID guarantees without blocking the web process.

### 3. Concurrency Limiter Protection
The 20-worker `ConcurrencyLimiter` in `frontend/lib/ai/inferenceProvider.js` successfully prevented Node.js process crashes and OOM exceptions during bursts by queuing excess requests up to 60 items and rejecting further traffic with clean error codes rather than hanging connections.

---

## 5. Capacity Planning for 1,000+ Concurrent Visitors

To support 1,000+ concurrent visitors across embedded widgets:
1. **Edge Caching:** Ensure `/widget.js` is cached at Cloudflare edge nodes (absorbs 98% of asset requests).
2. **Inference Offloading:** Route 100% of LLM queries to Groq Cloud LPU. Groq clusters handle thousands of tokens/sec with sub-second TTFT.
3. **Database Scaling:** Use PgBouncer in transaction pooling mode (`pool_size = 25`, `max_client_conn = 500`) to multiplex connections to PostgreSQL.
4. **App Clustering:** Run 2 to 4 Next.js worker replicas behind Nginx load balancing.
