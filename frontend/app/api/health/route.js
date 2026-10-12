import { NextResponse } from "next/server";
import { botsStore } from "@/lib/db/botsStore";
import { leadsStore } from "@/lib/db/leadsStore";
import { documentsStore } from "@/lib/db/documentsStore";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

export async function GET() {
  const startTime = Date.now();
  const checks = {
    app: "healthy",
    ollama: "unknown",
    storage: "unknown",
  };

  // 1. Check Ollama Connectivity
  try {
    const ollamaPing = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    if (ollamaPing.ok) {
      const data = await ollamaPing.json();
      checks.ollama = "connected";
      checks.loadedModels = (data.models || []).map((m) => m.name);
    } else {
      checks.ollama = `degraded (HTTP ${ollamaPing.status})`;
    }
  } catch (e) {
    checks.ollama = `disconnected (${e.message})`;
  }

  // 2. Check Storage & Knowledge Base
  try {
    const bots = botsStore.getBots();
    const leads = leadsStore.getLeads();
    const docs = documentsStore.getDocuments();
    checks.storage = "operational";
    checks.stats = {
      botsCount: bots.length,
      leadsCount: leads.length,
      documentsCount: docs.length,
    };
  } catch (e) {
    checks.storage = `degraded (${e.message})`;
  }

  const isHealthy = checks.app === "healthy" && checks.storage === "operational";
  const latencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      latencyMs,
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      features: {
        sseStreaming: true,
        tokenBucketRateLimiting: true,
        originDomainLocking: true,
        antiHallucinationGrounding: true,
        salesConsultativeLeadCapture: true,
        ssrfProtection: true,
      },
      checks,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
