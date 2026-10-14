import fs from "fs";
import path from "path";
import crypto from "crypto";
import { queryDb } from "./dbPool.js";

function resolveDataFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "visitors.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "visitors.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const DATA_FILE = resolveDataFile();
let memoryCache = null;

function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
      memoryCache = [];
      return memoryCache;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryCache = parsed;
      return memoryCache;
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
    memoryCache = [];
    return memoryCache;
  } catch (err) {
    console.error("Error loading visitors store:", err);
    return memoryCache || [];
  }
}

function saveToDisk(data) {
  try {
    memoryCache = data;
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving visitors store:", err);
  }
}

export function hashVisitorToken(token) {
  if (!token || typeof token !== "string") return "";
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

export function generateVisitorToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVisitorToken(rawToken);
  return { rawToken, tokenHash };
}

export const visitorsStore = {
  hashToken: hashVisitorToken,
  generateToken: generateVisitorToken,

  /**
   * Find visitor by botId and raw identity token
   * Strict tenant and bot isolation: a token from Bot A cannot resolve on Bot B
   */
  getVisitorByToken(botId, rawToken) {
    if (!botId || !rawToken || typeof rawToken !== "string") return null;
    const tokenHash = hashVisitorToken(rawToken);
    const list = loadFromDisk();
    const visitor = list.find(
      (v) => (v.botId === botId || v.botId === `bot_${botId}` || (botId.startsWith("bot_") && v.botId === botId.replace("bot_", ""))) &&
             v.visitorTokenHash === tokenHash &&
             !v.revoked
    );
    return visitor || null;
  },

  async getVisitorByTokenAsync(botId, rawToken) {
    if (!botId || !rawToken) return null;
    const tokenHash = hashVisitorToken(rawToken);

    try {
      const res = await queryDb(
        `SELECT * FROM "Visitor" WHERE "botId" = $1 AND "visitorTokenHash" = $2 LIMIT 1;`,
        [botId, tokenHash]
      );
      if (res.ok && res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (e) {
      // Fall through to file store
    }

    return this.getVisitorByToken(botId, rawToken);
  },

  getVisitorById(id, organizationId = null) {
    const list = loadFromDisk();
    return list.find(
      (v) => v.id === id && (!organizationId || (v.organizationId || "org_ess_default") === organizationId)
    ) || null;
  },

  /**
   * Create a new persistent visitor record with an opaque token
   */
  createVisitor({
    organizationId = "org_ess_default",
    botId = "bot_aa",
    token = null,
    name = "",
    email = "",
    phone = "",
    leadId = null,
    metadata = {},
  }) {
    const list = loadFromDisk();
    const now = new Date();

    let rawToken = token;
    let tokenHash = "";
    if (rawToken) {
      tokenHash = hashVisitorToken(rawToken);
    } else {
      const generated = generateVisitorToken();
      rawToken = generated.rawToken;
      tokenHash = generated.tokenHash;
    }

    const id = `vis_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const newVisitor = {
      id,
      organizationId: organizationId || "org_ess_default",
      botId: botId || "bot_aa",
      visitorTokenHash: tokenHash,
      leadId: leadId || null,
      name: name || "",
      email: email || "",
      phone: phone || "",
      metadata: metadata || {},
      revoked: false,
      lastSeenAt: now.toISOString(),
      lastConversationAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    list.unshift(newVisitor);
    saveToDisk(list);

    // Async sync to PostgreSQL
    try {
      queryDb(
        `INSERT INTO "Visitor" ("id", "organizationId", "botId", "visitorTokenHash", "leadId", "name", "email", "phone", "metadata", "lastSeenAt", "lastConversationAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT ("botId", "visitorTokenHash") DO UPDATE 
         SET "lastSeenAt" = NOW(), "updatedAt" = NOW();`,
        [
          newVisitor.id,
          newVisitor.organizationId,
          newVisitor.botId,
          newVisitor.visitorTokenHash,
          newVisitor.leadId,
          newVisitor.name,
          newVisitor.email,
          newVisitor.phone,
          JSON.stringify(newVisitor.metadata),
          newVisitor.lastSeenAt,
          newVisitor.lastConversationAt,
          newVisitor.createdAt,
          newVisitor.updatedAt,
        ]
      ).catch((err) => console.warn("[DB_VISITOR_INSERT_FAIL]", err.message));
    } catch (e) {}

    return { visitor: newVisitor, rawToken };
  },

  /**
   * Update visitor profile (verified name, contact info, leadId, etc.)
   */
  updateVisitor(id, updates = {}) {
    const list = loadFromDisk();
    const index = list.findIndex((v) => v.id === id);
    if (index === -1) return null;

    const existing = list[index];
    const now = new Date();

    // Prevent overwriting verified details with empty or placeholder strings
    const cleanUpdates = { ...updates };
    if (cleanUpdates.name && (cleanUpdates.name === "Website Visitor" || cleanUpdates.name === "Website Prospect")) {
      delete cleanUpdates.name;
    }
    if (cleanUpdates.email && !cleanUpdates.email.includes("@")) {
      delete cleanUpdates.email;
    }
    if (cleanUpdates.phone && cleanUpdates.phone.replace(/\D/g, "").length < 10) {
      delete cleanUpdates.phone;
    }

    list[index] = {
      ...existing,
      ...cleanUpdates,
      updatedAt: now.toISOString(),
      lastSeenAt: cleanUpdates.lastSeenAt || now.toISOString(),
    };

    saveToDisk(list);

    try {
      const v = list[index];
      queryDb(
        `UPDATE "Visitor" 
         SET "name" = COALESCE($1, "name"), 
             "email" = COALESCE($2, "email"), 
             "phone" = COALESCE($3, "phone"),
             "leadId" = COALESCE($4, "leadId"),
             "lastSeenAt" = NOW(),
             "updatedAt" = NOW()
         WHERE "id" = $5;`,
        [v.name || null, v.email || null, v.phone || null, v.leadId || null, id]
      ).catch((err) => console.warn("[DB_VISITOR_UPDATE_FAIL]", err.message));
    } catch (e) {}

    return list[index];
  },

  /**
   * Record visitor activity timestamp
   */
  recordActivity(id) {
    return this.updateVisitor(id, { lastSeenAt: new Date().toISOString() });
  },

  /**
   * Revoke a visitor token (e.g. for security reset or logout)
   */
  revokeVisitorToken(id) {
    const list = loadFromDisk();
    const index = list.findIndex((v) => v.id === id);
    if (index === -1) return false;
    list[index].revoked = true;
    list[index].updatedAt = new Date().toISOString();
    saveToDisk(list);
    return true;
  },

  /**
   * User-requested deletion flow: anonymize or remove visitor identity
   */
  deleteVisitor(id) {
    const list = loadFromDisk();
    const filtered = list.filter((v) => v.id !== id);
    saveToDisk(filtered);

    try {
      queryDb(`DELETE FROM "Visitor" WHERE "id" = $1;`, [id]).catch((e) => {});
    } catch (e) {}

    return true;
  },

  clearAll() {
    saveToDisk([]);
    return true;
  },
};
