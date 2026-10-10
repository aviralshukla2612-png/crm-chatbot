import { NextResponse } from "next/server";
import { n8nClient } from "@/lib/n8n/client";
import { websitesDb } from "@/lib/db/websites";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("X-Nexus-Auth");
    if (!n8nClient.verifyCallbackSecret(authHeader)) {
      return NextResponse.json({ error: "Unauthorized callback" }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobId,
      websiteId,
      status,
      currentStep,
      progress,
      discoveredCount,
      indexedCount,
      failedCount,
      errorDetails,
    } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const updates = {};
    if (status) updates.jobStatus = status;
    if (currentStep) updates.currentStep = currentStep;
    if (progress !== undefined) updates.progress = progress;
    if (discoveredCount !== undefined) updates.discoveredCount = discoveredCount;
    if (indexedCount !== undefined) updates.indexedCount = indexedCount;
    if (failedCount !== undefined) updates.failedCount = failedCount;
    if (errorDetails) updates.errorDetails = errorDetails;

    if (status === "Completed" || status === "Failed") {
      updates.finishedAt = new Date().toISOString();
    }

    await websitesDb.updateIngestionJob(jobId, updates);

    if (websiteId && (status === "Completed" || status === "Failed")) {
      await websitesDb.updateWebsiteSource(websiteId, {
        status: status === "Completed" ? "Ready" : "Failed",
        lastSyncedAt: new Date().toISOString(),
        lastError: errorDetails || null,
      });
    }

    return NextResponse.json({ success: true, message: "Progress updated" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
