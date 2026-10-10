import { NextResponse } from "next/server";
import { websitesDb } from "@/lib/db/websites";

export async function GET(request, { params }) {
  try {
    const { websiteId } = await params;
    const source = await websitesDb.getWebsiteSourceById(websiteId);
    if (!source) {
      return NextResponse.json({ success: false, error: "Website source not found" }, { status: 404 });
    }

    const latestJob = await websitesDb.getLatestJobForSource(websiteId);
    const pages = await websitesDb.getPagesForWebsite(websiteId);

    return NextResponse.json({
      success: true,
      source,
      latestJob,
      pagesCount: pages.length,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { websiteId } = await params;
    const deleted = await websitesDb.deleteWebsiteSource(websiteId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Website source not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Website knowledge deleted successfully" });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
