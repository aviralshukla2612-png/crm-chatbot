import { NextResponse } from "next/server";
import { POST as handleChatPost } from "../public/chat/[botId]/route";

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Id, Accept");
  return res;
}

export async function POST(request) {
  try {
    const clone = request.clone();
    const body = await clone.json().catch(() => ({}));
    const botId = body.botId || "bot_aa";
    return await handleChatPost(request, { params: Promise.resolve({ botId }) });
  } catch (err) {
    return await handleChatPost(request, { params: Promise.resolve({ botId: "bot_aa" }) });
  }
}
