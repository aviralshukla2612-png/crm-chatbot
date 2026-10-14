import { NextResponse } from "next/server";
import { botsStore } from "@/lib/db/botsStore";

function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Id");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

export async function GET(request, { params }) {
  try {
    const { botId } = await params;
    const resolvedBotId =
      botId === "default" ||
      botId === "preview" ||
      botId === "demo" ||
      botId === "undefined" ||
      botId === "bot_1791618269632"
        ? "bot_aa"
        : botId;

    let bot = (await botsStore.getBotAsync(resolvedBotId)) || botsStore.getBot(resolvedBotId);
    if (!bot) {
      bot = (await botsStore.getBotAsync("bot_aa")) || botsStore.getBot("bot_aa");
    }

    if (!bot) {
      return corsResponse(
        NextResponse.json({
          success: true,
          bot: {
            id: botId,
            name: "AI Assistant",
            avatar: "🤖",
            primaryColor: "#4f46e5",
            welcomeMessage: "Hi there! How can I assist you today?",
            launcherPosition: "bottom-right",
            brandingEnabled: true,
          },
        })
      );
    }

    return corsResponse(
      NextResponse.json({
        success: true,
        bot: {
          id: bot.id,
          name: bot.name || "AI Assistant",
          avatar: bot.avatar || "🤖",
          primaryColor: bot.primaryColor || "#4f46e5",
          welcomeMessage: bot.welcomeMessage || `Hello! I am ${bot.name}. How can I help you today?`,
          launcherPosition: bot.launcherPosition || "bottom-right",
          brandingEnabled: bot.brandingEnabled !== false,
          placeholderText: bot.placeholderText || "Type your message...",
        },
      })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
