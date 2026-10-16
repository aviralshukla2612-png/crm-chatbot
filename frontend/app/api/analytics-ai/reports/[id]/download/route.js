import { NextResponse } from "next/server";
import fs from "fs";
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

    // Verify report ownership or admin privilege
    if (report.organizationId !== principal.organizationId) {
      return NextResponse.json({ success: false, error: "FORBIDDEN: Cross-tenant report access denied." }, { status: 403 });
    }

    if (!fs.existsSync(report.filePath)) {
      return NextResponse.json({ success: false, error: "PDF_FILE_MISSING_ON_SERVER" }, { status: 410 });
    }

    const fileBuffer = fs.readFileSync(report.filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.fileName || "analytics_report.pdf"}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
