import { NextResponse } from "next/server";
import { websitesDb } from "@/lib/db/websites";
import { n8nClient } from "@/lib/n8n/client";

export async function POST(request, { params }) {
  try {
    const { websiteId } = await params;
    const source = await websitesDb.getWebsiteSourceById(websiteId);
    if (!source) {
      return NextResponse.json({ success: false, error: "Website source not found" }, { status: 404 });
    }

    // Create new IngestionJob
    const job = await websitesDb.createIngestionJob(websiteId, source.botId, source.organizationId);

    // Trigger n8n workflow / crawler
    const dispatch = await n8nClient.triggerIngestionWorkflow({
      jobId: job.id,
      websiteSource: source,
      botId: source.botId,
      organizationId: source.organizationId,
    });

    return NextResponse.json({
      success: true,
      message: "Re-synchronization initiated",
      job,
      engine: dispatch.engine,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
