import os
import time
import psycopg2
from pgvector.psycopg2 import register_vector

DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "rag_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgrespassword")

def get_connection():
    max_retries = 5
    for i in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS
            )
            register_vector(conn)
            return conn
        except Exception as e:
            print(f"Waiting for database connection... ({i+1}/{max_retries}) - {e}")
            time.sleep(2)
    raise Exception("Could not connect to PostgreSQL database.")

def init_db():
    conn = get_connection()
    cur = conn.cursor()
    
    # 1. Enable pgvector extension
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    
    # 2. Create knowledge table
    # Using 1024 dimensions (compatible with bge-large/nomic or Qwen embeddings)
    # We will make dimension flexible or use 1024 / 768
    cur.execute("""
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            category VARCHAR(100),
            content TEXT NOT NULL,
            embedding VECTOR(768),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 3. Create HNSW index for sub-10ms approximate nearest neighbor vector search
    cur.execute("""
        CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx 
        ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """)
    
    conn.commit()
    cur.close()
    conn.close()
    print("Database, vector table, and HNSW index initialized successfully.")
