from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager

from db import init_db
from ingest import ingest_document
from rag import generate_rag_response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema on startup
    init_db()
    yield

app = FastAPI(
    title="AI Sales Bot - RAG API",
    description="FastAPI Backend for Ollama + pgvector Sales Executive Agent",
    version="1.0.0",
    lifespan=lifespan
)

class IngestRequest(BaseModel):
    title: str
    category: str
    content: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

@app.get("/")
def serve_home():
    return FileResponse("index.html")

@app.post("/api/ingest")
async def ingest_endpoint(payload: IngestRequest):
    try:
        res = await ingest_document(payload.title, payload.category, payload.content)
        return res
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    try:
        res = await generate_rag_response(payload.message, [h.model_dump() for h in payload.history])
        return res
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
