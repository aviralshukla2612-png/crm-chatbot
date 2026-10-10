import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/db/leadsStore";

function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const lead = leadsStore.getLead(id);
    if (!lead) {
      return corsResponse(
        NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 })
      );
    }
    return corsResponse(NextResponse.json({ success: true, lead }));
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = leadsStore.updateLeadStatus(id, body.status);
    if (!updated) {
      return corsResponse(
        NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 })
      );
    }
    return corsResponse(NextResponse.json({ success: true, lead: updated }));
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    leadsStore.deleteLead(id);
    return corsResponse(NextResponse.json({ success: true }));
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
