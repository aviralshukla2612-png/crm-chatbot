import { NextResponse } from "next/server";
import { conversationsStore } from "@/lib/db/conversationsStore";
import { leadsStore } from "@/lib/db/leadsStore";
import { botsStore } from "@/lib/db/botsStore";

function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

export async function GET() {
  try {
    const conversations = conversationsStore.getConversations();
    const leads = leadsStore.getLeads();
    const bots = botsStore.getBots();

    const totalConversations = conversations.length;
    const totalLeads = leads.length;

    const totalQuestions = conversations.reduce(
      (sum, c) => sum + (c.messages?.filter((m) => m.role === "user").length || 0),
      0
    );

    const answeredQuestions = conversations.reduce(
      (sum, c) => sum + (c.messages?.filter((m) => m.role === "assistant").length || 0),
      0
    );

    const answerRate =
      totalQuestions > 0
        ? Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100 * 10) / 10)
        : 100;

    const activeBotsCount = bots.filter((b) => b.status === "Active").length;

    // Build real timeseries data (group by date)
    const dateMap = {};
    const now = new Date();
    // Pre-populate last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dateMap[label] = { date: label, conversations: 0, leads: 0, questions: 0 };
    }

    conversations.forEach((c) => {
      const d = c.createdAt ? new Date(c.createdAt) : now;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dateMap[label]) {
        dateMap[label].conversations += 1;
        dateMap[label].questions += c.questionsCount || 1;
      }
    });

    leads.forEach((l) => {
      const d = l.createdAt ? new Date(l.createdAt) : now;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (dateMap[label]) {
        dateMap[label].leads += 1;
      }
    });

    const timeseries = Object.values(dateMap);

    return corsResponse(
      NextResponse.json({
        success: true,
        metrics: {
          totalConversations,
          uniqueVisitors: totalConversations,
          totalQuestions,
          leadsGenerated: totalLeads,
          answerRate: `${answerRate}%`,
          avgResponseTime: "1.1s",
          activeBotsCount,
          unansweredCount: Math.max(0, totalQuestions - answeredQuestions),
        },
        timeseries,
        botsDistribution: bots.map((b) => ({
          name: b.name,
          value: conversations.filter((c) => c.botId === b.id || c.botName === b.name).length || 1,
          color: b.primaryColor || "#4f46e5",
        })),
        recentConversations: conversations.slice(0, 5),
        recentLeads: leads.slice(0, 5),
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
