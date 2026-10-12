# ESS CHATBOT SaaS — PRODUCTION DEPLOYMENT GUIDE

**Version:** 1.1.0 (Hardened)  
**Target Environment:** Ubuntu 22.04 LTS / 24.04 LTS VPS  
**Container Engine:** Docker Compose v2+ with Private Bridge Networking  
**Database:** PostgreSQL 16 + pgvector (HNSW Indexing)  
**Reverse Proxy & Edge:** Cloudflare WAF + Nginx (Unbuffered SSE Streaming)  
**Operational Status:** **Implementation Verified in Tested Environment; Production Deployment Pending Target VPS Provisioning**

---

## 1. System Architecture & Network Isolation

```mermaid
graph TD
    Client[Browser Widget / Visitor] -->|HTTPS :443| CF[Cloudflare Edge / WAF / DDOS Guard]
    CF -->|Proxy with CF-Connecting-IP| NGINX[Nginx Reverse Proxy :80/:443]
    NGINX -->|Unbuffered SSE Proxy :3300| NextJS[Next.js 16 SaaS Application]
    
    subgraph Private Docker Bridge [ess_internal]
        NextJS -->|PostgreSQL Connection Pool| PG[(PostgreSQL 16 + pgvector)]
        NextJS -.->|Optional Local Fallback| OLLAMA[Ollama Server :11434]
        NextJS -.->|Optional FastAPI Backend| FASTAPI[FastAPI Service :8000]
    end

    NextJS -->|Primary Inference / Sub-second TTFT| GROQ[Groq Cloud LPU llama-3.3-70b]
    NextJS -->|Signed Webhook HMAC SHA-256| CRM[Customer CRM / Webhook Endpoint]
```

### Network Isolation Rules
1. **Public Ingress:** Only Ports `80` (HTTP) and `443` (HTTPS) are open to the internet via Nginx.
2. **Private Containers:** PostgreSQL, Redis, and internal worker services communicate across the private `ess_internal` Docker bridge network.
3. **No Public Database Binding:** Port `5432` is bound strictly to `127.0.0.1:5432:5432` for administrative CLI access. It is **never** published to `0.0.0.0`.
4. **Internal Ollama Port:** Bound strictly to `127.0.0.1:11434:11434` for local debugging; internal containers communicate via `http://ollama:11434`.

---

## 2. Server Prerequisites & Firewall Setup

### Step 1: VPS Host Firewall (UFW)
```bash
# Allow SSH, HTTP, and HTTPS only
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 2: Install Docker & Compose v2
```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

---

## 3. Environment Configuration & Secret Consistency

Create and secure the production environment file:

```bash
cp .env.example .env
chmod 600 .env
```

### Environment Variables Checklist

```env
# Application
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com

# PostgreSQL Credentials (MUST MATCH IN BOTH PLACES)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_STRONG_GENERATED_PASSWORD_HERE
POSTGRES_DB=ess_chatbot

# Database URL (Constructed from above credentials)
DATABASE_URL="postgresql://postgres:YOUR_STRONG_GENERATED_PASSWORD_HERE@postgres:5432/ess_chatbot?schema=public"

# AI Inference (Recommended: Groq for sub-second responses)
DEFAULT_AI_PROVIDER=groq
GROQ_API_KEY="gsk_your_actual_groq_api_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"

# Local Ollama Fallback (Internal network address)
OLLAMA_URL="http://ollama:11434"
CHAT_MODEL="llama3.2:1b"

# Webhooks & Lead Delivery
LEAD_WEBHOOK_URL="https://your-crm.com/api/webhooks/leads"
LEAD_WEBHOOK_SECRET="whsec_generate_with_openssl_rand_hex_32"
```

---

## 4. Docker Compose Deployment & Service Health Checks

The hardened `docker-compose.yml` configures:
- Private bridge network `ess_internal`.
- Loopback-only port bindings (`127.0.0.1:3300:3000`, `127.0.0.1:5432:5432`).
- Service health checks for PostgreSQL (`pg_isready`), Ollama (`ollama list`), and Next.js (`/api/health`).

### Launch Stack
```bash
./deploy.sh
```

Or manually via Docker Compose:
```bash
docker compose up -d --build --remove-orphans
docker compose ps
```

---

## 5. Verified Database Migration

The migration process is **idempotent, transactional, and non-destructive**:
1. Creates `vector` extension (`CREATE EXTENSION IF NOT EXISTS vector;`).
2. Creates all tables (`"Organization"`, `"Bot"`, `"Conversation"`, `"Message"`, `"Lead"`, `"KnowledgeDocument"`, `"KnowledgeChunk"`, `"WebhookConfig"`, `"AuditLog"`).
3. Creates HNSW vector index (`WITH (m = 16, ef_construction = 64)`).
4. Inserts seed and audited records using `ON CONFLICT (...) DO UPDATE / DO NOTHING`.

### Execute Migration
```bash
docker compose exec -T postgres psql -U postgres -d ess_chatbot < frontend/data/idempotent_migration.sql
```

### Verify Migration Integrity
```bash
docker compose exec -T postgres psql -U postgres -d ess_chatbot -c "\dt"
docker compose exec -T postgres psql -U postgres -d ess_chatbot -c "SELECT COUNT(*) FROM \"Bot\";"
docker compose exec -T postgres psql -U postgres -d ess_chatbot -c "SELECT COUNT(*) FROM \"Lead\";"
```

---

## 6. Nginx & Cloudflare Setup

### A. Nginx Configuration
Deploy the provided configuration in [nginx/default.conf](file:///d:/ollama/nginx/default.conf) to `/etc/nginx/sites-available/ess_chatbot`:

```bash
sudo cp nginx/default.conf /etc/nginx/sites-available/ess_chatbot
sudo ln -s /etc/nginx/sites-available/ess_chatbot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Critical Features in `nginx/default.conf`:**
- `proxy_buffering off;` and `proxy_set_header X-Accel-Buffering no;` on `/api/public/chat/*` to allow progressive SSE token delivery without proxy buffering.
- `real_ip_header CF-Connecting-IP;` to extract true visitor IP addresses behind Cloudflare for rate limiting.
- Static caching for `/widget.js` (1 hour browser cache, stale-while-revalidate).

### B. Cloudflare Edge Rules
1. **SSL/TLS Mode:** Set to `Full (strict)`. Install Cloudflare Origin CA certificate on Nginx.
2. **Always Use HTTPS:** Enabled.
3. **WAF Rate Limiting Rule:**
   - Path: `/api/public/chat/*`
   - Key: `IP Address`
   - Rate: `40 requests per 1 minute`
   - Action: `Managed Challenge` or `Block with 429`
4. **Caching Rules:**
   - URL: `*your-domain.com/widget.js` -> Cache Level: `Cache Everything`, Edge TTL: `4 hours`.
   - URL: `*your-domain.com/api/public/chat/*` -> Cache Level: `Bypass`. (Dynamic SSE must never be cached).

---

## 7. Automated Backups & Safe Non-Destructive Recovery

### A. Automated Daily Backup Script
Use the provided [scripts/backup_postgres.sh](file:///d:/ollama/scripts/backup_postgres.sh):
- Creates a timestamped PostgreSQL custom dump (`pg_dump -F c`).
- Verifies artifact size > 1KB.
- Stores backups in `/var/backups/ess_chatbot` with 0700 permissions.
- Applies 14-day retention without deleting the last remaining backup.

Add to host crontab (`sudo crontab -e`):
```cron
0 2 * * * /opt/ess-chatbot/scripts/backup_postgres.sh >> /var/log/ess_backup.log 2>&1
```

### B. Safe, Non-Destructive Restoration Procedure
**NEVER use `dropdb` on the production database.**  
Always restore into a separate verification database (`ess_chatbot_verify`) first:

```bash
# Execute the non-destructive verification script
./scripts/restore_verify.sh /var/backups/ess_chatbot/ess_chatbot_20261012_020000.dump
```

**The script automatically:**
1. Restores the dump into an isolated database `ess_chatbot_verify`.
2. Compares record counts between live and restored databases.
3. Verifies pgvector extension and indexes.
4. Cleans up the temporary database without altering the live production database.

---

## 8. Smoke Testing Checklist Before Public Traffic

- [ ] `/api/health` returns `HTTP 200 OK` with `status: "healthy"` and `database: "connected"`.
- [ ] Embedding widget loads from `/widget.js` on allowed domains and receives tokens via SSE.
- [ ] Unauthorized origins receive `HTTP 403 Forbidden`.
- [ ] Conversational phone numbers and leads are saved in PostgreSQL `Lead` table.
- [ ] Webhook deliveries receive HMAC SHA-256 signatures in `X-Webhook-Signature`.
- [ ] Backup script runs successfully and artifact is verified via `restore_verify.sh`.
