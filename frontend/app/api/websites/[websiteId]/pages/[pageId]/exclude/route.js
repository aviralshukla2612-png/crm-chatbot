import { NextResponse } from "next/server";
import { websitesDb } from "@/lib/db/websites";

export async function POST(request, { params }) {
  try {
    const { websiteId, pageId } = await params;
    const body = await request.json();
    const { excluded } = body;

    const updated = await websitesDb.togglePageExclusion(websiteId, pageId, Boolean(excluded));
    if (!updated) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, page: updated });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
