# STAGING DEPLOYMENT, ROLLBACK PROCEDURES & CONFIGURATION

## 1. Containerized Stack Topology (`docker-compose.yml`)

The production SaaS runs across 4 coordinated Docker containers on the private bridge `ess_internal`:
- `ess-frontend`: Next.js 16 Web Application & API (Host Port: `3300:3000`)
- `ess-postgres`: PostgreSQL 16 with `pgvector` extension (Internal Port: `5432`)
- `ess-ollama`: Self-hosted LLM runtime with `llama3.2:1b` (Internal Port: `11434`)
- `ess-redis`: Redis 7 Alpine distributed cache & rate limiter (Internal Port: `6379`)

## 2. Deployment Command
To deploy the SaaS stack:
```bash
# 1. Pull latest git changes
git pull origin main

# 2. Rebuild and launch containers in background
docker compose up -d --build

# 3. Verify health of all services
docker compose ps
curl -i http://127.0.0.1:3300/api/health
```

## 3. Rollback Procedure
If a production release encounters critical errors:
```bash
# 1. Revert to previous git commit
git checkout HEAD~1

# 2. Redeploy previous image
docker compose up -d --build frontend

# 3. If database state was corrupted, restore from latest verified backup
./scripts/restore_verify.sh /var/backups/ess_chatbot_latest.sql.gz
```

## 4. Required Environment Variables

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:<pass>@postgres:5432/ess_chatbot` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `SESSION_SECRET` | Cryptographic session signing key | *32+ character random secret* |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret | `...` |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay Webhook Signing Secret | *Random secret* |
| `WHATSAPP_VERIFY_TOKEN` | Meta Webhook Verify Token | *Custom string* |
| `WHATSAPP_APP_SECRET` | Meta App Secret for signature checks | *From Meta Developer Portal* |
| `WHATSAPP_API_TOKEN` | Meta Graph API System User Token | `EAA...` |
| `GROQ_API_KEY` | Primary LLM API Key | `gsk_...` |
