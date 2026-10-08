import os
import httpx
from langchain_text_splitters import RecursiveCharacterTextSplitter
from db import get_connection

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

async def get_embedding(text: str) -> list:
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(
            f"{OLLAMA_URL}/api/embed",
            json={"model": EMBED_MODEL, "input": text}
        )
        if res.status_code == 200:
            embeddings = res.json().get("embeddings", [])
            return embeddings[0] if embeddings else []
        else:
            raise Exception(f"Ollama embedding error: {res.text}")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    return splitter.split_text(text)

async def ingest_document(title: str, category: str, content: str):
    chunks = chunk_text(content)
    if not chunks:
        return {"status": "error", "message": "Content is empty"}
        
    # Get first embedding to check dimensions dynamically
    first_emb = await get_embedding(chunks[0])
    emb_dim = len(first_emb)
    
    conn = get_connection()
    cur = conn.cursor()
    
    saved_count = 0
    for chunk in chunks:
        emb = await get_embedding(chunk)
        if emb:
            cur.execute(
                "INSERT INTO knowledge_chunks (title, category, content, embedding) VALUES (%s, %s, %s, %s);",
                (title, category, chunk, emb)
            )
            saved_count += 1
            
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "success", "title": title, "chunks_stored": saved_count, "embedding_dimension": emb_dim}
