import fs from "fs";
import path from "path";
import { sseBroker } from "./sseBroker.js";

function resolveDataFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "conversations.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "conversations.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const DATA_FILE = resolveDataFile();

const SEED_CONVERSATIONS = [
  {
    id: "c_seed_01",
    visitorName: "Acme Logistics Inquiry",
    visitorEmail: "contact@acmelogistics.com",
    visitorPhone: "+91 98765 43210",
    visitorLocation: "Mumbai, India",
    botId: "bot_aa",
    botName: "aa",
    status: "Active",
    isLead: true,
    leadScore: "High",
    startedAt: "10:15 AM",
    duration: "4 mins",
    messagesCount: 4,
    questionsCount: 2,
    lastMessage: "Can we schedule a live demo of the ERP integration modules?",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    messages: [
      {
        id: "m_1",
        role: "user",
        content: "Hello, what ERP modules do you support for inventory and supply chain?",
        timestamp: "10:15 AM",
      },
      {
        id: "m_2",
        role: "assistant",
        content: "We provide comprehensive inventory tracking, multi-warehouse management, procurement orders, and real-time vendor dispatch portals.",
        timestamp: "10:16 AM",
      },
      {
        id: "m_3",
        role: "user",
        content: "Can we schedule a live demo of the ERP integration modules?",
        timestamp: "10:18 AM",
      },
      {
        id: "m_4",
        role: "assistant",
        content: "Absolutely! I can connect you directly with our solutions team. Would you like to share your preferred date and time?",
        timestamp: "10:19 AM",
      },
    ],
  },
];

let memoryCache = null;

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

  getConversation(id) {
    const list = loadFromDisk();
    return list.find((c) => c.id === id) || null;
  },

  createConversation(data) {
    const list = loadFromDisk();
    const now = new Date();
    const id = data.id || `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const newConv = {
      id,
      visitorName: data.visitorName || "Website Visitor",
      visitorEmail: data.visitorEmail || "",
      visitorPhone: data.visitorPhone || "",
      visitorLocation: data.visitorLocation || "Direct Session",
      botId: data.botId || "bot_aa",
      botName: data.botName || "AI Assistant",
      status: data.status || "Active",
      isLead: Boolean(data.isLead || data.visitorEmail || data.visitorPhone),
      leadScore: data.leadScore || (data.visitorEmail ? "High" : "Medium"),
      startedAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      duration: "1 min",
      messagesCount: data.messages?.length || 1,
      questionsCount: data.messages?.filter((m) => m.role === "user").length || 1,
      lastMessage: data.lastMessage || (data.messages?.[data.messages.length - 1]?.content) || "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: data.messages || [],
    };

    list.unshift(newConv);
    saveToDisk(list);

    // Broadcast in real-time
    sseBroker.broadcast("conversation_created", newConv);

    return newConv;
  },

  addMessage(conversationId, message) {
    const list = loadFromDisk();
    let conv = list.find((c) => c.id === conversationId);
    const now = new Date();

    if (!conv) {
      // If conversation doesn't exist, create it on the fly
      conv = this.createConversation({
        id: conversationId,
        visitorName: message.role === "user" ? "Website Visitor" : "AI Assistant",
        messages: [],
      });
    }

    const newMsg = {
      id: message.id || `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      role: message.role || "user",
      content: message.content || message.text || "",
      sources: message.sources || [],
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    conv.messages = [...(conv.messages || []), newMsg];
    conv.messagesCount = conv.messages.length;
    conv.questionsCount = conv.messages.filter((m) => m.role === "user").length;
    conv.lastMessage = newMsg.content;
    conv.updatedAt = now.toISOString();

    // Check if visitor just shared contact info inside the message
    const msgText = newMsg.content;
    const emailMatch = msgText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = msgText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    if (emailMatch && !conv.visitorEmail) {
      conv.visitorEmail = emailMatch[0];
      conv.isLead = true;
      conv.leadScore = "High";
    }
    if (phoneMatch && !conv.visitorPhone) {
      conv.visitorPhone = phoneMatch[0];
      conv.isLead = true;
    }

    saveToDisk(list);

    // Broadcast in real-time to all connected dashboards
    sseBroker.broadcast("message_added", {
      conversationId: conv.id,
      message: newMsg,
      conversation: conv,
    });

    return { message: newMsg, conversation: conv };
  },

  updateConversation(id, updates = {}) {
    const list = loadFromDisk();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveToDisk(list);
    sseBroker.broadcast("conversation_updated", list[index]);
    return list[index];
  },

  deleteConversation(id) {
    const list = loadFromDisk();
    const filtered = list.filter((c) => c.id !== id);
    saveToDisk(filtered);
    sseBroker.broadcast("conversation_deleted", { id });
    return { success: true };
  },

  clearAll() {
    saveToDisk([]);
    sseBroker.broadcast("conversations_cleared", {});
    return { success: true };
  },
};
