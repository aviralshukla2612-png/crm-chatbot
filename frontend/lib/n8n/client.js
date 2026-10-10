// n8n Webhook Workflow Dispatcher and Callback Client
import { executeWebsiteIngestion } from "@/lib/crawler/engine";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "http://127.0.0.1:5678/webhook/website-ingestion";
const N8N_CALLBACK_SECRET = process.env.N8N_CALLBACK_SECRET || "nx_n8n_sec_99342718bcde";

export const n8nClient = {
  /**
   * Dispatches a crawl job to n8n workflow.
   * If n8n webhook is offline or in local mode, falls back to direct async background processor.
   */
  async triggerIngestionWorkflow({ jobId, websiteSource, botId, organizationId }) {
    const payload = {
      jobId,
      botId,
      organizationId,
      websiteId: websiteSource.id,
      name: websiteSource.name,
      baseUrl: websiteSource.baseUrl,
      crawlScope: websiteSource.crawlScope,
      maxPages: websiteSource.maxPages,
      includePatterns: websiteSource.includePatterns,
      excludePatterns: websiteSource.excludePatterns,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/n8n/callback`,
      callbackSecret: N8N_CALLBACK_SECRET,
      timestamp: new Date().toISOString(),
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Nexus-Auth": N8N_CALLBACK_SECRET,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        return { dispatched: true, engine: "n8n" };
      }
    } catch (e) {
      // n8n not currently responding on webhook endpoint, fallback to built-in async worker
    }

    // Run background worker asynchronously without blocking HTTP request
    setTimeout(() => {
      executeWebsiteIngestion(jobId).catch((err) => {
        console.error("Background ingestion worker error:", err);
      });
    }, 50);

    return { dispatched: true, engine: "crawler-worker" };
  },

  /**
   * Verifies the authenticity of a callback from n8n
   */
  verifyCallbackSecret(headerSecret) {
    return headerSecret === N8N_CALLBACK_SECRET;
  },
};
