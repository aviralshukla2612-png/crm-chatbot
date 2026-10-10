// In-memory + persistent store for Website Sources, Ingestion Jobs, Pages, and Widget Installations
// Implements strict multi-tenant isolation by organizationId and botId

let websiteSourcesStore = [];
let websitePagesStore = [];
let ingestionJobsStore = [];
let widgetInstallationsStore = [];

// Helper to generate IDs
const uid = (prefix = "id") => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export const websitesDb = {
  // --- WEBSITE SOURCES ---
  async createWebsiteSource({
    organizationId = "org_ess_01",
    botId,
    name,
    baseUrl,
    crawlScope = "entire",
    maxPages = 50,
    includePatterns = [],
    excludePatterns = [],
    syncSchedule = "manual",
  }) {
    const existing = websiteSourcesStore.find(
      (s) => s.botId === botId && s.baseUrl.toLowerCase() === baseUrl.toLowerCase()
    );
    if (existing) {
      throw new Error("This website URL is already connected to this chatbot.");
    }

    const source = {
      id: uid("ws"),
      organizationId,
      botId,
      name: name || new URL(baseUrl).hostname,
      baseUrl,
      crawlScope,
      maxPages: Number(maxPages) || 50,
      includePatterns: Array.isArray(includePatterns) ? includePatterns : [],
      excludePatterns: Array.isArray(excludePatterns) ? excludePatterns : [],
      syncSchedule,
      status: "Pending", // Pending, Crawling, Indexing, Ready, Failed, Paused
      pagesDiscovered: 0,
      pagesIndexed: 0,
      pagesSkipped: 0,
      pagesFailed: 0,
      lastSyncedAt: null,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    websiteSourcesStore.unshift(source);
    return source;
  },

  async getWebsiteSources(botId, organizationId) {
    return websiteSourcesStore.filter(
      (s) => (!botId || s.botId === botId) && (!organizationId || s.organizationId === organizationId)
    );
  },

  async getWebsiteSourceById(websiteId, botId) {
    return websiteSourcesStore.find(
      (s) => s.id === websiteId && (!botId || s.botId === botId)
    ) || null;
  },

  async updateWebsiteSource(websiteId, updates) {
    const idx = websiteSourcesStore.findIndex((s) => s.id === websiteId);
    if (idx === -1) return null;

    websiteSourcesStore[idx] = {
      ...websiteSourcesStore[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return websiteSourcesStore[idx];
  },

  async deleteWebsiteSource(websiteId, botId) {
    const source = await this.getWebsiteSourceById(websiteId, botId);
    if (!source) return false;

    // Cascade delete pages and jobs
    websitePagesStore = websitePagesStore.filter((p) => p.websiteSourceId !== websiteId);
    ingestionJobsStore = ingestionJobsStore.filter((j) => j.websiteSourceId !== websiteId);
    websiteSourcesStore = websiteSourcesStore.filter((s) => s.id !== websiteId);
    return true;
  },

  // --- INGESTION JOBS ---
  async createIngestionJob(websiteSourceId, botId, organizationId = "org_ess_01") {
    const job = {
      id: uid("job"),
      websiteSourceId,
      botId,
      organizationId,
      jobStatus: "Pending", // Pending, Discovering, Crawling, Extracting, Embedding, Indexing, Completed, Failed, Cancelled
      currentStep: "Initializing crawler",
      progress: 0, // 0 - 100
      discoveredCount: 0,
      indexedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      errorDetails: null,
    };

    ingestionJobsStore.unshift(job);
    return job;
  },

  async getIngestionJob(jobId) {
    return ingestionJobsStore.find((j) => j.id === jobId) || null;
  },

  async getLatestJobForSource(websiteSourceId) {
    return ingestionJobsStore.find((j) => j.websiteSourceId === websiteSourceId) || null;
  },

  async updateIngestionJob(jobId, updates) {
    const idx = ingestionJobsStore.findIndex((j) => j.id === jobId);
    if (idx === -1) return null;

    ingestionJobsStore[idx] = {
      ...ingestionJobsStore[idx],
      ...updates,
    };
    return ingestionJobsStore[idx];
  },

  // --- WEBSITE PAGES ---
  async getPagesForWebsite(websiteSourceId) {
    return websitePagesStore.filter((p) => p.websiteSourceId === websiteSourceId);
  },

  async upsertWebsitePage(pageData) {
    const existingIdx = websitePagesStore.findIndex(
      (p) => p.websiteSourceId === pageData.websiteSourceId && p.url === pageData.url
    );

    const record = {
      id: existingIdx >= 0 ? websitePagesStore[existingIdx].id : uid("page"),
      ...pageData,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      websitePagesStore[existingIdx] = record;
    } else {
      websitePagesStore.push(record);
    }
    return record;
  },

  async togglePageExclusion(websiteId, pageId, excluded) {
    const page = websitePagesStore.find(
      (p) => p.id === pageId && p.websiteSourceId === websiteId
    );
    if (!page) return null;

    page.crawlStatus = excluded ? "Excluded" : "Indexed";
    page.updatedAt = new Date().toISOString();
    return page;
  },

  // --- WIDGET INSTALLATIONS ---
  async getWidgetInstallation(botId) {
    return widgetInstallationsStore.find((w) => w.botId === botId) || null;
  },

  async saveWidgetInstallation({
    botId,
    domain,
    installationStatus,
    cmsProvider = "custom",
    failureReason = null,
  }) {
    const existingIdx = widgetInstallationsStore.findIndex((w) => w.botId === botId);
    const data = {
      id: existingIdx >= 0 ? widgetInstallationsStore[existingIdx].id : uid("inst"),
      botId,
      domain,
      cmsProvider,
      installationStatus, // Unverified, Verified, Failed
      lastVerifiedAt: new Date().toISOString(),
      failureReason,
    };

    if (existingIdx >= 0) {
      widgetInstallationsStore[existingIdx] = data;
    } else {
      widgetInstallationsStore.push(data);
    }
    return data;
  },
};
