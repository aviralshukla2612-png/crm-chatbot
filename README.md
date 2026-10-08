# ESS Chatbot (AI Sales Executive)

An autonomous AI Sales Executive and RAG (Retrieval-Augmented Generation) backend tailored for IT services, pricing, and consultation.

## 🚀 Overview

- **Stack**: FastAPI, Ollama (Llama 3.2 / Nomic Embed Text), PostgreSQL with `pgvector`, Docker Compose
- **Features**:
  - Contextual RAG search using cosine similarity on vector embeddings
  - Automated knowledge ingestion for IT service offerings, ERP/CRM modules, and pricing
  - Conversational sales consultation UI and REST API
  - Containerized deployment ready for local and production setups

## 🛠️ Tech Stack

- **FastAPI**: Backend REST API & web service
- **PostgreSQL + pgvector**: Vector database for semantic document search
- **Ollama**: Local LLM and embedding generation (`nomic-embed-text` & `llama3.2:1b`)
- **Docker Compose**: Multi-container orchestration (`fastapi`, `postgres`, `ollama`, `open-webui`)

## ⚡ Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Git

### 2. Run the Stack
```bash
docker compose up -d
```

### 3. Ingest Knowledge Base
```bash
docker compose exec fastapi python ingest_emperor.py
```

### 4. Access the Services
- **Chat Web UI / API**: [http://localhost:8000](http://localhost:8000)
- **Open-WebUI**: [http://localhost:3080](http://localhost:3080)
- **Ollama API**: [http://localhost:11434](http://localhost:11434)
