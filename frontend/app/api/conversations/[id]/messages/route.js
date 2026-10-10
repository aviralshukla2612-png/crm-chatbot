import { NextResponse } from "next/server";
import { conversationsStore } from "@/lib/db/conversationsStore";

function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.content && !body.text) {
      return corsResponse(
        NextResponse.json({ success: false, error: "Message content is required" }, { status: 400 })
      );
    }

    const result = conversationsStore.addMessage(id, {
      role: body.role || "assistant",
      content: body.content || body.text,
      sources: body.sources || [],
    });

    return corsResponse(
      NextResponse.json({
        success: true,
        message: result.message,
        conversation: result.conversation,
      })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
