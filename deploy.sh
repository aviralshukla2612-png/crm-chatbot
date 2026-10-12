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
    echo "❌ [ERROR] Production '.env' file not found!" >&2
    echo "Creating .env from .env.example..." >&2
    cp .env.example .env
    echo "⚠️ Please edit .env with your real credentials (POSTGRES_PASSWORD, etc.) before running ./deploy.sh." >&2
    exit 1
fi

# Sanitize any Windows CRLF carriage returns in .env file
if command -v sed >/dev/null 2>&1; then
    sed -i 's/\r$//' .env 2>/dev/null || true
fi

# Safely load .env variables without executing shell commands or choking on comments
while IFS= read -r line || [ -n "$line" ]; do
    clean_line=$(echo "$line" | tr -d '\r')
    # Skip comments and empty lines
    case "$clean_line" in
        \#*|"") continue ;;
        *=*)
            key="${clean_line%%=*}"
            val="${clean_line#*=}"
            # Trim whitespace from key
            key=$(echo "$key" | xargs 2>/dev/null || echo "$key")
            # Strip enclosing double or single quotes from value
            val="${val%\"}"
            val="${val#\"}"
            val="${val%\'}"
            val="${val#\'}"
            export "$key"="$val"
            ;;
    esac
done < .env

# 1. Enforce strict database password validation (no default or placeholder passwords)
if [ -z "${POSTGRES_PASSWORD}" ]; then
    echo "❌ [FATAL] POSTGRES_PASSWORD is not set in .env!" >&2
    echo "Production requires an explicit, secure database password." >&2
    echo "Tip: Run 'openssl rand -hex 24' and set POSTGRES_PASSWORD=<generated_value> in .env." >&2
    exit 1
fi

if [ "${POSTGRES_PASSWORD}" = "postgrespassword" ] || \
   [ "${POSTGRES_PASSWORD}" = "your_strong_postgres_password_here" ] || \
   [ "${POSTGRES_PASSWORD}" = "your_secure_password_here" ] || \
   [ "${POSTGRES_PASSWORD}" = "password" ] || \
   [ "${POSTGRES_PASSWORD}" = "admin" ]; then
    echo "❌ [FATAL] Insecure default or placeholder POSTGRES_PASSWORD detected in .env!" >&2
    echo "Detected value: '${POSTGRES_PASSWORD}'" >&2
    echo "Please generate a strong, random password (e.g. 'openssl rand -hex 24') and update .env before deploying." >&2
    exit 1
fi

# 2. Enforce Groq API key validation if Groq is the selected inference provider
if [ "${DEFAULT_AI_PROVIDER:-groq}" = "groq" ]; then
    if [ -z "${GROQ_API_KEY}" ] || [[ "${GROQ_API_KEY}" == *"your_"* ]]; then
        echo "❌ [FATAL] DEFAULT_AI_PROVIDER is set to 'groq', but GROQ_API_KEY is empty or a placeholder!" >&2
        echo "Options:" >&2
        echo "  1) Set a valid GROQ_API_KEY in .env (get a free key at https://console.groq.com)" >&2
        echo "  2) OR set DEFAULT_AI_PROVIDER=ollama in .env to use local Ollama inference without Groq." >&2
        exit 1
    fi
fi

POSTGRES_DB="${POSTGRES_DB:-ess_chatbot}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [ -d ".git" ]; then
    echo "Checking Git updates (preserving local uncommitted changes)..."
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
MAX_RETRIES=25
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" > /dev/null 2>&1 || [ $RETRIES -eq $MAX_RETRIES ]; do
    echo "Waiting for PostgreSQL database... ($((RETRIES+1))/$MAX_RETRIES)"
    sleep 2
    RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo "❌ PostgreSQL took too long to start. Please check 'docker compose logs postgres'." >&2
    exit 1
fi
echo "✅ PostgreSQL is online and accepting connections!"

echo ""
echo "========================================================"
echo "📦 [4/5] Executing Idempotent Schema & Data Migration..."
echo "========================================================"
if [ -f "frontend/data/idempotent_migration.sql" ]; then
    echo "Applying idempotent_migration.sql to database '${POSTGRES_DB}'..."
    if ! docker compose exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < frontend/data/idempotent_migration.sql; then
        echo "❌ [ERROR] Database migration failed!" >&2
        exit 1
    fi
    echo "✅ Database schema, pgvector HNSW index, and tenant records applied successfully."
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
echo "🩺 Verifying Application Health Status..."
echo "========================================================"
sleep 5
HEALTH_OUTPUT=$(docker compose exec -T frontend wget -qO- http://127.0.0.1:3000/api/health 2>/dev/null || echo "HEALTH_CHECK_FAILED")

if [[ "${HEALTH_OUTPUT}" == *"healthy"* ]]; then
    echo "✅ Health check PASSED: Application is healthy and ready for traffic."
else
    echo "ℹ️ Health check response: ${HEALTH_OUTPUT}"
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
