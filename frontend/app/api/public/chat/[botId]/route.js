import { NextResponse } from "next/server";
import { searchWebsiteKnowledge } from "@/lib/crawler/engine";
import { botsStore } from "@/lib/db/botsStore";
import { conversationsStore } from "@/lib/db/conversationsStore";
import { leadsStore } from "@/lib/db/leadsStore";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const CHAT_MODEL = process.env.CHAT_MODEL || "llama3.2:1b";

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
    const systemPrompt =
      bot?.systemPrompt ||
      `You are ${botName}, a helpful and polite customer assistant. Answer visitor inquiries accurately using the provided website knowledge. Always be professional, concise, and helpful.`;

    // 2. Multi-Tenant Vector Search over Website Knowledge
    const relevantChunks = await searchWebsiteKnowledge(botId, message, 3);
    const contextText = relevantChunks
      .map((c) => `[Source: ${c.pageTitle || c.pageUrl}]:\n${c.content}`)
      .join("\n\n");

    const promptWithContext = `SYSTEM INSTRUCTIONS:
${systemPrompt}

${
  contextText
    ? `VERIFIED WEBSITE KNOWLEDGE:
${contextText}

Use the verified website knowledge above to answer the visitor's question accurately. If the information is not in the knowledge base, politely state that you can connect them with a human specialist.`
    : "Answer politely and ask how you can help."
}

VISITOR QUERY:
${message}`;

    // 3. Inference via Ollama or Intelligent RAG Generator
    let botReply = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            { role: "system", content: promptWithContext },
            ...history.slice(-4),
            { role: "user", content: message },
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 200,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        botReply = data.message?.content || "";
      }
    } catch (llmErr) {
      // Ollama offline fallback
    }

    // High quality contextual fallback if Ollama container is offline
    if (!botReply) {
      if (relevantChunks.length > 0) {
        const top = relevantChunks[0];
        botReply = `Based on our verified knowledge: ${top.content.slice(0, 280)}...\n\nWould you like more details or assistance booking an appointment/consultation?`;
      } else {
        botReply = `Thank you for reaching out! We'd be glad to assist you with your inquiry. Feel free to leave your contact details or ask any questions about our services.`;
      }
    }

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
