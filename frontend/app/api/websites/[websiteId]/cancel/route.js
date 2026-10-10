import { NextResponse } from "next/server";
import { websitesDb } from "@/lib/db/websites";

export async function POST(request, { params }) {
  try {
    const { websiteId } = await params;
    const latestJob = await websitesDb.getLatestJobForSource(websiteId);
    if (latestJob && (latestJob.jobStatus === "Crawling" || latestJob.jobStatus === "Discovering" || latestJob.jobStatus === "Embedding")) {
      await websitesDb.updateIngestionJob(latestJob.id, {
        jobStatus: "Cancelled",
        currentStep: "Synchronization cancelled by user",
        finishedAt: new Date().toISOString(),
      });
      await websitesDb.updateWebsiteSource(websiteId, { status: "Paused" });
    }

    return NextResponse.json({ success: true, message: "Synchronization cancelled" });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
