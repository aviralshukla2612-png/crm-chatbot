import fs from "fs";
import path from "path";
import { sseBroker } from "./sseBroker.js";
import { queryDb } from "./dbPool.js";

function resolveDataFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "conversations.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "conversations.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const DATA_FILE = resolveDataFile();
const SEED_CONVERSATIONS = [];
let memoryCache = null;

const DEFAULT_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 Hours

function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_CONVERSATIONS, null, 2), "utf8");
      memoryCache = [...SEED_CONVERSATIONS];
      return memoryCache;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryCache = parsed;
      return memoryCache;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_CONVERSATIONS, null, 2), "utf8");
    memoryCache = [...SEED_CONVERSATIONS];
    return memoryCache;
  } catch (err) {
    console.error("Error loading conversations store:", err);
    return memoryCache || SEED_CONVERSATIONS;
  }
}

function saveToDisk(data) {
  try {
    memoryCache = data;
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving conversations store:", err);
  }
}

export const conversationsStore = {
  getConversations(filters = {}) {
    let list = loadFromDisk();
    if (filters.organizationId) {
      list = list.filter((c) => (c.organizationId || "org_ess_default") === filters.organizationId);
    }
    if (filters.botId && filters.botId !== "All") {
      list = list.filter((c) => c.botId === filters.botId || c.botName === filters.botId);
    }
    if (filters.status && filters.status !== "All") {
      list = list.filter((c) => c.status?.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.onlyLeads) {
      list = list.filter((c) => c.isLead);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.visitorName?.toLowerCase().includes(q) ||
          c.lastMessage?.toLowerCase().includes(q) ||
          c.visitorEmail?.toLowerCase().includes(q)
      );
    }
    // Return sorted newest first
    return [...list].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
  },

  getConversation(id, organizationId = null) {
    const list = loadFromDisk();
    return list.find((c) => c.id === id && (!organizationId || (c.organizationId || "org_ess_default") === organizationId)) || null;
  },

  /**
   * Retrieve active conversation for a visitor if within the 24-hour inactivity window
   */
  getActiveConversationForVisitor(visitorId, botId, options = {}) {
    if (!visitorId || !botId) return null;
    const list = loadFromDisk();
    const now = options.now instanceof Date ? options.now : (options.now ? new Date(options.now) : new Date());
    const windowMs = options.windowMs || DEFAULT_HISTORY_WINDOW_MS;

    const matches = list.filter(
      (c) => c.visitorId === visitorId &&
             (c.botId === botId || c.botId === `bot_${botId}` || (botId.startsWith("bot_") && c.botId === botId.replace("bot_", ""))) &&
             c.status !== "Closed"
    );

    if (matches.length === 0) return null;

    // Sort newest activity first
    matches.sort((a, b) => {
      const tA = new Date(a.lastActivityAt || a.updatedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.lastActivityAt || b.updatedAt || b.createdAt || 0).getTime();
      return tB - tA;
    });

    const latest = matches[0];
    const lastActivityTime = new Date(latest.lastActivityAt || latest.updatedAt || latest.createdAt || 0).getTime();
    const expiryTime = latest.historyExpiresAt
      ? new Date(latest.historyExpiresAt).getTime()
      : (lastActivityTime + windowMs);

    // If current time exceeds expiration or 24-hour window from last activity, history has expired
    if (now.getTime() > expiryTime || (now.getTime() - lastActivityTime) > windowMs) {
      return null;
    }

    return latest;
  },

  /**
   * Retrieve the latest conversation regardless of 24h visibility expiry
   * Used to restore qualification and contact state for recognized returning visitors
   */
  getLatestConversationForVisitor(visitorId, botId) {
    if (!visitorId || !botId) return null;
    const list = loadFromDisk();
    const matches = list.filter(
      (c) => c.visitorId === visitorId &&
             (c.botId === botId || c.botId === `bot_${botId}` || (botId.startsWith("bot_") && c.botId === botId.replace("bot_", "")))
    );
    if (matches.length === 0) return null;
    matches.sort((a, b) => {
      const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tB - tA;
    });
    return matches[0];
  },

  createConversation(data) {
    const list = loadFromDisk();
    const now = data.now instanceof Date ? data.now : (data.now ? new Date(data.now) : new Date());
    const id = data.id || `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const lastActivityAt = data.lastActivityAt || now.toISOString();
    const historyExpiresAt = data.historyExpiresAt || new Date(now.getTime() + DEFAULT_HISTORY_WINDOW_MS).toISOString();

    const newConv = {
      id,
      organizationId: data.organizationId || "org_ess_default",
      botId: data.botId || "bot_aa",
      botName: data.botName || "AI Assistant",
      visitorId: data.visitorId || null,
      leadId: data.leadId || null,
      visitorName: data.visitorName || "Website Visitor",
      visitorEmail: data.visitorEmail || "",
      visitorPhone: data.visitorPhone || "",
      visitorLocation: data.visitorLocation || "Direct Session",
      status: data.status || "Active",
      isLead: Boolean(data.isLead || data.visitorEmail || data.visitorPhone),
      leadScore: data.leadScore || (data.visitorEmail ? "High" : "Medium"),
      startedAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      duration: "1 min",
      messagesCount: data.messages?.length || 1,
      questionsCount: data.messages?.filter((m) => m.role === "user").length || 1,
      lastMessage: data.lastMessage || (data.messages?.[data.messages.length - 1]?.content) || "",
      lastActivityAt,
      historyExpiresAt,
      qualification: data.qualification || null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: data.messages || [],
    };

    list.unshift(newConv);
    saveToDisk(list);

    // Broadcast in real-time
    sseBroker.broadcast("conversation_created", newConv);

    // Sync to PostgreSQL
    try {
      queryDb(
        `INSERT INTO "Conversation" ("id", "organizationId", "botId", "visitorId", "leadId", "visitorName", "visitorEmail", "visitorPhone", "visitorLocation", "status", "isLead", "leadScore", "lastMessage", "qualificationState", "lastActivityAt", "historyExpiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT ("id") DO UPDATE 
         SET "visitorId" = COALESCE(EXCLUDED."visitorId", "Conversation"."visitorId"),
             "lastActivityAt" = EXCLUDED."lastActivityAt",
             "historyExpiresAt" = EXCLUDED."historyExpiresAt",
             "qualificationState" = EXCLUDED."qualificationState",
             "updatedAt" = NOW();`,
        [
          newConv.id,
          newConv.organizationId,
          newConv.botId,
          newConv.visitorId,
          newConv.leadId,
          newConv.visitorName,
          newConv.visitorEmail,
          newConv.visitorPhone,
          newConv.visitorLocation,
          newConv.status,
          newConv.isLead,
          newConv.leadScore,
          newConv.lastMessage,
          JSON.stringify(newConv.qualification || {}),
          newConv.lastActivityAt,
          newConv.historyExpiresAt,
          newConv.createdAt,
          newConv.updatedAt,
        ]
      ).catch((err) => console.warn("[DB_CONVERSATION_INSERT_FAIL]", err.message));
    } catch (e) {}

    return newConv;
  },

  addMessage(conversationId, message, options = {}) {
    const list = loadFromDisk();
    let conv = list.find((c) => c.id === conversationId);
    const now = options.now instanceof Date ? options.now : (options.now ? new Date(options.now) : new Date());

    if (!conv) {
      conv = this.createConversation({
        id: conversationId,
        visitorId: options.visitorId || null,
        visitorName: message.role === "user" ? "Website Visitor" : "AI Assistant",
        messages: [],
        now,
      });
    }

    const newMsg = {
      id: message.id || `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      role: message.role || "user",
      content: message.content || message.text || "",
      quickReplies: message.quickReplies || [],
      sources: message.sources || [],
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: now.toISOString(),
    };

    conv.messages = [...(conv.messages || []), newMsg];
    conv.messagesCount = conv.messages.length;
    conv.questionsCount = conv.messages.filter((m) => m.role === "user").length;
    conv.lastMessage = newMsg.content;
    conv.lastActivityAt = now.toISOString();
    conv.historyExpiresAt = new Date(now.getTime() + DEFAULT_HISTORY_WINDOW_MS).toISOString();
    conv.updatedAt = now.toISOString();

    if (options.visitorId && !conv.visitorId) {
      conv.visitorId = options.visitorId;
    }
    if (options.qualification) {
      conv.qualification = options.qualification;
    }

    saveToDisk(list);

    // Broadcast in real-time to all connected dashboards
    sseBroker.broadcast("message_added", {
      conversationId: conv.id,
      message: newMsg,
      conversation: conv,
    });

    // Dual-write message to PostgreSQL
    try {
      queryDb(
        `INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
         VALUES ($1, $2, $3, $4, $5);`,
        [newMsg.id, conv.id, newMsg.role, newMsg.content, newMsg.createdAt]
      ).catch((err) => console.warn("[DB_MESSAGE_INSERT_FAIL]", err.message));

      queryDb(
        `UPDATE "Conversation"
         SET "lastMessage" = $1,
             "lastActivityAt" = $2,
             "historyExpiresAt" = $3,
             "visitorId" = COALESCE($4, "visitorId"),
             "qualificationState" = COALESCE($5, "qualificationState"),
             "updatedAt" = $6
         WHERE "id" = $7;`,
        [
          newMsg.content,
          conv.lastActivityAt,
          conv.historyExpiresAt,
          conv.visitorId,
          conv.qualification ? JSON.stringify(conv.qualification) : null,
          conv.updatedAt,
          conv.id,
        ]
      ).catch((err) => console.warn("[DB_CONVERSATION_UPDATE_FAIL]", err.message));
    } catch (e) {}

    return { message: newMsg, conversation: conv };
  },

  updateConversation(id, updates = {}) {
    const list = loadFromDisk();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const now = new Date();
    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: now.toISOString(),
    };

    saveToDisk(list);
    sseBroker.broadcast("conversation_updated", list[index]);

    try {
      const c = list[index];
      queryDb(
        `UPDATE "Conversation"
         SET "visitorName" = COALESCE($1, "visitorName"),
             "visitorEmail" = COALESCE($2, "visitorEmail"),
             "visitorPhone" = COALESCE($3, "visitorPhone"),
             "status" = COALESCE($4, "status"),
             "qualificationState" = COALESCE($5, "qualificationState"),
             "visitorId" = COALESCE($6, "visitorId"),
             "updatedAt" = NOW()
         WHERE "id" = $7;`,
        [
          c.visitorName,
          c.visitorEmail,
          c.visitorPhone,
          c.status,
          c.qualification ? JSON.stringify(c.qualification) : null,
          c.visitorId,
          id,
        ]
      ).catch((err) => console.warn("[DB_CONVERSATION_UPDATE_FAIL]", err.message));
    } catch (e) {}

    return list[index];
  },

  closeConversation(id) {
    return this.updateConversation(id, { status: "Closed" });
  },

  /**
   * Scheduled cleanup process for expired conversations past retention window
   * Safe, idempotent, observable
   */
  cleanupExpiredConversations(options = {}) {
    const list = loadFromDisk();
    const now = options.now instanceof Date ? options.now : (options.now ? new Date(options.now) : new Date());
    let modified = 0;

    list.forEach((c) => {
      const exp = c.historyExpiresAt ? new Date(c.historyExpiresAt).getTime() : 0;
      if (exp > 0 && now.getTime() > exp && c.status === "Active") {
        c.status = "Expired";
        c.updatedAt = now.toISOString();
        modified++;
      }
    });

    if (modified > 0) {
      saveToDisk(list);
    }

    try {
      queryDb(
        `UPDATE "Conversation"
         SET "status" = 'Expired', "updatedAt" = NOW()
         WHERE "status" = 'Active' AND "historyExpiresAt" < NOW();`
      ).catch((e) => {});
    } catch (e) {}

    return { cleanedCount: modified };
  },

  deleteConversation(id) {
    const list = loadFromDisk();
    const filtered = list.filter((c) => c.id !== id);
    saveToDisk(filtered);
    sseBroker.broadcast("conversation_deleted", { id });

    try {
      queryDb('DELETE FROM "Conversation" WHERE "id" = $1', [id]).catch((e) => {});
    } catch (e) {}

    return { success: true };
  },

  clearAll() {
    saveToDisk([]);
    sseBroker.broadcast("conversations_cleared", {});
    return { success: true };
  },
};
