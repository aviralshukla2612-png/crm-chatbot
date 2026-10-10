import { NextResponse } from "next/server";
import { searchWebsiteKnowledge } from "@/lib/crawler/engine";
import { botsStore } from "@/lib/db/botsStore";
import { conversationsStore } from "@/lib/db/conversationsStore";
import { leadsStore } from "@/lib/db/leadsStore";
import {
  checkInputScopeAndSafety,
  buildMasterSystemPrompt,
  validateOutput,
} from "@/lib/ai/masterPrompt";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

// Dynamic model resolver
async function resolveOllamaModel() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const available = (data.models || []).map((m) => m.name);
      if (available.length > 0) {
        const preferred = process.env.CHAT_MODEL;
        if (preferred) {
          const match = available.find((m) => m.toLowerCase().includes(preferred.toLowerCase()));
          if (match) return match;
        }
        const qwen = available.find((m) => m.toLowerCase().includes("qwen"));
        if (qwen) return qwen;
        const llama = available.find((m) => m.toLowerCase().includes("llama"));
        if (llama) return llama;
        const chatModel = available.find((m) => !m.toLowerCase().includes("embed"));
        if (chatModel) return chatModel;
        return available[0];
      }
    }
  } catch (err) {
    // Ollama tags query fallback
  }
  return process.env.CHAT_MODEL || "qwen2.5:3b";
}

// CORS Headers helper
function corsResponse(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Bot-Id");
  return res;
}

export async function OPTIONS() {
  return corsResponse(new NextResponse(null, { status: 204 }));
}

export async function POST(request, { params }) {
  try {
    const { botId } = await params;
    const body = await request.json();
    const { message, history = [], visitor = {}, sessionId } = body;

    if (!message || typeof message !== "string") {
      return corsResponse(
        NextResponse.json({ error: "Message content is required" }, { status: 400 })
      );
    }

    // 1. Resolve Bot & Enforce Status
    const bot = botsStore.getBot(botId);
    const botName = bot?.name || "AI Assistant";
    const businessName = bot?.company || bot?.companyName || botName;
    const tenantId = bot?.organizationId || botId;

    // 2. Step 1: Input Safety and Scope Check (Backend Guardrails)
    const safetyCheck = checkInputScopeAndSafety(message, businessName);
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

    // 3. Step 2: Multi-Tenant Vector Search over Authorized Knowledge
    const relevantChunks = await searchWebsiteKnowledge(botId, message, 4);
    const contextText = relevantChunks
      .map((c) => `[Source: ${c.pageTitle || c.pageUrl}]:\n${c.content}`)
      .join("\n\n");

    // 4. Step 3: Build Master System Prompt with RAG Context
    const masterSystemPrompt = buildMasterSystemPrompt({
      assistantName: botName,
      businessName: businessName,
      tenantId: tenantId,
      retrievedContext: contextText,
      customInstructions: bot?.systemPrompt || bot?.instructions || "",
    });

    // 5. Step 4: Inference via Ollama (Low temperature for strict factual adherence)
    let botReply = "";
    try {
      const activeModel = await resolveOllamaModel();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: "system", content: masterSystemPrompt },
            ...history.slice(-4),
            { role: "user", content: message },
          ],
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 250,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        botReply = data.message?.content || "";
      } else {
        console.error("[OLLAMA_ERROR_STATUS]", ollamaRes.status);
      }
    } catch (llmErr) {
      console.error("[OLLAMA_FETCH_ERROR]", llmErr.message);
    }

    // Context-aware fallback if Ollama container is offline or cold starting
    if (!botReply) {
      if (relevantChunks.length > 0) {
        const top = relevantChunks[0];
        botReply = `Based on our verified knowledge: ${top.content.slice(0, 300)}...\n\nWould you like more details or assistance?`;
      } else {
        botReply = `I couldn't find verified information about that in our available resources. Please contact our team for further assistance.`;
      }
    }

    // Step 5: Output Validation
    botReply = validateOutput(botReply, businessName);

    // 4. Capture Lead if Visitor Details Provided or extracted from message
    const emailInMsg = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneInMsg = message.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const hasContact = visitor.email || visitor.phone || emailInMsg || phoneInMsg;

    if (hasContact || visitor.name) {
      leadsStore.createLead({
        name: visitor.name || (emailInMsg ? emailInMsg[0].split("@")[0] : "Website Visitor"),
        email: visitor.email || (emailInMsg ? emailInMsg[0] : ""),
        phone: visitor.phone || (phoneInMsg ? phoneInMsg[0] : ""),
        company: "Website Embed Visitor",
        bot: botName,
        score: "High",
        inquiry: message,
        source: "Web Chatbot Widget",
      });
    }

    // 5. Store conversation continuity in real-time
    const currentSessionId = sessionId || `session_${botId}_${Date.now()}`;
    const existingConv = conversationsStore.getConversation(currentSessionId);

    if (existingConv) {
      conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
      conversationsStore.addMessage(currentSessionId, {
        role: "assistant",
        content: botReply,
        sources: relevantChunks.map((c) => ({ title: c.pageTitle, url: c.pageUrl })),
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

    const sources = relevantChunks.map((c) => ({
      title: c.pageTitle,
      url: c.pageUrl,
    }));

    return corsResponse(
      NextResponse.json({
        success: true,
        reply: botReply,
        sources: sources,
        sessionId: currentSessionId,
      })
    );
  } catch (err) {
    return corsResponse(
      NextResponse.json({ success: false, error: err.message }, { status: 500 })
    );
  }
}
