# ESS CHATBOT SaaS — PRODUCTION DEPLOYMENT GUIDE

**Version:** 1.0.0  
**Target Environment:** Docker Compose / Linux VPS (Ubuntu 22.04 LTS / 24.04 LTS)  
**Database:** PostgreSQL 16 + pgvector  
**Reverse Proxy & Edge:** Cloudflare + Nginx  

---

## 1. System Architecture Overview

```mermaid
graph TD
    Client[Browser Widget / Visitor] -->|HTTPS :443| CF[Cloudflare Edge / WAF / DDOS Guard]
    CF -->|Reverse Proxy| NGINX[Nginx / Reverse Proxy]
    NGINX -->|HTTP :3000| NextJS[Next.js 16 SaaS Application]
    NextJS -->|Connection Pool| PG[(PostgreSQL 16 + pgvector)]
    NextJS -->|Inference Call| AI{InferenceProvider}
    AI -->|Cloud LPU| Groq[Groq API llama-3.3-70b]
    AI -->|Local Fallback| Ollama[Ollama Server :11434]
    NextJS -->|HMAC SHA-256 Webhook| CRM[Customer CRM / Webhook Endpoint]
```

---

## 2. Server Prerequisites

1. **Hardware Requirements:**
   - **For Cloud Inference (Groq):** 2 vCPU, 4GB RAM, 40GB SSD.
   - **For Self-Hosted Ollama (3B Model):** 4 vCPU, 8GB RAM, 80GB SSD (or 1x NVIDIA T4 / RTX 3060+ GPU).
2. **Software Requirements:**
   - Docker Engine v24+ & Docker Compose v2+
   - Node.js 18+ LTS (for local maintenance tools)
   - Git & OpenSSL

---

## 3. Environment Configuration

Copy the production environment template:

```bash
cp .env.example .env
```

Configure the following mandatory variables in `.env`:

```env
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com

# PostgreSQL Database
DATABASE_URL="postgresql://postgres:REPLACE_WITH_STRONG_PASSWORD@postgres:5432/ess_chatbot?schema=public"

# AI Inference (Recommended: Groq for sub-second responses)
DEFAULT_AI_PROVIDER=groq
GROQ_API_KEY="gsk_your_actual_groq_api_key"
GROQ_MODEL="llama-3.3-70b-versatile"

# Local Ollama Fallback
OLLAMA_URL="http://ollama:11434"
CHAT_MODEL="llama3.2:1b"

# Webhooks & Lead Delivery
LEAD_WEBHOOK_URL="https://your-crm.com/api/webhooks/leads"
LEAD_WEBHOOK_SECRET="whsec_generate_with_openssl_rand_hex_32"
```

---

## 4. Database Setup & Idempotent Migration

### Step 1: Start PostgreSQL with pgvector

Ensure your `docker-compose.yml` includes the PostgreSQL pgvector service:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: ess_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your_secure_password}
      POSTGRES_DB: ess_chatbot
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Step 2: Run Idempotent Schema Migration

Run the audited migration utility to create tables, HNSW indexes, and populate initial tenant data:

```bash
# Execute the audited SQL script against PostgreSQL
docker exec -i ess_postgres psql -U postgres -d ess_chatbot < frontend/data/idempotent_migration.sql
```

Alternatively, initialize the schema directly via Node.js:
```bash
node -e "import('./frontend/lib/db/dbPool.js').then(m => m.initializeDatabaseSchema())"
```

---

## 5. Cloudflare Configuration

Cloudflare acts as the edge defense layer protecting the application origin from volumetric DDoS, brute-force requests, and invalid origins.

### A. SSL / TLS Settings
- **SSL/TLS encryption mode:** `Full (strict)`.
- **Always Use HTTPS:** Enabled.
- **Minimum TLS Version:** `TLS 1.2`.
- **HTTP/3 (with QUIC):** Enabled.

### B. Cloudflare WAF Rules
Create custom WAF rules under **Security > WAF > Custom Rules**:
1. **Block Malicious User Agents:**
   - Expression: `(http.user_agent contains "sqlmap") or (http.user_agent contains "nikto")`
   - Action: `Block`.
2. **Public Chat Rate Limit:**
   - Path: `/api/public/chat/*`
   - Characteristics: `IP Address`.
   - Threshold: `40 requests per 1 minute`.
   - Action: `Managed Challenge` or `Block with 429`.

### C. Caching Rules (Page Rules / Cache Rules)
- **Static Widget (`/widget.js`):**
  - Edge Cache TTL: `4 hours`.
  - Browser Cache TTL: `1 hour`.
- **Public Chat API (`/api/public/chat/*`):**
  - Bypass Cache. (Streaming SSE must never be cached by edge CDN).

---

## 6. Docker Stack Deployment

Launch the complete containerized stack:

```bash
# Build and start services in background
docker compose up -d --build

# Verify container status
docker compose ps

# View application logs
docker compose logs -f frontend
```

---

## 7. Health Verification

Verify application health via the zero-leak health endpoint:

```bash
curl -i https://your-domain.com/api/health
```

Expected response (`HTTP 200 OK`):
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-10-12T12:00:00.000Z",
  "uptimeSeconds": 1420,
  "memory": {
    "rssMB": 85,
    "heapUsedMB": 42
  },
  "database": {
    "status": "connected"
  },
  "inference": {
    "defaultProvider": "groq",
    "status": "configured"
  }
}
```

---

## 8. Backup & Disaster Recovery

### Automated Daily PostgreSQL Backup
Set up a daily cron job on the host machine:

```bash
#!/bin/bash
# /opt/scripts/backup_postgres.sh
BACKUP_DIR="/var/backups/ess_chatbot"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec ess_postgres pg_dump -U postgres -d ess_chatbot -F c -b -v -f "/tmp/backup_${TIMESTAMP}.dump"
docker cp "ess_postgres:/tmp/backup_${TIMESTAMP}.dump" "${BACKUP_DIR}/"
docker exec ess_postgres rm "/tmp/backup_${TIMESTAMP}.dump"
# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +14 -delete
```

### Recovery Procedure
To restore from a backup file:

```bash
# Drop existing database (ensure maintenance window)
docker exec -i ess_postgres dropdb -U postgres ess_chatbot
docker exec -i ess_postgres createdb -U postgres ess_chatbot

# Restore data from dump file
docker exec -i ess_postgres pg_restore -U postgres -d ess_chatbot -v < /var/backups/ess_chatbot/backup_20261012.dump
```
