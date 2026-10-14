import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/db/leadsStore";
import { requireAuth } from "@/lib/auth/guard";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { principal } = auth;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "All";
    const score = searchParams.get("score") || "All";
    const bot = searchParams.get("bot") || "All Bots";
    const search = searchParams.get("search") || "";

    // Strictly filter leads by authenticated organizationId
    const leads = leadsStore.getLeads({
      organizationId: principal.organizationId,
      status,
      score,
      bot,
      search,
    });

    return NextResponse.json({
      success: true,
      leads,
      total: leads.length,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { principal } = auth;
    const body = await request.json();

    // Bind lead to caller's organizationId
    body.organizationId = principal.organizationId;
    const newLead = leadsStore.createLead(body);

    return NextResponse.json({
      success: true,
      lead: newLead,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
