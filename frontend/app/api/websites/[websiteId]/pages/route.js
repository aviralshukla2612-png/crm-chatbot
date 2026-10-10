import { NextResponse } from "next/server";
import { websitesDb } from "@/lib/db/websites";

export async function GET(request, { params }) {
  try {
    const { websiteId } = await params;
    const pages = await websitesDb.getPagesForWebsite(websiteId);
    return NextResponse.json({ success: true, pages });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
