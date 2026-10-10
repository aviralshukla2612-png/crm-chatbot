import { NextResponse } from "next/server";
import { validateUrlForSSRF } from "@/lib/security/ssrf";
import { websitesDb } from "@/lib/db/websites";
import { n8nClient } from "@/lib/n8n/client";

export async function GET(request, { params }) {
  try {
    const { botId } = await params;
    const sources = await websitesDb.getWebsiteSources(botId);
    return NextResponse.json({ success: true, sources });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { botId } = await params;
    const body = await request.json();

    const {
      name,
      baseUrl,
      crawlScope = "entire",
      maxPages = 50,
      includePatterns = [],
      excludePatterns = [],
      syncSchedule = "manual",
    } = body;

    if (!baseUrl) {
      return NextResponse.json({ success: false, error: "Website URL is required." }, { status: 400 });
    }

    // 1. SSRF and Domain Security Verification
    const ssrfCheck = await validateUrlForSSRF(baseUrl);
    if (!ssrfCheck.valid) {
      return NextResponse.json(
        { success: false, error: ssrfCheck.error },
        { status: 400 }
      );
    }

    // 2. Create Website Source Record
    const source = await websitesDb.createWebsiteSource({
      organizationId: "org_ess_01",
      botId,
      name: name?.trim() || ssrfCheck.hostname,
      baseUrl: ssrfCheck.normalizedUrl,
      crawlScope,
      maxPages: Math.min(Math.max(Number(maxPages) || 50, 1), 500),
      includePatterns: includePatterns || [],
      excludePatterns: excludePatterns || [],
      syncSchedule,
    });

    // 3. Create Background Ingestion Job
    const job = await websitesDb.createIngestionJob(source.id, botId, "org_ess_01");

    // 4. Trigger n8n Workflow / Background Pipeline (Non-blocking)
    const dispatch = await n8nClient.triggerIngestionWorkflow({
      jobId: job.id,
      websiteSource: source,
      botId,
      organizationId: "org_ess_01",
    });

    return NextResponse.json(
      {
        success: true,
        source,
        job,
        dispatched: dispatch.dispatched,
        engine: dispatch.engine,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
