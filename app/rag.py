import os
import httpx
from db import get_connection
from ingest import get_embedding

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3.2:1b")

SALES_SYSTEM_PROMPT = """You are an expert Senior IT Sales Executive for Emperor Smart Solutions, founded by Karan Makwana and Yash Sharma.

STRICT GUARDRAILS & RULES:
1. CURRENCY: All quotes MUST be strictly in Indian Rupees (₹ / INR).
2. STRICT ZERO-DISCOUNT POLICY: You have NO authority to provide or promise discounts. If the user asks for ANY discount or price drop, you MUST explicitly decline and state that all commercial discounts require direct approval from founders Karan Makwana & Yash Sharma, offering to connect them.
3. KNOWLEDGE BASE ACCURACY: Only quote prices found in the KNOWLEDGE BASE below. Never invent numbers.
4. TAXES: Always mention that GST (18%) is applicable extra on all commercial invoices.
5. ADS BUDGET: Clarify that advertising budgets for Meta/Google Ads are paid directly to platforms and are separate from management fees.
6. TERMS & SUPPORT: Standard milestones are 40% advance, 40% milestone, 20% on delivery. Every project includes 30 days of free post-launch support.
7. CONCISE & DIRECT: Answer the specific query immediately in under 100 words with bullet points.
8. CALL TO ACTION: Offer to schedule a consultation with founders Karan Makwana or Yash Sharma.

---
EMPEROR SMART SOLUTIONS KNOWLEDGE BASE:
{context}
---
"""

async def search_similar_chunks(user_query: str, top_k: int = 2) -> list:
    query_embedding = await get_embedding(user_query)
    if not query_embedding:
        return []
        
    conn = get_connection()
    cur = conn.cursor()
    
    # Cosine similarity search using pgvector operator <=>
    cur.execute(
        """
        SELECT title, category, content, (embedding <=> %s::vector) AS distance
        FROM knowledge_chunks
        ORDER BY distance ASC
        LIMIT %s;
        """,
        (query_embedding, top_k)
    )
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    matched_chunks = []
    for row in results:
        matched_chunks.append({
            "title": row[0],
            "category": row[1],
            "content": row[2],
            "distance": float(row[3])
        })
    return matched_chunks

async def generate_rag_response(user_query: str, chat_history: list = None) -> dict:
    # 1. Retrieve top relevant knowledge chunks
    matched_chunks = await search_similar_chunks(user_query, top_k=2)
    
    context_text = "\n\n".join([f"[{c['title']} - {c['category']}]:\n{c['content']}" for c in matched_chunks])
    if not context_text:
        context_text = "Emperor Smart Solutions founders: Karan Makwana & Yash Sharma. Provide professional IT consultative proposal."
        
    system_prompt = SALES_SYSTEM_PROMPT.format(context=context_text)
    
    # 2. Build messages array for Ollama Chat API
    messages = [{"role": "system", "content": system_prompt}]
    if chat_history:
        for msg in chat_history[-4:]:  # keep last 2 turns
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
    messages.append({"role": "user", "content": user_query})
    
    # 3. Call Ollama Chat API with optimized CPU parameters
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "num_thread": 4,
                    "num_ctx": 1536,
                    "num_predict": 160,
                    "temperature": 0.4,
                    "stop": [
                        "\nUser:",
                        "\nUser ",
                        "User:",
                        "\nHuman:",
                        "Human:",
                        "\nAssistant:",
                        "Assistant:",
                        "\nYou:",
                        "<|eot_id|>",
                        "<|im_end|>",
                        "<|end_of_text|>",
                    ]
                }
            }
        )
        if res.status_code == 200:
            llm_reply = res.json().get("message", {}).get("content", "")
            # Truncate any hallucinated turns if leaked
            for marker in ["\nUser:", "\nHuman:", "\nAssistant:", "\nYou:"]:
                if marker in llm_reply:
                    llm_reply = llm_reply.split(marker)[0].strip()
            return {
                "response": llm_reply,
                "sources": matched_chunks
            }
        else:
            raise Exception(f"Ollama generation error: {res.text}")
