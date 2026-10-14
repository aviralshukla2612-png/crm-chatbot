import { NextResponse } from "next/server";
import { botsStore } from "@/lib/db/botsStore";
import { visitorsStore } from "@/lib/db/visitorsStore";
import { conversationsStore } from "@/lib/db/conversationsStore";
import { checkDomainAuthorization } from "@/lib/security/domainGuard";

function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Id, X-Visitor-Token, Accept");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

function resolveCookieName(botId) {
  const cleanId = (botId || "default").replace(/[^a-zA-Z0-9_]/g, "_");
  return `ess_visitor_${cleanId}`;
}

function extractVisitorToken(request, botId, body = null) {
  // 1. From Cookie
  const cookieName = resolveCookieName(botId);
  const cookieVal = request.cookies.get(cookieName)?.value;
  if (cookieVal && cookieVal.length >= 16) return cookieVal.trim();

  // 2. From Custom Header (first-party/widget fallback when cookies blocked)
  const headerVal = request.headers.get("x-visitor-token");
  if (headerVal && headerVal.length >= 16) return headerVal.trim();

  // 3. From Request Body (if provided)
  if (body && body.visitorToken && typeof body.visitorToken === "string") {
    return body.visitorToken.trim();
  }

  return null;
}

function setVisitorCookie(response, botId, rawToken) {
  const cookieName = resolveCookieName(botId);
  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: cookieName,
    value: rawToken,
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60, // 1 Year Persistent Identity
  });
}

/**
 * GET & POST: Initialize or resolve visitor session, 24-hour chat history, and customer memory
 */
async function handleSession(request, { params }) {
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
    if (!bot && (botId === "bot_1791618269632" || botId?.startsWith("bot_17916"))) {
      bot = (await botsStore.getBotAsync("bot_aa")) || botsStore.getBot("bot_aa");
    }

    if (!bot) {
      return corsResponse(
        NextResponse.json({ success: false, error: "Bot not found" }, { status: 404 })
      );
    }

    // Domain origin check
    const originHeader = request.headers.get("origin") || request.headers.get("referer");
    const domainCheck = checkDomainAuthorization(originHeader, bot?.allowedDomains);
    if (!domainCheck.allowed) {
      return corsResponse(
        NextResponse.json(
          { success: false, error: "Unauthorized domain origin" },
          { status: 403 }
        )
      );
    }

    let requestBody = null;
    if (request.method === "POST") {
      try {
        requestBody = await request.json();
      } catch (e) {}
    }

    const providedToken = extractVisitorToken(request, bot.id, requestBody);
    let visitor = null;
    let isReturning = false;

    if (providedToken) {
      visitor = await visitorsStore.getVisitorByTokenAsync(bot.id, providedToken) ||
                visitorsStore.getVisitorByToken(bot.id, providedToken);
      if (visitor) {
        isReturning = true;
        visitorsStore.recordActivity(visitor.id);
      }
    }

    // If new visitor, create persistent visitor record & token
    let visitorTokenToReturn = providedToken;
    let isNewTokenIssued = false;

    if (!visitor) {
      const created = visitorsStore.createVisitor({
        organizationId: bot.organizationId || "org_ess_default",
        botId: bot.id,
      });
      visitor = created.visitor;
      visitorTokenToReturn = created.rawToken;
      isNewTokenIssued = true;
    }

    // Check for active conversation within 24-hour window
    const activeConv = conversationsStore.getActiveConversationForVisitor(visitor.id, bot.id);
    const latestConv = conversationsStore.getLatestConversationForVisitor(visitor.id, bot.id);

    let resPayload = {};

    if (activeConv) {
      // Returning visitor within 24-hour window: RESTORE CHAT HISTORY
      resPayload = {
        success: true,
        isReturning: true,
        hasActiveChat: true,
        conversationId: activeConv.id,
        messages: activeConv.messages || [],
        qualification: activeConv.qualification || null,
        visitor: {
          id: visitor.id,
          name: visitor.name || activeConv.visitorName || "",
          email: visitor.email || activeConv.visitorEmail || "",
          phone: visitor.phone || activeConv.visitorPhone || "",
        },
        expiresAt: activeConv.historyExpiresAt,
        visitorToken: visitorTokenToReturn,
      };
    } else {
      // Visitor returning after 24h (or brand new): START FRESH CONVERSATION
      // Do NOT restore expired messages, but preserve recognized visitor profile and qualification
      const newConv = conversationsStore.createConversation({
        visitorId: visitor.id,
        organizationId: bot.organizationId || "org_ess_default",
        botId: bot.id,
        botName: bot.name || "AI Assistant",
        visitorName: visitor.name || latestConv?.visitorName || "Website Visitor",
        visitorEmail: visitor.email || latestConv?.visitorEmail || "",
        visitorPhone: visitor.phone || latestConv?.visitorPhone || "",
        qualification: latestConv?.qualification || null,
        messages: [],
      });

      const hasRecognizedName = Boolean(visitor.name && visitor.name !== "Website Visitor" && visitor.name !== "Website Prospect");
      let returningGreeting = null;

      if (isReturning && hasRecognizedName) {
        const serviceName = latestConv?.qualification?.service
          ? latestConv.qualification.service.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : "";
        returningGreeting = serviceName
          ? `Welcome back, ${visitor.name}! It's great to see you again. Would you like to continue discussing your ${serviceName} project, or explore something new?`
          : `Welcome back, ${visitor.name}! It's great to have you back. How can we assist you with your project today?`;
      }

      resPayload = {
        success: true,
        isReturning,
        hasActiveChat: false,
        conversationId: newConv.id,
        messages: [],
        qualification: latestConv?.qualification || null,
        returningGreeting,
        visitor: {
          id: visitor.id,
          name: visitor.name || "",
          email: visitor.email || "",
          phone: visitor.phone || "",
        },
        visitorToken: visitorTokenToReturn,
      };
    }

    const response = corsResponse(NextResponse.json(resPayload));
    if (isNewTokenIssued && visitorTokenToReturn) {
      setVisitorCookie(response, bot.id, visitorTokenToReturn);
    }
    return response;
  } catch (err) {
    console.error("[CHAT_SESSION_ERROR]", err);
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}

/**
 * DELETE: Visitor explicitly requests "Start new chat" or resets session
 * Closes active conversation without deleting retained CRM leads
 */
export async function DELETE(request, { params }) {
  try {
    const { botId } = await params;
    const resolvedBotId = botId === "default" ? "bot_aa" : botId;
    const bot = (await botsStore.getBotAsync(resolvedBotId)) || botsStore.getBot(resolvedBotId);
    if (!bot) {
      return corsResponse(
        NextResponse.json({ success: false, error: "Bot not found" }, { status: 404 })
      );
    }

    const token = extractVisitorToken(request, bot.id);
    if (token) {
      const visitor = await visitorsStore.getVisitorByTokenAsync(bot.id, token) ||
                      visitorsStore.getVisitorByToken(bot.id, token);
      if (visitor) {
        const activeConv = conversationsStore.getActiveConversationForVisitor(visitor.id, bot.id);
        if (activeConv) {
          conversationsStore.closeConversation(activeConv.id);
        }

        // Create a new clean conversation for the visitor
        const newConv = conversationsStore.createConversation({
          visitorId: visitor.id,
          organizationId: bot.organizationId || "org_ess_default",
          botId: bot.id,
          visitorName: visitor.name || "Website Visitor",
          visitorEmail: visitor.email || "",
          visitorPhone: visitor.phone || "",
          messages: [],
        });

        return corsResponse(
          NextResponse.json({
            success: true,
            message: "Active conversation closed. Started new chat.",
            conversationId: newConv.id,
            messages: [],
          })
        );
      }
    }

    return corsResponse(
      NextResponse.json({ success: true, message: "Session reset." })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}

export async function GET(request, context) {
  return handleSession(request, context);
}

export async function POST(request, context) {
  return handleSession(request, context);
}
