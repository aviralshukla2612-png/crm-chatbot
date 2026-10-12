import { NextResponse } from "next/server";
import { searchWebsiteKnowledge } from "@/lib/crawler/engine";
import { botsStore } from "@/lib/db/botsStore";
import { conversationsStore } from "@/lib/db/conversationsStore";
import { leadsStore } from "@/lib/db/leadsStore";
import {
  checkInputScopeAndSafety,
  buildMasterSystemPrompt,
  validateOutput,
  detectLanguage,
} from "@/lib/ai/masterPrompt";
import { extractLeadDetails } from "@/lib/ai/leadExtractor";
import { InferenceProvider } from "@/lib/ai/inferenceProvider";
import { WebhookDispatcher } from "@/lib/integrations/webhookDispatcher";
import { checkDomainAuthorization } from "@/lib/security/domainGuard";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

// --- PHASE 4: RATE LIMITING (Token-Bucket Sliding Window) ---
const rateLimitMap = new Map();
function checkRateLimit(ipOrId, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ipOrId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ipOrId, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= maxRequests) {
    const retrySec = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retrySec };
  }
  entry.count++;
  return { ok: true };
}

// --- PHASE 4: DOMAIN WHITELISTING (Origin Locking) ---
// Guard logic imported from @/lib/security/domainGuard

// --- PHASE 5: ASYNC LEAD WEBHOOK NOTIFICATION (HMAC SHA-256 + Backoff Retries) ---
function triggerLeadWebhookAsync(bot, leadPayload) {
  const webhookUrl = bot?.webhookUrl || process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) return;
  const webhookSecret = bot?.webhookSecret || process.env.LEAD_WEBHOOK_SECRET || "";

  WebhookDispatcher.dispatch({
    url: webhookUrl,
    secret: webhookSecret,
    event: "lead_captured",
    payload: {
      bot: { id: bot?.id, name: bot?.name, company: bot?.company },
      lead: leadPayload,
    },
    maxRetries: 3,
  }).catch((err) => console.warn("[LEAD_WEBHOOK_FAIL]", err.message));
}

// Dynamic model resolver for local Ollama
async function resolveOllamaModel() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const available = (data.models || []).map((m) => m.name);
      if (available.length > 0) {
        const oneB = available.find(
          (m) =>
            m.toLowerCase().includes("llama3.2:1b") ||
            m.toLowerCase().includes(":1b") ||
            m.toLowerCase().includes("1.5b") ||
            m.toLowerCase().includes(":0.5b")
        );
        if (oneB) return oneB;

        const preferred = process.env.CHAT_MODEL;
        if (preferred) {
          const match = available.find((m) => m.toLowerCase().includes(preferred.toLowerCase()));
          if (match) return match;
        }
        return available[0];
      }
    }
  } catch (err) {}
  return "llama3.2:1b";
}

// --- PHASE 2: UNIFIED INFERENCE PROVIDER ROUTER ---
async function executeChatInference({
  messages,
  temperature = 0.3,
  num_predict = 512,
  onToken = null,
}) {
  return await InferenceProvider.generate({
    messages,
    temperature,
    maxTokens: num_predict,
    stream: Boolean(onToken),
    onToken,
  });
}

// CORS Headers helper
function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Id, Accept");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

export async function POST(request, { params }) {
  try {
    const { botId } = await params;

    // --- PHASE 4: RATE LIMITING ---
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "global_client";
    const rateCheck = checkRateLimit(`${clientIp}_${botId}`, 40, 60000);
    if (!rateCheck.ok) {
      return corsResponse(
        NextResponse.json(
          { error: `Too many requests. Please wait ${rateCheck.retrySec} seconds.` },
          { status: 429, headers: { "Retry-After": String(rateCheck.retrySec) } }
        )
      );
    }

    const body = await request.json();
    const { message, history = [], visitor = {}, sessionId, stream: requestStream } = body;

    if (!message || typeof message !== "string") {
      return corsResponse(
        NextResponse.json({ error: "Message content is required" }, { status: 400 })
      );
    }

    // 1. Resolve Bot & Enforce Status
    const bot = botsStore.getBot(botId);
    if (!bot) {
      return corsResponse(
        NextResponse.json({ error: "Bot not found" }, { status: 404 })
      );
    }

    // --- PHASE 4: DOMAIN WHITELISTS ---
    const originHeader = request.headers.get("origin") || request.headers.get("referer");
    const domainCheck = checkDomainAuthorization(originHeader, bot?.allowedDomains);
    if (!domainCheck.allowed) {
      return corsResponse(
        NextResponse.json(
          { error: `Unauthorized domain. This chatbot cannot be embedded on ${domainCheck.host || "this origin"}.` },
          { status: 403 }
        )
      );
    }

    const botName = bot?.name || "AI Assistant";
    const businessName =
      bot?.company && bot?.company !== "My Organization"
        ? bot.company
        : "Emperor Smart Solutions";
    const tenantId = bot?.organizationId || botId;

    // 2. Step 1: Analyze Input Language (English, Hindi, or Hinglish)
    const lang = detectLanguage(message);

    // Step 2: Input Safety and Scope Check (Backend Guardrails)
    const safetyCheck = checkInputScopeAndSafety(message, businessName, lang);
    if (safetyCheck.blocked) {
      return corsResponse(
        NextResponse.json({
          success: true,
          reply: safetyCheck.reply,
          sources: [],
          sessionId: sessionId || `session_${botId}_${Date.now()}`,
        })
      );
    }

    // 3. Step 3: Resolve Persistent Database Conversation Memory (Sliding Window: 8 turns)
    const currentSessionId = sessionId || `session_${botId}_${Date.now()}`;
    const existingConv = conversationsStore.getConversation(currentSessionId);

    let sessionHistory = [];
    if (existingConv && Array.isArray(existingConv.messages)) {
      sessionHistory = existingConv.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));
    } else if (Array.isArray(history) && history.length > 0) {
      sessionHistory = history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    // 4. Step 4: Multi-Tenant Vector Search over Authorized Knowledge (Top 2 chunks for fast evaluation)
    const relevantChunks = await searchWebsiteKnowledge(botId, message, 2);
    const contextText = relevantChunks
      .map((c) => `[Source: ${c.pageTitle || c.pageUrl}]:\n${c.content}`)
      .join("\n\n");

    // 5. Step 5: Extract lead details and resolve visitor identity
    const leadDetails = extractLeadDetails(message, sessionHistory);

    let resolvedName = visitor?.name || "";
    if (!resolvedName && existingConv?.visitorName && existingConv.visitorName !== "Website Visitor" && existingConv.visitorName !== "Website Prospect") {
      resolvedName = existingConv.visitorName;
    }
    if (!resolvedName && leadDetails.name) {
      resolvedName = leadDetails.name;
    }

    const resolvedPhone = visitor?.phone || existingConv?.visitorPhone || leadDetails.phone || "";
    const resolvedEmail = visitor?.email || existingConv?.visitorEmail || leadDetails.email || "";

    const hasVisitorDetails = Boolean(
      resolvedPhone ||
      resolvedEmail ||
      (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") ||
      sessionHistory.some((m) =>
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(m.content || "") ||
        /(?:(?:\+|00)91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/.test(m.content || "")
      )
    );

    // Build Master System Prompt with personalized visitorName
    const masterSystemPrompt = buildMasterSystemPrompt({
      assistantName: botName,
      businessName: businessName,
      tenantId: tenantId,
      retrievedContext: contextText,
      chatHistory: "",
      customInstructions: bot?.systemPrompt || bot?.instructions || "",
      userLanguage: lang,
      collectLeads: bot?.collectLeads !== false,
      hasVisitorDetails,
      visitorName: resolvedName,
    });

    const llmMessages = [
      { role: "system", content: masterSystemPrompt },
      ...sessionHistory.slice(-8),
      { role: "user", content: message },
    ];

    // Fast-path deterministic handling for greetings and contact introductions
    const cleanLower = message.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const isPureGreeting = ["hi", "hii", "hello", "hey", "namaste", "greetings"].includes(cleanLower);
    const hasTechnicalKeywords = Boolean(message.toLowerCase().match(/\b(cost|price|quote|how much|build|flutter|app|website|software|ai|service|hire|develop|office|address|where|who)\b/i));
    const isContactSubmissionOnly = !hasTechnicalKeywords && (resolvedPhone || resolvedEmail) && ((leadDetails.phone && message.includes(leadDetails.phone)) || (resolvedName && message.toLowerCase().includes(resolvedName.toLowerCase())));

    let deterministicReply = null;
    if (isPureGreeting) {
      if (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
        deterministicReply = `Hi ${resolvedName}! Great to hear from you. How can Emperor Smart Solutions assist you with your project today?`;
      } else {
        deterministicReply = `Hello! Welcome to Emperor Smart Solutions. May I know your name and contact number (or WhatsApp) so I can assist you better and personalize our conversation?`;
      }
    } else if (isContactSubmissionOnly && resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
      deterministicReply = `Hi ${resolvedName}! Thank you for sharing your contact details. How can Emperor Smart Solutions help you with your project today? Are you looking to build a mobile app, web platform, or custom AI solution?`;
    }

    // --- PHASE 3: REAL-TIME SSE STREAMING (if requested) ---
    const isSseRequested =
      Boolean(requestStream) ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (isSseRequested) {
      if (deterministicReply) {
        conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
        conversationsStore.addMessage(currentSessionId, { role: "assistant", content: deterministicReply });
        if (resolvedName && resolvedName !== "Website Visitor" && existingConv) {
          conversationsStore.updateConversation(currentSessionId, {
            visitorName: resolvedName,
            visitorPhone: resolvedPhone || existingConv.visitorPhone,
            visitorEmail: resolvedEmail || existingConv.visitorEmail,
            isLead: Boolean(leadDetails.hasLeadData || resolvedEmail || resolvedPhone),
          });
        }
        if (leadDetails.hasLeadData || resolvedEmail || resolvedPhone || (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect")) {
          const leadData = {
            botId: bot?.id || "bot_aa",
            name: resolvedName || "Website Prospect",
            email: resolvedEmail,
            phone: resolvedPhone,
            company: bot?.company || "Direct Inbound",
            bot: botName,
            score: leadDetails.score,
            inquiry: leadDetails.inquiry,
            source: "Web Chatbot Widget",
          };
          leadsStore.createLead(leadData);
          triggerLeadWebhookAsync(bot, leadData);
        }
        return new Response(
          `data: ${JSON.stringify({ token: deterministicReply })}\n\ndata: [DONE]\n\n`,
          {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const responseStream = new TransformStream();
      const writer = responseStream.writable.getWriter();
      const encoder = new TextEncoder();

      let accumulatedReply = "";

      // Asynchronous streaming inference pipeline
      (async () => {
        try {
          accumulatedReply = await executeChatInference({
            messages: llmMessages,
            temperature: 0.3,
            num_predict: 512,
            onToken: (token) => {
              writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            },
          });

          // Post-validate output with resolvedName
          const validated = validateOutput(accumulatedReply, businessName, lang, botName, resolvedName);

          // Save message to conversation store
          conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
          conversationsStore.addMessage(currentSessionId, { role: "assistant", content: validated });

          if (resolvedName && resolvedName !== "Website Visitor" && existingConv) {
            conversationsStore.updateConversation(currentSessionId, {
              visitorName: resolvedName,
              visitorPhone: resolvedPhone || existingConv.visitorPhone,
              visitorEmail: resolvedEmail || existingConv.visitorEmail,
              isLead: Boolean(leadDetails.hasLeadData || resolvedEmail || resolvedPhone),
            });
          }

          // Check lead capture using robust multi-turn extractor
          if (leadDetails.hasLeadData || resolvedEmail || resolvedPhone || (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect")) {
            const leadData = {
              botId: bot?.id || "bot_aa",
              name: resolvedName || "Website Prospect",
              email: resolvedEmail,
              phone: resolvedPhone,
              company: bot?.company || "Direct Inbound",
              bot: botName,
              score: leadDetails.score,
              inquiry: leadDetails.inquiry,
              source: "Web Chatbot Widget",
            };
            leadsStore.createLead(leadData);
            triggerLeadWebhookAsync(bot, leadData);
          }

          writer.write(encoder.encode(`data: [DONE]\n\n`));
        } catch (streamErr) {
          writer.write(encoder.encode(`data: ${JSON.stringify({ token: " I'm ready to assist you. Please ask your question again!" })}\n\n`));
          writer.write(encoder.encode(`data: [DONE]\n\n`));
        } finally {
          writer.close();
        }
      })();

      return new Response(responseStream.readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // --- STANDARD JSON RESPONSE PIPELINE ---
    let botReply = deterministicReply;
    if (!botReply) {
      botReply = await executeChatInference({
        messages: llmMessages,
        temperature: 0.3,
        num_predict: 512,
      });

      botReply = validateOutput(botReply, businessName, lang, botName, resolvedName);
    }

    // Capture Lead using robust multi-turn extractor
    if (leadDetails.hasLeadData || resolvedEmail || resolvedPhone || (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect")) {
      const leadData = {
        botId: bot?.id || "bot_aa",
        name: resolvedName || "Website Prospect",
        email: resolvedEmail,
        phone: resolvedPhone,
        company: bot?.company || "Direct Inbound",
        bot: botName,
        score: leadDetails.score,
        inquiry: leadDetails.inquiry,
        source: "Web Chatbot Widget",
      };
      leadsStore.createLead(leadData);
      triggerLeadWebhookAsync(bot, leadData);
    }

    // Store conversation
    const reloadedConv = conversationsStore.getConversation(currentSessionId);
    if (reloadedConv) {
      conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
      conversationsStore.addMessage(currentSessionId, {
        role: "assistant",
        content: botReply,
      });
      if (resolvedName && resolvedName !== "Website Visitor") {
        conversationsStore.updateConversation(currentSessionId, {
          visitorName: resolvedName,
          visitorPhone: resolvedPhone || reloadedConv.visitorPhone,
          visitorEmail: resolvedEmail || reloadedConv.visitorEmail,
          isLead: Boolean(leadDetails.hasLeadData || resolvedEmail || resolvedPhone),
        });
      }
    } else {
      conversationsStore.createConversation({
        id: currentSessionId,
        botId: bot?.id || botId,
        botName: botName,
        visitorName: resolvedName || "Website Visitor",
        visitorEmail: resolvedEmail,
        visitorPhone: resolvedPhone,
        isLead: Boolean(leadDetails.hasLeadData || resolvedEmail || resolvedPhone),
        lastMessage: message,
        messages: [
          { role: "user", content: message, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
          { role: "assistant", content: botReply, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        ],
      });
    }

    return corsResponse(
      NextResponse.json({
        success: true,
        reply: botReply,
        sources: [],
        sessionId: currentSessionId,
      })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
