import { NextResponse } from "next/server";
import { conversationsStore } from "@/lib/db/conversationsStore";
import { requireAuth } from "@/lib/auth/guard";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { principal } = auth;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "All";
    const onlyLeads = searchParams.get("onlyLeads") === "true";
    const search = searchParams.get("search") || "";
    const botId = searchParams.get("botId") || "All";

    // Strictly filter conversations by authenticated organizationId
    const conversations = conversationsStore.getConversations({
      organizationId: principal.organizationId,
      status,
      onlyLeads,
      search,
      botId,
    });

    return NextResponse.json({
      success: true,
      conversations,
      total: conversations.length,
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

    // Bind conversation to caller's organizationId
    body.organizationId = principal.organizationId;
    const newConv = conversationsStore.createConversation(body);

    return NextResponse.json({
      success: true,
      conversation: newConv,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
