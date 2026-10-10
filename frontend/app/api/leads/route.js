import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/db/leadsStore";

function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "All";
    const score = searchParams.get("score") || "All";
    const bot = searchParams.get("bot") || "All Bots";
    const search = searchParams.get("search") || "";

    const leads = leadsStore.getLeads({ status, score, bot, search });

    return corsResponse(
      NextResponse.json({
        success: true,
        leads,
        total: leads.length,
      })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newLead = leadsStore.createLead(body);
    return corsResponse(
      NextResponse.json({
        success: true,
        lead: newLead,
      })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
