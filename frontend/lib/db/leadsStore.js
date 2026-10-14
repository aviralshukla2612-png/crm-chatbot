import fs from "fs";
import path from "path";
import { sseBroker } from "./sseBroker.js";
import { queryDb } from "./dbPool.js";
import { conversationsStore } from "./conversationsStore.js";
import { formatQualificationInquiry } from "../ai/salesFlowManager.js";

function resolveDataFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "leads.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "leads.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const DATA_FILE = resolveDataFile();

const SEED_LEADS = [];

let memoryCache = null;

function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_LEADS, null, 2), "utf8");
      memoryCache = [...SEED_LEADS];
      return memoryCache;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryCache = parsed;
      return memoryCache;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_LEADS, null, 2), "utf8");
    memoryCache = [...SEED_LEADS];
    return memoryCache;
  } catch (err) {
    console.error("Error loading leads store:", err);
    return memoryCache || SEED_LEADS;
  }
}

function saveToDisk(data) {
  try {
    memoryCache = data;
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving leads store:", err);
  }
}

export const leadsStore = {
  getLeads(filters = {}) {
    let list = loadFromDisk();

    // Auto-enrich answers, qualification, and inquiry from conversationsStore if missing
    list.forEach((l) => {
      const cleanDigits = (p) => (p || "").replace(/\D/g, "");
      const conv = (l.sessionId && conversationsStore.getConversation(l.sessionId)) ||
        conversationsStore.getConversations().find((c) =>
          (l.phone && c.visitorPhone && cleanDigits(c.visitorPhone) === cleanDigits(l.phone)) ||
          (l.name && l.name !== "Website Prospect" && l.name !== "Website Visitor" && c.visitorName && c.visitorName.toLowerCase() === l.name.toLowerCase())
        );

      if (conv?.qualification) {
        if (!l.qualification) l.qualification = conv.qualification;
        if (conv.qualification.answers) {
          l.answers = { ...(conv.qualification.answers || {}), ...(l.answers || {}) };
        }
        if (!l.inquiry || l.inquiry === "Inquired via live chat widget" || l.inquiry.startsWith("Visitor introduced")) {
          l.inquiry = formatQualificationInquiry(conv.qualification);
        }
      }
    });

    // Sanitize: filter out invalid entries without contact info, real name, or qualification answers, or bogus question names
    list = list.filter((l) => {
      const hasContact = Boolean(l.email || l.phone);
      const hasAnswers = Boolean(l.answers && Object.keys(l.answers).length > 0);
      const hasRealName = Boolean(l.name && l.name !== "Website Prospect" && l.name !== "Website Visitor");
      const isBogusName = /^(?:who\s+is|what\s+is|can\s+you|tell\s+me|i\s+want|how\s+much|hello|hi)\b/i.test(l.name || "");
      if (isBogusName) return false;
      if (!hasContact && !hasAnswers && !hasRealName) return false;
      return true;
    });

    if (filters.organizationId) {
      list = list.filter((l) => (l.organizationId || "org_ess_default") === filters.organizationId);
    }
    if (filters.status && filters.status !== "All" && filters.status !== "All Status") {
      list = list.filter((l) => l.status?.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.score && filters.score !== "All") {
      list = list.filter((l) => l.score?.toLowerCase() === filters.score.toLowerCase());
    }
    if (filters.bot && filters.bot !== "All Bots") {
      list = list.filter((l) => l.bot?.toLowerCase() === filters.bot.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.phone?.includes(q)
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  },

  getLead(id, organizationId = null) {
    const list = loadFromDisk();
    return list.find((l) => l.id === id && (!organizationId || (l.organizationId || "org_ess_default") === organizationId)) || null;
  },

  createLead(data) {
    const list = loadFromDisk();
    const now = new Date();
    data.organizationId = data.organizationId || "org_ess_default";

    // Check if lead already exists by sessionId, email, or verified phone
    const cleanDigits = (p) => (p || "").replace(/\D/g, "");
    const existing = list.find(
      (l) =>
        (data.sessionId && l.sessionId && l.sessionId === data.sessionId) ||
        (data.email && l.email && l.email.toLowerCase() === data.email.toLowerCase()) ||
        (data.phone && l.phone && cleanDigits(l.phone) === cleanDigits(data.phone) && cleanDigits(data.phone).length >= 10) ||
        (data.sessionId && l.sessionId === data.sessionId && data.name && l.name && l.name.toLowerCase() === data.name.toLowerCase())
    );
    if (existing) {
      if (data.sessionId) existing.sessionId = data.sessionId;
      if (data.name && data.name !== "Website Prospect" && data.name !== "Website Visitor") {
        existing.name = data.name;
      } else if (!existing.name || existing.name === "Website Prospect" || existing.name === "Website Visitor") {
        if (data.name) existing.name = data.name;
      }
      if (data.phone) existing.phone = data.phone;
      if (data.email) existing.email = data.email;
      if (data.sessionId && !existing.sessionId) existing.sessionId = data.sessionId;
      if (data.inquiry && data.inquiry !== "Inquired via live chat widget" && !data.inquiry.startsWith("Visitor introduced")) {
        existing.inquiry = data.inquiry;
      } else if (!existing.inquiry) {
        existing.inquiry = data.inquiry || "Inquired via live chat widget";
      }
      if (data.budget && data.budget !== "₹50,000+") {
        existing.budget = data.budget;
      } else if (!existing.budget) {
        existing.budget = data.budget || "₹50,000+";
      }
      if (data.qualification) {
        existing.qualification = data.qualification;
        if (data.qualification.answers) {
          existing.answers = { ...(existing.answers || {}), ...data.qualification.answers };
        }
      }
      if (data.answers && Object.keys(data.answers).length > 0) {
        existing.answers = { ...(existing.answers || {}), ...data.answers };
      }
      if (existing.phone && existing.email) existing.score = "Hot";
      existing.updatedAt = now.toISOString();
      saveToDisk(list);
      sseBroker.broadcast("lead_updated", existing);

      // Upsert to PostgreSQL so records missing in DB are guaranteed created
      try {
        const targetBotId = (existing.bot === "aa" || !existing.botId) ? "bot_aa" : (existing.botId || existing.bot);
        queryDb(
          `INSERT INTO "Lead" ("id", "organizationId", "botId", "name", "email", "phone", "company", "score", "status", "inquiry", "budget", "source", "createdAt", "updatedAt")
           VALUES ($1, 'org_default', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
           ON CONFLICT ("id") DO UPDATE 
           SET "name" = EXCLUDED."name", "phone" = EXCLUDED."phone", "email" = EXCLUDED."email", "score" = EXCLUDED."score", "inquiry" = EXCLUDED."inquiry", "updatedAt" = NOW()`,
          [
            existing.id,
            targetBotId,
            existing.name,
            existing.email || "",
            existing.phone || "",
            existing.company || "Direct Inbound",
            existing.score || "Hot",
            existing.status || "New",
            existing.inquiry || "",
            existing.budget || "₹50,000+",
            existing.source || "Web Chatbot Widget",
          ]
        );
      } catch (e) {}

      return existing;
    }

    const newLead = {
      id: data.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sessionId: data.sessionId || "",
      name: data.name || "Website Prospect",
      email: data.email || "",
      phone: data.phone || "",
      company: data.company || "Direct Inbound",
      bot: data.bot || "aa",
      score: data.score || (data.phone && data.email ? "High" : "Medium"),
      status: data.status || "New",
      created: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      inquiry: data.inquiry || "Inquired via live chat widget",
      budget: data.budget || "₹50,000+",
      answers: data.answers || {},
      qualification: data.qualification || null,
      source: data.source || "Web Chatbot Widget",
    };

    list.unshift(newLead);
    saveToDisk(list);

    // Broadcast lead in real-time
    sseBroker.broadcast("lead_created", newLead);

    // Async dual-write to PostgreSQL
    try {
      const targetBotId = (data.bot === "aa" || !data.botId) ? "bot_aa" : (data.botId || data.bot);
      queryDb(
        `INSERT INTO "Lead" ("id", "organizationId", "botId", "name", "email", "phone", "company", "score", "status", "inquiry", "budget", "source", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "phone" = EXCLUDED."phone", "updatedAt" = NOW()`,
        [
          newLead.id,
          "org_default",
          targetBotId,
          newLead.name,
          newLead.email,
          newLead.phone,
          newLead.company,
          newLead.score,
          newLead.status,
          newLead.inquiry,
          newLead.budget,
          newLead.source,
          newLead.createdAt,
          newLead.updatedAt,
        ]
      ).catch((err) => console.warn("[DB_LEAD_INSERT_FAIL]", err.message));
    } catch (e) {}

    return newLead;
  },

  updateLeadStatus(id, newStatus) {
    const list = loadFromDisk();
    const lead = list.find((l) => l.id === id);
    if (!lead) return null;

    lead.status = newStatus;
    lead.updatedAt = new Date().toISOString();
    saveToDisk(list);

    sseBroker.broadcast("lead_updated", lead);

    try {
      queryDb('UPDATE "Lead" SET "status" = $1, "updatedAt" = NOW() WHERE "id" = $2', [newStatus, id])
        .catch((err) => console.warn("[DB_LEAD_STATUS_FAIL]", err.message));
    } catch (e) {}

    return lead;
  },

  deleteLead(id) {
    const list = loadFromDisk();
    const filtered = list.filter((l) => l.id !== id);
    saveToDisk(filtered);
    sseBroker.broadcast("lead_deleted", { id });

    try {
      queryDb('DELETE FROM "Lead" WHERE "id" = $1', [id])
        .catch((err) => console.warn("[DB_LEAD_DELETE_FAIL]", err.message));
    } catch (e) {}

    return { success: true };
  },

  clearAll() {
    saveToDisk([]);
    sseBroker.broadcast("leads_cleared", {});
    return { success: true };
  },
};
