#!/usr/bin/env bash
# ========================================================
# NexusAI / Ollama Chatbot - 1-Command Docker Deployment
# ========================================================
set -e

# Change to script directory
cd "$(dirname "$0")"

echo "========================================================"
echo "🚀 [1/4] Pulling latest code from Git..."
echo "========================================================"
if [ -d ".git" ]; then
    git pull origin main || echo "⚠️ Git pull skipped or failed, proceeding with current files."
fi

echo ""
echo "========================================================"
echo "🐳 [2/4] Building and launching Docker containers..."
echo "========================================================"
# Ensure data directory exists on host
mkdir -p frontend/data

# Build and start services in background
docker compose up -d --build --remove-orphans

echo ""
echo "========================================================"
echo "⏳ [3/4] Waiting for Ollama engine to initialize..."
echo "========================================================"
RETRIES=0
MAX_RETRIES=30
until docker compose exec -T ollama ollama list > /dev/null 2>&1 || [ $RETRIES -eq $MAX_RETRIES ]; do
    echo "Waiting for Ollama API... ($((RETRIES+1))/$MAX_RETRIES)"
    sleep 2
    RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo "❌ Ollama took too long to start. Please check 'docker compose logs ollama'."
    exit 1
fi
echo "✅ Ollama is online!"

echo ""
echo "========================================================"
echo "📦 [4/4] Pre-pulling AI models inside Ollama container..."
echo "========================================================"
# Default fast models
CHAT_MODEL=${CHAT_MODEL:-llama3.2:1b}
EMBED_MODEL=nomic-embed-text

echo "-> Pulling Chat Model: $CHAT_MODEL"
docker compose exec -T ollama ollama pull "$CHAT_MODEL"

echo "-> Pulling Embedding Model: $EMBED_MODEL"
docker compose exec -T ollama ollama pull "$EMBED_MODEL"

echo ""
echo "========================================================"
echo "🎉 DEPLOYMENT COMPLETE! All services are active."
echo "========================================================"
echo "  🌐 Frontend App & Widget:  http://localhost:3300"
echo "  🧠 Ollama API:             http://localhost:11434"
echo "  ⚡ FastAPI RAG Backend:    http://localhost:8008"
echo "  💻 Open-WebUI Dashboard:   http://localhost:3880"
echo "========================================================"
echo "View live logs with: docker compose logs -f"
