import fs from "fs";
import path from "path";
import { sseBroker } from "./sseBroker.js";
import { queryDb } from "./dbPool.js";

function resolveDataFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "leads.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "leads.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const DATA_FILE = resolveDataFile();

const SEED_LEADS = [
  {
    id: "lead_seed_01",
    name: "Rohan Varma",
    email: "rohan.v@techlogix.co",
    phone: "+91 98200 12345",
    company: "TechLogix Global",
    bot: "aa",
    score: "High",
    status: "New",
    created: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    createdAt: new Date().toISOString(),
    inquiry: "Interested in custom ERP & CRM automation pipeline with real-time vector search.",
    budget: "₹1,50,000",
    source: "Web Chatbot Widget",
  },
];

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

  getLead(id) {
    const list = loadFromDisk();
    return list.find((l) => l.id === id) || null;
  },

  createLead(data) {
    const list = loadFromDisk();
    const now = new Date();

    // Check if lead already exists by email or phone to enrich details
    const existing = list.find(
      (l) =>
        (data.email && l.email && l.email.toLowerCase() === data.email.toLowerCase()) ||
        (data.phone && l.phone && l.phone.replace(/\D/g, "") === data.phone.replace(/\D/g, ""))
    );
    if (existing) {
      if (data.name && (!existing.name || existing.name === "Website Prospect")) {
        existing.name = data.name;
      }
      if (data.phone && !existing.phone) existing.phone = data.phone;
      if (data.email && !existing.email) existing.email = data.email;
      if (data.inquiry) existing.inquiry = data.inquiry;
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
