import { NextResponse } from "next/server";
import { conversationsStore } from "@/lib/db/conversationsStore";

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
    const conversation = conversationsStore.getConversation(id);
    if (!conversation) {
      return corsResponse(
        NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 })
      );
    }
    return corsResponse(NextResponse.json({ success: true, conversation }));
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
    const updated = conversationsStore.updateConversation(id, body);
    if (!updated) {
      return corsResponse(
        NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 })
      );
    }
    return corsResponse(NextResponse.json({ success: true, conversation: updated }));
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    conversationsStore.deleteConversation(id);
    return corsResponse(NextResponse.json({ success: true }));
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
