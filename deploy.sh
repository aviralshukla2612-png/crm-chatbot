#!/usr/bin/env bash
# =================================================================
# ESS CHATBOT SaaS — SECURE 1-COMMAND DOCKER DEPLOYMENT
# =================================================================
set -eo pipefail

cd "$(dirname "$0")"

echo "========================================================"
echo "🚀 [1/5] Pre-Flight Checks & Configuration Validation..."
echo "========================================================"

if [ ! -f ".env" ]; then
    echo "⚠️ Warning: .env file not found. Copying .env.example..."
    cp .env.example .env
    echo "Created .env with default placeholders. Please review .env credentials before production use."
fi

# Source environment variables safely
set -a
[ -f .env ] && . .env
set +a

POSTGRES_DB="${POSTGRES_DB:-ess_chatbot}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [ -d ".git" ]; then
    echo "Checking Git updates (preserving local changes)..."
    git pull origin main || echo "⚠️ Git pull skipped or failed, proceeding with current files."
fi

echo ""
echo "========================================================"
echo "🐳 [2/5] Building & Launching Docker Services..."
echo "========================================================"
mkdir -p frontend/data

docker compose up -d --build --remove-orphans

echo ""
echo "========================================================"
echo "⏳ [3/5] Waiting for PostgreSQL & pgvector readiness..."
echo "========================================================"
RETRIES=0
MAX_RETRIES=20
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1 || [ $RETRIES -eq $MAX_RETRIES ]; do
    echo "Waiting for PostgreSQL database... ($((RETRIES+1))/$MAX_RETRIES)"
    sleep 2
    RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo "❌ PostgreSQL took too long to start. Please check 'docker compose logs postgres'."
    exit 1
fi
echo "✅ PostgreSQL is online and accepting connections!"

echo ""
echo "========================================================"
echo "📦 [4/5] Executing Idempotent Schema & Data Migration..."
echo "========================================================"
if [ -f "frontend/data/idempotent_migration.sql" ]; then
    echo "Applying idempotent_migration.sql to database '${POSTGRES_DB}'..."
    docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < frontend/data/idempotent_migration.sql
    echo "✅ Database schema, pgvector HNSW index, and tenant records applied."
else
    echo "⚠️ frontend/data/idempotent_migration.sql not found, skipping SQL migration."
fi

echo ""
echo "========================================================"
echo "🧠 [5/5] Pre-pulling AI Models (if Ollama provider enabled)..."
echo "========================================================"
if [ "${DEFAULT_AI_PROVIDER}" = "ollama" ]; then
    CHAT_MODEL=${CHAT_MODEL:-llama3.2:1b}
    echo "-> Pre-pulling Chat Model into Ollama: $CHAT_MODEL"
    docker compose exec -T ollama ollama pull "$CHAT_MODEL" || true
else
    echo "AI Provider is set to '${DEFAULT_AI_PROVIDER:-groq}'. Skipping local Ollama model pre-pull."
fi

echo ""
echo "========================================================"
echo "🎉 DEPLOYMENT COMPLETE! All services are active."
echo "========================================================"
echo "  🌐 Frontend App & Widget:  http://127.0.0.1:3300"
echo "  🏥 Health Check:           http://127.0.0.1:3300/api/health"
echo "  🐘 PostgreSQL Database:    127.0.0.1:5432 (Internal Docker Network)"
echo "========================================================"
echo "To view live logs: docker compose logs -f"
