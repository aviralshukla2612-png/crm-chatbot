import fs from "fs";
import path from "path";

function resolveSettingsFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "platform_settings.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "platform_settings.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const SETTINGS_FILE = resolveSettingsFile();

const DEFAULT_SETTINGS = {
  aiProvider: process.env.DEFAULT_AI_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "ollama"),
  ollamaUrl: process.env.OLLAMA_URL || "http://ollama:11434",
  chatModel: process.env.CHAT_MODEL || "llama3.2:1b",
  embeddingModel: process.env.EMBED_MODEL || "nomic-embed-text",
  postgresHost: process.env.POSTGRES_HOST || "postgres:5432",
  postgresDb: process.env.POSTGRES_DB || "ess_chatbot",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  groqApiKey: process.env.GROQ_API_KEY || "",
  leadWebhookUrl: process.env.LEAD_WEBHOOK_URL || "",
  updatedAt: new Date().toISOString(),
};

let cachedSettings = null;

export function getPlatformSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return cachedSettings;
    }
  } catch (err) {
    console.warn("[SETTINGS_STORE] Failed to read platform_settings.json, using defaults:", err.message);
  }
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

export function savePlatformSettings(newSettings) {
  try {
    const current = getPlatformSettings();
    const updated = {
      ...current,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf8");
    cachedSettings = updated;

    // Apply directly into running process.env so subsequent requests pick it up immediately
    if (updated.aiProvider) process.env.DEFAULT_AI_PROVIDER = updated.aiProvider;
    if (updated.ollamaUrl) process.env.OLLAMA_URL = updated.ollamaUrl;
    if (updated.chatModel) process.env.CHAT_MODEL = updated.chatModel;
    if (updated.embeddingModel) process.env.EMBED_MODEL = updated.embeddingModel;
    if (updated.groqModel) process.env.GROQ_MODEL = updated.groqModel;
    if (updated.groqApiKey) process.env.GROQ_API_KEY = updated.groqApiKey;
    if (updated.leadWebhookUrl) process.env.LEAD_WEBHOOK_URL = updated.leadWebhookUrl;

    return { ok: true, settings: updated };
  } catch (err) {
    console.error("[SETTINGS_STORE_ERROR] Failed to save platform settings:", err);
    return { ok: false, error: err.message };
  }
}
