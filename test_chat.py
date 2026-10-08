import requests
import time
import json

url = "http://localhost:8000/api/chat"
query = "Who are the owners of Emperor Smart Solutions and how much does an e-commerce website cost?"

print(f"Querying: {query}")
start_time = time.time()

try:
    response = requests.post(url, json={"message": query, "history": []}, timeout=60)
    latency = round(time.time() - start_time, 2)
    print(f"Status: {response.status_code} (took {latency}s)")
    data = response.json()
    print("\n--- AI RESPONSE ---")
    print(data.get("response"))
    print("\n--- SOURCES RETRIEVED FROM PGVECTOR ---")
    for s in data.get("sources", []):
        print(f"- {s['title']} [{s['category']}] (distance: {s['distance']:.4f})")
except Exception as e:
    print(f"Error: {e}")
