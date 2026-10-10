import { mockDocuments, mockQAPairs, mockWebsites, mockKnowledgeGaps } from "@/lib/mock/data";

let docsStore = [...mockDocuments];
let qaStore = [...mockQAPairs];
let websitesStore = [...mockWebsites];
let gapsStore = [...mockKnowledgeGaps];

export const knowledgeApi = {
  async getDocuments(botId) {
    await new Promise((r) => setTimeout(r, 60));
    return docsStore.filter((d) => !botId || d.botId === botId);
  },

  async addDocument(botId, fileData) {
    await new Promise((r) => setTimeout(r, 120));
    const newDoc = {
      id: `doc_${Date.now()}`,
      botId,
      name: fileData.name,
      type: fileData.type || "PDF",
      size: fileData.size || "1.2 MB",
      chunks: Math.floor(Math.random() * 30) + 10,
      status: "Ready",
      uploadedDate: new Date().toISOString().split("T")[0],
    };
    docsStore = [newDoc, ...docsStore];
    return newDoc;
  },

  async deleteDocument(id) {
    docsStore = docsStore.filter((d) => d.id !== id);
    return { success: true };
  },

  async getQAPairs(botId) {
    return qaStore.filter((q) => !botId || q.botId === botId);
  },

  async addQAPair(botId, { question, answer }) {
    const newQA = {
      id: `qa_${Date.now()}`,
      botId,
      question,
      answer,
      status: "Active",
      createdDate: new Date().toISOString().split("T")[0],
    };
    qaStore = [newQA, ...qaStore];
    return newQA;
  },

  async deleteQAPair(id) {
    qaStore = qaStore.filter((q) => q.id !== id);
    return { success: true };
  },

  async getWebsites(botId) {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/bots/${botId || "bot_sales_01"}/websites`);
        const data = await res.json();
        if (data.sources) return data.sources;
      } catch (e) {}
    }
    return websitesStore.filter((w) => !botId || w.botId === botId);
  },

  async addWebsite(botId, url) {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/bots/${botId || "bot_sales_01"}/websites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUrl: url }),
        });
        const data = await res.json();
        if (data.source) return data.source;
      } catch (e) {}
    }
    const newWeb = {
      id: `web_${Date.now()}`,
      botId,
      url,
      pagesIndexed: Math.floor(Math.random() * 20) + 5,
      lastCrawled: new Date().toISOString().split("T")[0],
      status: "Ready",
    };
    websitesStore = [newWeb, ...websitesStore];
    return newWeb;
  },

  async getKnowledgeGaps(botId) {
    return gapsStore.filter((g) => !botId || g.botId === botId);
  },

  async resolveKnowledgeGap(gapId, answer) {
    const gap = gapsStore.find((g) => g.id === gapId);
    if (!gap) return null;
    
    // Add to Q&A collection
    const newQA = {
      id: `qa_${Date.now()}`,
      botId: gap.botId,
      question: gap.question,
      answer,
      status: "Active",
      createdDate: new Date().toISOString().split("T")[0],
    };
    qaStore = [newQA, ...qaStore];
    
    // Remove from gaps
    gapsStore = gapsStore.filter((g) => g.id !== gapId);
    return { success: true, newQA };
  },

  async ignoreKnowledgeGap(gapId) {
    gapsStore = gapsStore.filter((g) => g.id !== gapId);
    return { success: true };
  },
};
