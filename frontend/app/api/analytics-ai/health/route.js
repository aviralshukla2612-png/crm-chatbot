import { NextResponse } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/auth/guard";
import { isDbConnected } from "@/lib/db/dbPool";

export async function GET(request) {
  try {
    const principal = await getAuthenticatedPrincipal(request);
    if (!principal || !principal.authenticated) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
    const configuredModel = process.env.CHAT_MODEL || "llama3.2:1b";

    let ollamaStatus = "UNREACHABLE";
    let availableModels = [];

    try {
      const res = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        ollamaStatus = "HEALTHY";
        availableModels = (data.models || []).map((m) => m.name);
      }
    } catch {
      ollamaStatus = "OFFLINE_OR_UNREACHABLE";
    }

    return NextResponse.json({
      success: true,
      status: "OPERATIONAL",
      service: "Emperor Analytics AI Core",
      timestamp: new Date().toISOString(),
      database: {
        connected: isDbConnected(),
        mode: isDbConnected() ? "PostgreSQL Pool" : "Local Resilient Store",
      },
      aiEngine: {
        defaultProvider: process.env.DEFAULT_AI_PROVIDER || "ollama",
        ollamaEndpoint: ollamaUrl,
        configuredModel,
        ollamaStatus,
        availableModels,
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
