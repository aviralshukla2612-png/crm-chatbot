import { NextResponse } from "next/server";
import { botsStore } from "@/lib/db/botsStore";

export async function GET() {
  try {
    const bots = botsStore.getBots();
    const res = NextResponse.json({ success: true, bots });
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const bot = botsStore.upsertBot(body);
    const res = NextResponse.json({ success: true, bot });
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
