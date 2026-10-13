# ESS AI Sales Agent: Deployment, Monitoring & Rollback Guide

> **Stack:** Next.js 16 (App Router) + Node.js 24 + PostgreSQL (pgvector) + Ollama  
> **Environment Configuration:** `.env` / System Environment Variables  

---

## 1. Staging & Production Deployment Workflow

### Pre-Deployment Verification Checklist
1. Run all unit, security, and integration tests:
   ```bash
   npm test
   ```
2. Run continuous AI benchmark evaluation:
   ```bash
   node scripts/run_ai_evaluation.js
   ```
3. Run Next.js production build:
   ```bash
   cd frontend && npm run build
   ```

### Production Start Commands
```bash
# Build production bundle
npm run build --prefix frontend

# Start Next.js production server
npm run start --prefix frontend
```

---

## 2. Environment Variables Specification

| Variable | Required? | Example / Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes (Prod) | `postgresql://user:pass@localhost:5432/ess_db` | PostgreSQL connection string |
| `OLLAMA_BASE_URL` | Optional | `http://localhost:11434` | Ollama runtime endpoint |
| `OLLAMA_MODEL` | Optional | `llama3.2:1b` (or fine-tuned adapter) | Active LLM model identifier |
| `GROQ_API_KEY` | Optional | `gsk_...` | High-speed hosted fallback inference |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://chat.emperorsmartsolutions.com` | Public origin for widget verification |
| `WEBHOOK_SECRET` | Optional | `whsec_...` | Secret key for signing outgoing webhooks |

---

## 3. Rollback Procedure

### Zero-Downtime Model Rollback
If a newly deployed fine-tuned model checkpoint exhibits regression or latency spikes:

1. Update the active model environment variable:
   ```bash
   export OLLAMA_MODEL="llama3.2:1b"
   ```
2. Restart or reload the Next.js process:
   ```bash
   pm2 restart ess-frontend
   # Or in Docker:
   docker restart ess-app
   ```
3. Because conversation state, qualification logic, and lead extraction run in deterministic JavaScript (`salesFlowManager.js`), the chatbot continues to capture leads without interruption even during model restarts or fallback switching.

### Database Migration Rollback
The database migration script `frontend/data/idempotent_migration.sql` uses non-destructive `IF NOT EXISTS` and `ON CONFLICT DO NOTHING/UPDATE` statements, allowing clean forward migrations and backwards schema compatibility.
