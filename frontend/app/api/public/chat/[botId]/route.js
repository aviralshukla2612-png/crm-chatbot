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
        // Prefer ultra-fast 1B models on CPU VPS
        const oneB = available.find((m) => m.toLowerCase().includes(":1b") || m.toLowerCase().includes("1.5b") || m.toLowerCase().includes(":0.5b"));
        if (oneB) return oneB;
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
    const businessName =
      bot?.company && bot?.company !== "My Organization"
        ? bot.company
        : (bot?.name && bot.name.length > 2 && !["aa", "ab", "test"].includes(bot.name.toLowerCase()) ? bot.name : "Daily Cashbook");
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

    // 3. Step 3: Resolve Persistent Database Conversation Memory
    const currentSessionId = sessionId || `session_${botId}_${Date.now()}`;
    const existingConv = conversationsStore.getConversation(currentSessionId);

    // Retrieve previous messages from database or fallback to request history
    let sessionHistory = [];
    if (existingConv && Array.isArray(existingConv.messages)) {
      sessionHistory = existingConv.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
    } else if (Array.isArray(history) && history.length > 0) {
      sessionHistory = history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    const formattedHistoryText = sessionHistory
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    // 4. Step 4: Multi-Tenant Vector Search over Authorized Knowledge
    const relevantChunks = await searchWebsiteKnowledge(botId, message, 4);
    const contextText = relevantChunks
      .map((c) => `[Source: ${c.pageTitle || c.pageUrl}]:\n${c.content}`)
      .join("\n\n");

    // 5. Step 5: Build Master System Prompt with Strict Language Adaptation
    const masterSystemPrompt = buildMasterSystemPrompt({
      assistantName: botName,
      businessName: businessName,
      tenantId: tenantId,
      retrievedContext: contextText,
      chatHistory: formattedHistoryText,
      customInstructions: bot?.systemPrompt || bot?.instructions || "",
      userLanguage: lang,
    });

    // 6. Step 5: Inference via Ollama (Temperature: 0.3 for natural conversational style)
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
          keep_alive: "24h", // Keep model preloaded in RAM, eliminating cold-start disk delay
          messages: [
            { role: "system", content: masterSystemPrompt },
            ...sessionHistory.slice(-4), // Keep active prompt lean for faster CPU evaluation
            { role: "user", content: message },
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 120, // Snappy answers, finishes generation in 1-2 seconds
            num_ctx: 1024,    // Faster prompt evaluation on CPU (4x speedup)
            num_thread: 4,    // Utilize multi-core CPU threads
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
        botReply =
          lang === "english"
            ? `Based on our verified knowledge: ${top.content.slice(0, 300)}...\n\nWould you like more details or assistance?`
            : `Hamari verified details ke mutabiq: ${top.content.slice(0, 300)}...\n\nAur details chahiye toh batao!`;
      } else {
        if (lang === "english") {
          botReply = `I couldn't find verified details about that for ${businessName}. Feel free to ask about our services, features, or pricing! 🚀`;
        } else if (lang === "hindi") {
          botReply = `मुझे ${businessName} के लिए इस बारे में पुष्टि की गई जानकारी नहीं मिली। आप हमारी सेवाओं या कीमतों के बारे में पूछ सकते हैं! 🚀`;
        } else {
          botReply = `Arrey bhai, iske baare mein mujhe confirmed details nahi mili. ${businessName} ke baare mein kuch pooch na! 💀🔥`;
        }
      }
    }

    // Step 5: Output Validation
    botReply = validateOutput(botReply, businessName, lang);

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

    // 7. Store conversation continuity in real-time
    const reloadedConv = conversationsStore.getConversation(currentSessionId);
    if (reloadedConv) {
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
