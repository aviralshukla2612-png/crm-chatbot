import { NextResponse } from "next/server";
import { botsStore } from "@/lib/db/botsStore";

export async function GET(request, { params }) {
  try {
    const { botId } = await params;
    const bot = (await botsStore.getBotAsync(botId)) || botsStore.getBot(botId);
    if (!bot) {
      return NextResponse.json({ success: false, error: "Bot not found" }, { status: 404 });
    }
    const res = NextResponse.json({ success: true, bot });
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { botId } = await params;
    const body = await request.json();
    const bot = botsStore.upsertBot({ ...body, id: botId });
    const res = NextResponse.json({ success: true, bot });
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { botId } = await params;
    botsStore.deleteBot(botId);
    const res = NextResponse.json({ success: true });
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
