const STORAGE_KEY = "chatpilot_bots_v3";

const DUMMY_BOT_NAMES = [
  "healthcare assistant",
  "sales assistant",
  "customer support",
];

// Server-side store loader safe for client bundles
function getServerStore() {
  if (typeof window !== "undefined") return null;
  try {
    // eslint-disable-next-line
    const mod = require("@/lib/db/botsStore");
    return mod.botsStore;
  } catch (e) {
    return null;
  }
}

function getStoredBots() {
  if (typeof window === "undefined") {
    const store = getServerStore();
    return store ? store.getBots() : [];
  }
  try {
    localStorage.removeItem("chatpilot_custom_bots");
    localStorage.removeItem("chatpilot_bots");

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const cleaned = list.filter((b) => {
      const name = (b.name || "").trim().toLowerCase();
      if (DUMMY_BOT_NAMES.includes(name)) return false;
      if (["bot_healthcare_01", "bot_sales_01", "bot_support_01"].includes(b.id)) return false;
      return true;
    });

    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    return [];
  }
}

function saveStoredBots(bots) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bots));
  } catch (e) {
    console.error("Failed to save bots", e);
  }
}

export const botsApi = {
  async getBots(orgId) {
    if (typeof window === "undefined") {
      const store = getServerStore();
      const bots = store ? store.getBots() : [];
      return bots.filter((b) => !orgId || b.organizationId === orgId);
    }

    try {
      const url = orgId ? `/api/bots?organizationId=${encodeURIComponent(orgId)}` : "/api/bots";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.bots)) {
          saveStoredBots(data.bots);
          return data.bots.filter((b) => !orgId || b.organizationId === orgId);
        }
      }
    } catch (e) {
      // Fallback to localStorage
    }

    const bots = getStoredBots();
    return bots.filter((b) => !orgId || b.organizationId === orgId);
  },

  async getBotById(id) {
    if (typeof window === "undefined") {
      const store = getServerStore();
      return store ? store.getBot(id) : null;
    }

    const bots = getStoredBots();
    const query = String(id).trim().toLowerCase();
    const found =
      bots.find((b) => b.id === id) ||
      bots.find((b) => b.id && b.id.toLowerCase() === query) ||
      bots.find((b) => b.name && b.name.trim().toLowerCase() === query);

    if (found) return found;

    try {
      const res = await fetch(`/api/bots/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.bot) return data.bot;
      }
    } catch (e) {}

    return bots[0] || null;
  },

  async createBot(botData) {
    const bots = getStoredBots();
    const newBot = {
      ...botData,
      id: botData.id || `bot_${Date.now()}`,
      status: "Active",
      conversationsCount: 0,
      questionsCount: 0,
      leadsCount: 0,
      answerRate: 100,
      sourcesCount: botData.documents?.length || 0,
      createdDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      lastActive: "Just now",
    };

    if (typeof window !== "undefined") {
      const updated = [newBot, ...bots];
      saveStoredBots(updated);

      // Persist to server
      fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBot),
      }).catch(() => {});
    } else {
      const store = getServerStore();
      if (store) store.upsertBot(newBot);
    }

    return newBot;
  },

  async updateBot(id, updates) {
    const bots = getStoredBots();
    const updated = bots.map((b) => (b.id === id ? { ...b, ...updates } : b));
    saveStoredBots(updated);

    if (typeof window !== "undefined") {
      fetch(`/api/bots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).catch(() => {});
    } else {
      const store = getServerStore();
      if (store) store.upsertBot({ ...updates, id });
    }

    return updated.find((b) => b.id === id);
  },

  async deleteBot(id) {
    if (typeof window !== "undefined") {
      try {
        await fetch(`/api/bots/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Error deleting bot from server:", err);
      }
    } else {
      const store = getServerStore();
      if (store) store.deleteBot(id);
    }

    const bots = getStoredBots();
    const updated = bots.filter((b) => b.id !== id && b.name?.toLowerCase() !== id?.toLowerCase());
    saveStoredBots(updated);

    return { success: true };
  },

  async clearAllBots() {
    saveStoredBots([]);
    return { success: true };
  },
};
