import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "bots.json");

// Default seed bot matching user's created bot 'aa'
const DEFAULT_BOTS = [
  {
    id: "bot_aa",
    name: "aa",
    company: "My Organization",
    description: "Custom AI chatbot assistant.",
    avatar: "🤖",
    status: "Active",
    primaryColor: "#4f46e5",
    welcomeMessage: "Hello! I am aa, your custom AI assistant. How can I help you today?",
    placeholderText: "Type a message...",
    launcherPosition: "bottom-right",
    brandingEnabled: true,
    personality: "Helpful & Professional",
    systemPrompt: "You are aa, a helpful and polite customer assistant. Answer visitor inquiries accurately. Always be professional, concise, and helpful.",
    responseLength: "Balanced",
    instructions: "Be courteous, clear, and direct.",
    collectLeads: true,
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
      memoryBotsCache = parsed;
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
  getBots() {
    return loadBotsFromDisk();
  },

  getBot(idOrName) {
    if (!idOrName) return null;
    const bots = loadBotsFromDisk();
    const query = String(idOrName).trim().toLowerCase();

    // 1. Exact ID match
    let match = bots.find((b) => b.id === idOrName);
    if (match) return match;

    // 2. Case-insensitive ID match
    match = bots.find((b) => b.id && b.id.toLowerCase() === query);
    if (match) return match;

    // 3. Name match (e.g. data-bot-id="aa")
    match = bots.find((b) => b.name && b.name.trim().toLowerCase() === query);
    if (match) return match;

    // 4. Fallback: if 'aa' was requested and user has a bot with name starting with aa
    match = bots.find((b) => b.name && b.name.trim().toLowerCase().startsWith(query));
    if (match) return match;

    // 5. Fallback: return the first bot if available
    return bots[0] || null;
  },

  upsertBot(botData) {
    const bots = loadBotsFromDisk();
    const id = botData.id || `bot_${Date.now()}`;
    const existingIndex = bots.findIndex(
      (b) => b.id === id || (botData.name && b.name?.trim().toLowerCase() === botData.name?.trim().toLowerCase())
    );

    const merged = {
      id,
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
      ...botData,
    };

    if (existingIndex >= 0) {
      bots[existingIndex] = { ...bots[existingIndex], ...merged };
    } else {
      bots.unshift(merged);
    }

    saveBotsToDisk(bots);
    try {
      const { sseBroker } = require("./sseBroker");
      sseBroker.broadcast("bot_updated", merged);
    } catch (e) {}
    return merged;
  },

  deleteBot(id) {
    const bots = loadBotsFromDisk();
    const filtered = bots.filter((b) => b.id !== id && b.name?.toLowerCase() !== id?.toLowerCase());
    saveBotsToDisk(filtered);
    try {
      const { sseBroker } = require("./sseBroker");
      sseBroker.broadcast("bot_deleted", { id });
    } catch (e) {}
    return { success: true };
  },
};
