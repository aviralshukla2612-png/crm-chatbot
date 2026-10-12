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
function checkDomainAuthorization(request, bot) {
  const allowed = bot?.allowedDomains;
  if (!Array.isArray(allowed) || allowed.length === 0 || allowed.includes("*")) {
    return { allowed: true };
  }
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return { allowed: true }; // allow direct server/curl calls
  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    const isMatch = allowed.some((d) => {
      const clean = d.trim().toLowerCase();
      return originHost === clean || originHost.endsWith(`.${clean}`);
    });
    return { allowed: isMatch, host: originHost };
  } catch (e) {
    return { allowed: true };
  }
}

// --- PHASE 5: ASYNC LEAD WEBHOOK NOTIFICATION ---
function triggerLeadWebhookAsync(bot, leadPayload) {
  const webhookUrl = bot?.webhookUrl || process.env.LEAD_WEBHOOK_URL;
  if (!webhookUrl) return;
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "lead_captured",
      timestamp: new Date().toISOString(),
      bot: { id: bot?.id, name: bot?.name, company: bot?.company },
      lead: leadPayload,
    }),
    signal: AbortSignal.timeout(5000),
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

// --- PHASE 2: HYBRID INFERENCE ROUTER (Groq LPU Cloud + Local Ollama Fallback) ---
async function executeChatInference({
  messages,
  temperature = 0.3,
  num_predict = 512,
  onToken = null,
}) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  // 1. If GROQ_API_KEY is configured, route to Groq LPU (500+ tokens/sec, massive concurrency)
  if (GROQ_API_KEY) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages,
          temperature,
          max_tokens: num_predict,
          stream: Boolean(onToken),
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (groqRes.ok) {
        if (onToken && groqRes.body) {
          const reader = groqRes.body.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    fullText += delta;
                    onToken(delta);
                  }
                } catch (e) {}
              }
            }
          }
          return fullText;
        } else {
          const data = await groqRes.json();
          return data.choices?.[0]?.message?.content || "";
        }
      }
    } catch (err) {
      console.warn("[GROQ_FALLBACK_TO_OLLAMA]", err.message);
    }
  }

  // 2. Primary / Local Fallback: Local Ollama
  const activeModel = await resolveOllamaModel();
  const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: activeModel,
      keep_alive: "24h",
      messages,
      stream: Boolean(onToken),
      options: {
        temperature,
        num_predict,
        num_ctx: 2048,
        stop: ["\nUser:", "User:", "\nHuman:", "\nAssistant:", "\nYou:", "<|eot_id|>"],
      },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!ollamaRes.ok) {
    throw new Error(`Ollama error HTTP ${ollamaRes.status}`);
  }

  if (onToken && ollamaRes.body) {
    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            const json = JSON.parse(trimmed);
            const token = json.message?.content || "";
            if (token) {
              fullText += token;
              onToken(token);
            }
          } catch (e) {}
        }
      }
    }
    return fullText;
  } else {
    const data = await ollamaRes.json();
    return data.message?.content || "";
  }
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
    const domainCheck = checkDomainAuthorization(request, bot);
    if (!domainCheck.allowed) {
      return corsResponse(
        NextResponse.json(
          { error: `Unauthorized domain. This chatbot cannot be embedded on ${domainCheck.host}.` },
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

    // 5. Step 5: Build Master System Prompt
    const masterSystemPrompt = buildMasterSystemPrompt({
      assistantName: botName,
      businessName: businessName,
      tenantId: tenantId,
      retrievedContext: contextText,
      chatHistory: "",
      customInstructions: bot?.systemPrompt || bot?.instructions || "",
      userLanguage: lang,
    });

    const llmMessages = [
      { role: "system", content: masterSystemPrompt },
      ...sessionHistory.slice(-8),
      { role: "user", content: message },
    ];

    // --- PHASE 3: REAL-TIME SSE STREAMING (if requested) ---
    const isSseRequested =
      Boolean(requestStream) ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (isSseRequested) {
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

          // Post-validate output
          const validated = validateOutput(accumulatedReply, businessName, lang, botName);

          // Save message to conversation store
          conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
          conversationsStore.addMessage(currentSessionId, { role: "assistant", content: validated });

          // Check lead capture using robust multi-turn extractor
          const leadDetails = extractLeadDetails(message, sessionHistory);
          if (leadDetails.hasLeadData || visitor.email || visitor.phone) {
            const leadData = {
              name: visitor.name || leadDetails.name,
              email: visitor.email || leadDetails.email,
              phone: visitor.phone || leadDetails.phone,
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
    let botReply = await executeChatInference({
      messages: llmMessages,
      temperature: 0.3,
      num_predict: 512,
    });

    botReply = validateOutput(botReply, businessName, lang, botName);

    // Capture Lead using robust multi-turn extractor
    const leadDetails = extractLeadDetails(message, sessionHistory);
    if (leadDetails.hasLeadData || visitor.email || visitor.phone) {
      const leadData = {
        name: visitor.name || leadDetails.name,
        email: visitor.email || leadDetails.email,
        phone: visitor.phone || leadDetails.phone,
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
    } else {
      conversationsStore.createConversation({
        id: currentSessionId,
        botId: bot?.id || botId,
        botName: botName,
        visitorName: visitor.name || (emailInMsg ? emailInMsg[0].split("@")[0] : "Website Visitor"),
        visitorEmail: visitor.email || (emailInMsg ? emailInMsg[0] : ""),
        visitorPhone: visitor.phone || (phoneInMsg ? phoneInMsg[0] : ""),
        isLead: Boolean(hasContact),
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
