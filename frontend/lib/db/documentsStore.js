import fs from "fs";
import path from "path";

function resolveDataFile() {
  const frontendPath = path.join(process.cwd(), "frontend", "data", "documents.json");
  if (fs.existsSync(frontendPath)) return frontendPath;
  const directPath = path.join(process.cwd(), "data", "documents.json");
  if (fs.existsSync(directPath)) return directPath;
  if (process.cwd().endsWith("frontend")) return directPath;
  return frontendPath;
}

const DATA_FILE = resolveDataFile();

// Helper to chunk text
function chunkDocumentText(text, chunkSize = 450, overlap = 60) {
  if (!text) return [];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if ((current + "\n\n" + trimmed).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + "\n\n" + trimmed;
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  // Fallback if no paragraph breaks
  if (chunks.length === 0 && text.length > 0) {
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize).trim());
    }
  }

  return chunks;
}

// Simple keyword score (term frequency with query word overlap)
function scoreChunkRelevance(query, chunk) {
  if (!query || !chunk) return 0;
  const qWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  if (qWords.length === 0) return 0;

  const cLower = chunk.toLowerCase();
  let score = 0;

  for (const word of qWords) {
    if (cLower.includes(word)) {
      score += 2.0;
      // Bonus for exact word boundaries
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(cLower)) {
        score += 1.5;
      }
    }
  }

  return score;
}

function loadDocumentsFromDisk() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading documents store:", e);
    return [];
  }
}

function saveDocumentsToDisk(docs) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2), "utf8");
  } catch (e) {
    console.error("Error saving documents store:", e);
  }
}

export const documentsStore = {
  getDocuments(botId) {
    const all = loadDocumentsFromDisk();
    if (!botId) return all;
    return all.filter((d) => !d.botId || d.botId === botId || d.botId === "all");
  },

  addDocument({ id, botId = "all", name, content, type = "PDF" }) {
    const all = loadDocumentsFromDisk();
    const docId = id || `doc_${Date.now()}`;
    const chunks = chunkDocumentText(content);

    const doc = {
      id: docId,
      botId,
      name: name || "Untitled Document",
      type,
      content,
      chunks,
      chunksCount: chunks.length,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = all.findIndex((d) => d.id === docId || (d.name === name && d.botId === botId));
    if (existingIdx >= 0) {
      all[existingIdx] = doc;
    } else {
      all.unshift(doc);
    }

    saveDocumentsToDisk(all);
    return doc;
  },

  deleteDocument(docId) {
    const all = loadDocumentsFromDisk();
    const filtered = all.filter((d) => d.id !== docId);
    saveDocumentsToDisk(filtered);
    return true;
  },

  searchDocuments(botId, query, topK = 4) {
    const cleanQ = (query || "").trim().toLowerCase();
    // Do not return document sources for pure greetings or small talk
    if (/^(hi+|hello+|hey+|hola|namaste|greetings|good\s*(morning|afternoon|evening|day))[\s!.,?]*$/i.test(cleanQ)) {
      return [];
    }

    const all = loadDocumentsFromDisk();
    // Filter docs relevant to this bot
    const relevantDocs = all.filter((d) => !botId || !d.botId || d.botId === botId || d.botId === "all" || botId.includes(d.botId) || (d.botId && botId.includes(d.botId.replace("bot_", ""))));

    const scoredChunks = [];

    for (const doc of relevantDocs) {
      if (Array.isArray(doc.chunks)) {
        for (const chunk of doc.chunks) {
          const score = scoreChunkRelevance(query, chunk);
          if (score > 0) {
            scoredChunks.push({
              pageTitle: doc.name,
              pageUrl: doc.name,
              content: chunk,
              score,
            });
          }
        }
      }
    }

    scoredChunks.sort((a, b) => b.score - a.score);

    // If query has specific matches, return topK
    if (scoredChunks.length > 0) {
      return scoredChunks.slice(0, topK);
    }

    // Only fallback for substantive queries longer than 15 chars, not for greetings or short chat
    if (cleanQ.length > 15 && relevantDocs.length > 0 && relevantDocs[0].chunks?.length > 0) {
      return relevantDocs[0].chunks.slice(0, 2).map((chunk) => ({
        pageTitle: relevantDocs[0].name,
        pageUrl: relevantDocs[0].name,
        content: chunk,
        score: 0.5,
      }));
    }

    return [];
  },
};
