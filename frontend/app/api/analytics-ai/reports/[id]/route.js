import { NextResponse } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/auth/guard";
import { analyticsStore } from "@/lib/db/analyticsStore";

export async function GET(request, { params }) {
  try {
    const principal = await getAuthenticatedPrincipal(request);
    if (!principal || !principal.authenticated) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const report = await analyticsStore.getReport(id, principal.organizationId);
    if (!report) {
      return NextResponse.json({ success: false, error: "REPORT_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
