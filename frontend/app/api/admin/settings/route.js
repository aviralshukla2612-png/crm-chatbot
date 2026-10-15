import { NextResponse } from "next/server";
import { getPlatformSettings, savePlatformSettings } from "@/lib/db/settingsStore";
import { queryDb } from "@/lib/db/dbPool";

export async function GET() {
  const settings = getPlatformSettings();

  // Test live status of PostgreSQL
  let dbStatus = "disconnected";
  let dbLatencyMs = 0;
  const dbStart = Date.now();
  try {
    const res = await queryDb("SELECT 1 AS live;");
    if (res.ok) {
      dbStatus = "connected";
      dbLatencyMs = Date.now() - dbStart;
    }
  } catch (err) {
    dbStatus = "error: " + err.message;
  }

  // Test live status of Ollama & fetch available models
  let ollamaStatus = "unreachable";
  let availableModels = [];
  const ollamaUrl = settings.ollamaUrl || process.env.OLLAMA_URL || "http://ollama:11434";
  try {
    const tagsRes = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (tagsRes.ok) {
      const data = await tagsRes.json();
      ollamaStatus = "connected";
      availableModels = (data.models || []).map((m) => m.name);
    } else {
      ollamaStatus = `http_${tagsRes.status}`;
    }
  } catch (err) {
    // If inside docker or local dev
    ollamaStatus = "unreachable";
  }

  return NextResponse.json({
    ok: true,
    settings: {
      aiProvider: settings.aiProvider,
      ollamaUrl: settings.ollamaUrl,
      chatModel: settings.chatModel,
      embeddingModel: settings.embeddingModel,
      postgresHost: `${process.env.POSTGRES_HOST || "postgres"}:${process.env.POSTGRES_PORT || "5432"}`,
      postgresDb: process.env.POSTGRES_DB || "ess_chatbot",
      groqModel: settings.groqModel,
      groqApiKeyConfigured: Boolean(settings.groqApiKey && !settings.groqApiKey.includes("your_groq")),
      leadWebhookUrl: settings.leadWebhookUrl,
      updatedAt: settings.updatedAt,
    },
    liveDiagnostics: {
      database: {
        status: dbStatus,
        host: process.env.POSTGRES_HOST || "postgres",
        port: process.env.POSTGRES_PORT || "5432",
        database: process.env.POSTGRES_DB || "ess_chatbot",
        latencyMs: dbLatencyMs,
      },
      ollama: {
        status: ollamaStatus,
        url: ollamaUrl,
        availableModels,
      },
      activeProvider: settings.aiProvider,
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const result = savePlatformSettings(body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: "Settings saved successfully", settings: result.settings });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
