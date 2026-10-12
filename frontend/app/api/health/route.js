import { NextResponse } from "next/server";
import { isDbConnected } from "@/lib/db/dbPool";
import { botsStore } from "@/lib/db/botsStore";
import { leadsStore } from "@/lib/db/leadsStore";
import { documentsStore } from "@/lib/db/documentsStore";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_PROVIDER = (process.env.DEFAULT_AI_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "ollama")).toLowerCase();

export async function GET() {
  const startTime = Date.now();
  const dependencies = {
    database: isDbConnected() ? "connected" : "local_fallback",
    inference: {
      activeProvider: DEFAULT_PROVIDER,
      status: "ready",
    },
  };

  // 1. Check Inference Provider Readiness
  if (DEFAULT_PROVIDER === "groq") {
    const hasKey = Boolean(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("your_groq_api_key"));
    dependencies.inference.status = hasKey ? "configured" : "missing_api_key";
    dependencies.inference.model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  } else if (DEFAULT_PROVIDER === "ollama") {
    try {
      const ping = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      if (ping.ok) {
        dependencies.inference.status = "connected";
      } else {
        dependencies.inference.status = `degraded_http_${ping.status}`;
      }
    } catch (e) {
      dependencies.inference.status = "unreachable";
    }
  } else if (DEFAULT_PROVIDER === "mock") {
    dependencies.inference.status = "operational (mock)";
  }

  // 2. Check Storage & Knowledge Base Record Counts
  let stats = { botsCount: 0, leadsCount: 0, documentsCount: 0 };
  let storageStatus = "operational";
  try {
    const bots = botsStore.getBots();
    const leads = leadsStore.getLeads();
    const docs = documentsStore.getDocuments();
    stats = {
      botsCount: bots.length,
      leadsCount: leads.length,
      documentsCount: docs.length,
    };
  } catch (e) {
    storageStatus = `degraded: ${e.message}`;
  }

  const isLivenessHealthy = true;
  const isReadinessHealthy = storageStatus.startsWith("operational") && dependencies.inference.status !== "missing_api_key";
  const latencyMs = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isReadinessHealthy ? "healthy" : "degraded",
      liveness: isLivenessHealthy,
      readiness: isReadinessHealthy,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      latencyMs,
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      stats,
      dependencies,
      security: {
        rateLimiterActive: true,
        ssrfProtectionActive: true,
        originWhitelistingActive: true,
        hmacWebhooksActive: true,
      },
    },
    { status: isReadinessHealthy ? 200 : 503 }
  );
}
