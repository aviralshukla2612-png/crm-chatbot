import fs from "fs";
import path from "path";
import { queryDb } from "./dbPool.js";

function resolveDataFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "bots.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "bots.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const DATA_FILE = resolveDataFile();
const DEFAULT_ORG_ID = "org_ess_default";

// Default seed bot matching user's created bot 'aa'
const DEFAULT_BOTS = [
  {
    id: "bot_aa",
    organizationId: DEFAULT_ORG_ID,
    name: "aa",
    company: "Emperor Smart Solutions",
    description: "Official AI Sales Representative for Emperor Smart Solutions.",
    avatar: "🤖",
    status: "Active",
    primaryColor: "#4f46e5",
    welcomeMessage: "Hello! I am Emperor AI, your AI Sales Consultant. How can I help you today?",
    placeholderText: "Type a message...",
    launcherPosition: "bottom-right",
    brandingEnabled: true,
    personality: "Helpful & Professional",
    systemPrompt: "You are Emperor AI, the official AI Sales Consultant for Emperor Smart Solutions. Assist visitors with Web, Mobile, ERP, and AI solutions.",
    responseLength: "Balanced",
    instructions: "Be courteous, clear, and direct.",
    collectLeads: true,
    allowedDomains: ["*"],
    conversationsCount: 0,
    questionsCount: 0,
    leadsCount: 0,
    sourcesCount: 0,
    createdDate: "Oct 9, 2026",
    lastActive: "Just now",
    documents: [],
  },
];

let memoryBotsCache = null;

function loadBotsFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_BOTS, null, 2), "utf8");
      memoryBotsCache = [...DEFAULT_BOTS];
      return memoryBotsCache;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryBotsCache = parsed.map((b) => ({
        ...b,
        organizationId: b.organizationId || DEFAULT_ORG_ID,
      }));
      return memoryBotsCache;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
    memoryBotsCache = [];
    return memoryBotsCache;
  } catch (err) {
    console.error("Error reading bots store:", err);
    return memoryBotsCache || DEFAULT_BOTS;
  }
}

function saveBotsToDisk(bots) {
  try {
    memoryBotsCache = bots;
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(bots, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving bots store:", err);
  }
}

export const botsStore = {
  /**
   * List bots scoped strictly by organizationId.
   */
  async getBotsAsync(organizationId) {
    if (organizationId) {
      const dbRes = await queryDb(
        'SELECT * FROM "Bot" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC;',
        [organizationId]
      );
      if (dbRes.ok && dbRes.rows.length > 0) {
        return dbRes.rows;
      }
    } else {
      const dbRes = await queryDb(
        'SELECT * FROM "Bot" ORDER BY "createdAt" DESC;'
      );
      if (dbRes.ok && dbRes.rows.length > 0) {
        return dbRes.rows;
      }
    }
    const all = loadBotsFromDisk();
    if (!organizationId) return all;
    return all.filter((b) => b.organizationId === organizationId);
  },

  getBots(organizationId) {
    const all = loadBotsFromDisk();
    if (!organizationId) return all;
    return all.filter((b) => b.organizationId === organizationId);
  },

  /**
   * Retrieve a bot by ID or Name, enforcing organizationId tenant boundary when provided.
   * Returns null if no exact matching bot is found. Never falls back to arbitrary bots.
   */
  getBot(idOrName, organizationId = null) {
    if (!idOrName) return null;
    const query = String(idOrName).trim();
    if (!query) return null;

    const bots = loadBotsFromDisk();
    const queryLower = query.toLowerCase();

    // Filter to tenant if organizationId is specified
    const scopedBots = organizationId
      ? bots.filter((b) => b.organizationId === organizationId)
      : bots;

    // 1. Exact ID match
    let match = scopedBots.find((b) => b.id === query);
    if (match) return match;

    // 2. Case-insensitive ID match
    match = scopedBots.find((b) => b.id && b.id.toLowerCase() === queryLower);
    if (match) return match;

    // 3. Exact Name match (case-insensitive)
    match = scopedBots.find((b) => b.name && b.name.trim().toLowerCase() === queryLower);
    if (match) return match;

    // Strict: Never fall back to another tenant's bot or the first bot in the store
    return null;
  },

  /**
   * Upsert a bot with explicit tenant scoping.
   */
  upsertBot(botData, targetOrgId = null) {
    const bots = loadBotsFromDisk();
    const id = botData.id || `bot_${Date.now()}`;
    const orgId = targetOrgId || botData.organizationId || DEFAULT_ORG_ID;

    const existingIndex = bots.findIndex(
      (b) => b.id === id && (!targetOrgId || b.organizationId === orgId)
    );

    const merged = {
      id,
      organizationId: orgId,
      status: "Active",
      conversationsCount: 0,
      questionsCount: 0,
      leadsCount: 0,
      sourcesCount: botData.documents?.length || 0,
      createdDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      lastActive: "Just now",
      primaryColor: "#4f46e5",
      welcomeMessage: `Hello! I am ${botData.name || "AI Assistant"}. How can I help you today?`,
      launcherPosition: "bottom-right",
      brandingEnabled: true,
      allowedDomains: ["*"],
      ...botData,
    };

    if (existingIndex >= 0) {
      bots[existingIndex] = { ...bots[existingIndex], ...merged };
    } else {
      bots.unshift(merged);
    }

    saveBotsToDisk(bots);

    // Sync to PostgreSQL
    queryDb(
      `INSERT INTO "Bot" ("id", "organizationId", "name", "description", "primaryColor", "status", "systemPrompt", "welcomeMessage", "allowedDomains")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ("id") DO UPDATE SET
         "name" = EXCLUDED."name",
         "description" = EXCLUDED."description",
         "primaryColor" = EXCLUDED."primaryColor",
         "status" = EXCLUDED."status",
         "systemPrompt" = EXCLUDED."systemPrompt",
         "welcomeMessage" = EXCLUDED."welcomeMessage",
         "allowedDomains" = EXCLUDED."allowedDomains",
         "updatedAt" = CURRENT_TIMESTAMP;`,
      [
        id,
        orgId,
        merged.name || "AI Assistant",
        merged.description || null,
        merged.primaryColor || "#4f46e5",
        merged.status || "Active",
        merged.systemPrompt || null,
        merged.welcomeMessage || "Hello!",
        Array.isArray(merged.allowedDomains) ? merged.allowedDomains : ["*"],
      ]
    ).catch(() => {});

    try {
      const { sseBroker } = require("./sseBroker");
      sseBroker.broadcast("bot_updated", merged);
    } catch (e) {}

    return merged;
  },

  deleteBot(id, organizationId = null) {
    const bots = loadBotsFromDisk();
    const filtered = bots.filter((b) => {
      if (b.id !== id && b.name?.toLowerCase() !== id?.toLowerCase()) return true;
      if (organizationId && b.organizationId !== organizationId) return true; // keep if different tenant
      return false;
    });

    saveBotsToDisk(filtered);

    if (organizationId) {
      queryDb('DELETE FROM "Bot" WHERE "id" = $1 AND "organizationId" = $2;', [id, organizationId]).catch(() => {});
    } else {
      queryDb('DELETE FROM "Bot" WHERE "id" = $1;', [id]).catch(() => {});
    }

    try {
      const { sseBroker } = require("./sseBroker");
      sseBroker.broadcast("bot_deleted", { id });
    } catch (e) {}
    return { success: true };
  },
};
