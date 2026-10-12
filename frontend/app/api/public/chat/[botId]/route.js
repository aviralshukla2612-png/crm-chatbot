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

    const isCompanyEmail = (em) =>
      /emperorsmartsolutions\.com|emperorsmartsolutions@gmail\.com|^contact@|^sales@|^info@|^support@|^careers@/i.test(em || "");
    const isCompanyPhone = (ph) => /63591\s*20081/.test((ph || "").replace(/\D/g, ""));

    let resolvedPhone = "";
    if (visitor?.phone && !isCompanyPhone(visitor.phone)) resolvedPhone = visitor.phone;
    else if (existingConv?.visitorPhone && !isCompanyPhone(existingConv.visitorPhone)) resolvedPhone = existingConv.visitorPhone;
    else if (leadDetails.phone && !isCompanyPhone(leadDetails.phone)) resolvedPhone = leadDetails.phone;

    let resolvedEmail = "";
    if (visitor?.email && !isCompanyEmail(visitor.email)) resolvedEmail = visitor.email;
    else if (existingConv?.visitorEmail && !isCompanyEmail(existingConv.visitorEmail)) resolvedEmail = existingConv.visitorEmail;
    else if (leadDetails.email && !isCompanyEmail(leadDetails.email)) resolvedEmail = leadDetails.email;

    const hasVisitorDetails = Boolean(
      resolvedPhone ||
      resolvedEmail ||
      (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") ||
      sessionHistory
        .filter((m) => m.role === "user")
        .some((m) =>
          (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(m.content || "") && !isCompanyEmail(m.content)) ||
          (/(?:(?:\+|00)91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/.test(m.content || "") && !isCompanyPhone(m.content))
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
    const trimmedMsg = message.trim().toLowerCase();
    const isPureGreeting =
      /^(?:hi+|hello+|hey+|what'?s?\s*up|sup|yo|greetings|namaste|good\s*(?:morning|afternoon|evening|day))\b/i.test(trimmedMsg) ||
      /^(?:hi+|hello+|hey+)\b/i.test(trimmedMsg) ||
      ["whatsup", "whats up", "sup", "yo", "hi", "hii", "hello", "hey", "namaste", "greetings"].includes(cleanLower);
    const hasTechnicalKeywords = Boolean(message.toLowerCase().match(/\b(cost|price|quote|how much|build|flutter|app|website|software|ai|service|hire|develop|office|address)\b/i));
    const hasSoftwareOrCompanyContext = Boolean(message.toLowerCase().match(/\b(flutter|react|native|next\.?js|node|python|backend|frontend|fullstack|api|database|postgres|aws|cloud|ai|rag|llm|agent|chatbot|automation|erp|crm|saas|mvp|prototype|architecture|ui|ux|design|dev|code|coding|software|website|web|app|apps|application|mobile|ios|android|ecommerce|e-commerce|store|portal|platform|custom\s*software|cost|price|pricing|quote|budget|hire|developer|engineer|timeline|sprint|estimate|proposal|package|5k|10k|50k|rupees|inr|rs|ess|emperor|smart\s*solutions|yash|karan|sharma|makwana|shitiratna|panchvati|navrangpura|ahmedabad|consultation|meeting|demo)\b/i));

    const isContactSubmissionOnly = !hasTechnicalKeywords && (resolvedPhone || resolvedEmail) && ((leadDetails.phone && message.includes(leadDetails.phone)) || (resolvedName && message.toLowerCase().includes(resolvedName.toLowerCase())));

    const isLowBudgetQuery =
      /\b(?:[1-9]k|[1-4]\d\s*k|[1-9]\d{2,4})\b/i.test(message) &&
      /\b(?:budget|only|have|afford|pay|give|price|cost|rs|inr|rupees)\b/i.test(message);

    const isExternalEntityQuery =
      /\b(?:owner|founder|co-founder|ceo|cto|leader|chairman|director|president|creator)\s+of\s+(?!ess\b|emperor\b|this\b|your\b)/i.test(message) ||
      /\b(?:mahindra|tata|reliance|adani|google|microsoft|apple|amazon|facebook|meta|tesla|netflix|infosys|tcs|wipro|twitter|openai|nvidia|flipkart|zomato|swiggy|bjp|congress)\b/i.test(message);

    const isEssLeadershipQuery =
      !isExternalEntityQuery &&
      (/\b(?:who\s+(?:is|are)\s+(?:the\s+)?(?:founder|co-founder|founder's|ceo|cto|owner|leader|team)\b)/i.test(message) ||
       /\b(?:yash\s+sharma|karan\s+makwana)\b/i.test(message) ||
       /\b(?:founder|co-founder|owner|ceo|cto)\s+of\s+(?:ess|emperor)/i.test(message));

    const isEntertainmentOrTrivia =
      /\b(?:comedian|comedians|comedy|stand-?up|standup|joke|jokes|funny|roast|meme|memes|riddle|riddles|story|stories|poem|poems|poetry|rhyme|song|songs|lyrics|music|singer|singers|album|rap|act|acted|acting|actor|actors|actress|actresses|cast|movie|movies|film|films|cinema|trailer|box\s*office|bollywood|hollywood|dabang|dabangg|sholay|bahubali|kgf|pushpa|pathaan|jawan|dangal|avatar|marvel|dc|batman|superman|spiderman|anime|manga|series|season|episode|director|producer|hero|heroine|villain|dialogue)\b/i.test(message) ||
      /\b(?:give|tell|name|list|suggest|recommend|write|show)\s+(?:me\s+)?(?:the\s+)?(?:names?\s+of\s+)?(?:\d+|some|few|top)\b/i.test(message) ||
      /\b(?:cricket|ipl|bcci|icc|world\s*cup|trophy|match|tournament|football|fifa|goal|messi|ronaldo|batting|bowling|wicket|toss|stadium|tennis|badminton|olympics|medal|chess|grandmaster|pubg|free\s*fire|bgmi|fortnite|gameplay)\b/i.test(message) ||
      /\b(?:salman|shah\s*rukh|srk|aamir|akshay|deepika|katrina|alia|ranbir|ranveer|kareena|priyanka|amitabh|bachchan|hrithik|rajinikanth|prabhas|allu\s*arjun|modi|rahul\s*gandhi|nehru|gandhi|bjp|congress|trump|biden|putin|obama|elon\s*musk|ambani|adani|tata|mahindra|bill\s*gates|steve\s*jobs|zuckerberg|sundar\s*pichai|satya\s*nadella|hasan\s*minhaj|john\s*mulaney|ali\s*wong|trevor\s*noah|zakir\s*khan|bassie|samay\s*raina|munawar)\b/i.test(message) ||
      /\b(?:recipe|recipes|cook|cooking|bake|baking|fry|boil|ingredients|dish|dishes|curry|paneer|chicken|biryani|pizza|burger|pasta|noodles|cake|dessert|calories|diet|workout|gym)\b/i.test(message) ||
      /\b(?:dinosaur|dinosaurs|planet|planets|solar\s*system|mars|jupiter|moon|galaxy|universe|black\s*hole|gravity|quantum\s*physics|photosynthesis|dna|evolution|world\s*war|dynasty|mughal|british\s*raj|independence|freedom\s*fighter|capital\s*of|longest\s*river|highest\s*mountain|mythology|ramayana|mahabharata|zeus|gods)\b/i.test(message) ||
      /\b(?:write\s+(?:an?\s+)?(?:essay|poem|song|story|letter|speech|article)|solve\s+(?:this\s+)?(?:math|equation|problem)|homework|joke|riddle|puzzle|horoscope|astrology|zodiac)\b/i.test(message) ||
      /\bwho\s+(?:is|was|are|were|act|acted|directed|wrote|invented|discovered|created|owns|played|won|scored|killed|sang)\b/i.test(message);

    const isCelebrityOrTriviaQuery =
      isExternalEntityQuery ||
      (isEntertainmentOrTrivia && !isEssLeadershipQuery) ||
      (!hasSoftwareOrCompanyContext && !isPureGreeting && !isFirstMessageQuery && !isNameIntroductionOnly && !isContactSubmissionOnly && /\b(who|what|where|how|why|when|can you|give me|tell me|name|list)\b/i.test(message) && !isEssLeadershipQuery && !/\b(office|address|contact|email|phone)\b/i.test(message));

    const isFirstMessageQuery = /\bwhat\s+(?:was|is)\s+(?:my\s+)?(?:first|1st|1)\s*(?:message|msg|messgae)\b/i.test(message);

    let deterministicReply = null;
    if (isPureGreeting && !hasTechnicalKeywords) {
      if (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
        deterministicReply = `Hi ${resolvedName}! Great to hear from you. How can Emperor Smart Solutions assist you with your project today?`;
      } else {
        deterministicReply = `Hello! Welcome to Emperor Smart Solutions. May I know your name and contact number (or WhatsApp) so I can assist you better and personalize our conversation?`;
      }
    } else if (isFirstMessageQuery) {
      let firstUserMsg = "";
      if (existingConv && Array.isArray(existingConv.messages)) {
        const firstM = existingConv.messages.find((m) => m.role === "user");
        if (firstM) firstUserMsg = firstM.content;
      }
      if (!firstUserMsg && Array.isArray(history)) {
        const firstM = history.find((m) => m.role === "user");
        if (firstM) firstUserMsg = firstM.content;
      }
      if (!firstUserMsg) {
        const userMessages = sessionHistory.filter((m) => m.role === "user");
        firstUserMsg = userMessages.length > 0 ? userMessages[0].content : message;
      }
      deterministicReply = `Your first message was:\n\n"${firstUserMsg}"`;
    } else if (isCelebrityOrTriviaQuery) {
      deterministicReply = `I am the AI Sales Consultant for Emperor Smart Solutions, focusing exclusively on custom software engineering, mobile apps (Flutter, iOS, Android), web platforms, and enterprise AI solutions. I don't provide general trivia, entertainment news, or information about other organizations, but I'd be delighted to discuss how we can build or scale your digital project! What kind of solution are you looking to create?`;
    } else if (isEssLeadershipQuery) {
      deterministicReply = `The founders and leadership of Emperor Smart Solutions (ESS) are:

1. **Yash Sharma** — Founder
2. **Karan Makwana** — Co-Founder

Emperor Smart Solutions is a premier custom software engineering and enterprise AI development company headquartered in Ahmedabad, Gujarat. How can we assist you with your project today?`;
    } else if (isLowBudgetQuery) {
      const askForLead = (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect")
        ? (resolvedPhone ? "" : "\n\nCould you please share your **Phone Number (or WhatsApp)** so our technical specialists can connect with you directly to explore your options?")
        : "\n\nCould you please share your **Name and Phone Number (or WhatsApp)** so our technical specialists can connect with you directly to explore your options?";

      deterministicReply = `We completely respect your budget! While our full-scale custom software and bespoke applications typically start from ₹50,000 to cover comprehensive architecture, UI/UX, and quality engineering, we would be delighted to learn about your goals and explore a lightweight MVP, pre-built modules, or a phased roadmap that fits your budget!

Here are our official contact details to speak with our engineering leadership:
📞 **Phone & WhatsApp:** +91 63591 20081
📧 **Email:** contact@emperorsmartsolutions.com
🌐 **Website:** https://emperorsmartsolutions.com${askForLead}`;
    } else if (isContactSubmissionOnly && resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
      deterministicReply = `Hi ${resolvedName}! Thank you for sharing your contact details. How can Emperor Smart Solutions help you with your project today? Are you looking to build a mobile app, web platform, or custom AI solution?`;
    } else if (
      !hasTechnicalKeywords &&
      !resolvedPhone &&
      !resolvedEmail &&
      resolvedName &&
      resolvedName !== "Website Visitor" &&
      resolvedName !== "Website Prospect" &&
      (cleanLower === resolvedName.toLowerCase().replace(/[^a-z0-9]/g, "") ||
       trimmedMsg.startsWith("i am ") ||
       trimmedMsg.startsWith("my name is "))
    ) {
      deterministicReply = `Nice to meet you, ${resolvedName}! How can Emperor Smart Solutions assist you with your project today? Are you looking to build a mobile app, web platform, or custom AI solution?`;
    }

    // --- PHASE 3: REAL-TIME SSE STREAMING (if requested) ---
    const isSseRequested =
      Boolean(requestStream) ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (isSseRequested) {
      if (deterministicReply) {
        conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
        conversationsStore.addMessage(currentSessionId, { role: "assistant", content: deterministicReply });
        if (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
          conversationsStore.updateConversation(currentSessionId, {
            visitorName: resolvedName,
            visitorPhone: resolvedPhone || undefined,
            visitorEmail: resolvedEmail || undefined,
            isLead: true,
          });
        }
        const hasActionableContact = Boolean(resolvedEmail || resolvedPhone);
        if (hasActionableContact) {
          const leadData = {
            sessionId: currentSessionId,
            botId: bot?.id || "bot_aa",
            name: (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") ? resolvedName : (leadDetails.name || "Website Prospect"),
            email: resolvedEmail,
            phone: resolvedPhone,
            company: bot?.company || "Direct Inbound",
            bot: botName,
            score: (resolvedPhone && resolvedEmail) ? "Hot" : (leadDetails.score || "High"),
            inquiry: leadDetails.inquiry || "Inquired via live chat widget",
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
          let preambleBuffer = "";
          let preambleFlushed = false;
          let isIntercepted = false;
          const PREAMBLE_THRESHOLD = 180;

          accumulatedReply = await executeChatInference({
            messages: llmMessages,
            temperature: 0.3,
            num_predict: 512,
            onToken: (token) => {
              if (isIntercepted) return;
              if (!preambleFlushed) {
                preambleBuffer += token;
                if (preambleBuffer.length >= PREAMBLE_THRESHOLD || preambleBuffer.includes("\n\n")) {
                  const cleanedPreamble = validateOutput(preambleBuffer, businessName, lang, botName, resolvedName);
                  if (cleanedPreamble !== preambleBuffer.trim() && (cleanedPreamble.includes("I don't provide") || cleanedPreamble.includes("At Emperor Smart Solutions"))) {
                    isIntercepted = true;
                    writer.write(encoder.encode(`data: ${JSON.stringify({ token: cleanedPreamble })}\n\n`));
                    accumulatedReply = cleanedPreamble;
                    preambleFlushed = true;
                    return;
                  }
                  if (cleanedPreamble) {
                    writer.write(encoder.encode(`data: ${JSON.stringify({ token: cleanedPreamble })}\n\n`));
                  }
                  preambleFlushed = true;
                  preambleBuffer = "";
                }
              } else {
                writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            },
          });

          let validated = "";
          if (isIntercepted) {
            validated = accumulatedReply;
          } else {
            if (!preambleFlushed && preambleBuffer) {
              const cleanedPreamble = validateOutput(preambleBuffer, businessName, lang, botName, resolvedName);
              if (cleanedPreamble) {
                writer.write(encoder.encode(`data: ${JSON.stringify({ token: cleanedPreamble })}\n\n`));
              }
            }

            // Post-validate output with resolvedName
            validated = validateOutput(accumulatedReply, businessName, lang, botName, resolvedName);

            const askedForContact = /(?:name|phone|whatsapp|contact number|email)/i.test(accumulatedReply) &&
              /(?:share|provide|tell|know|reach|call|give|leave|drop|connect|send)/i.test(accumulatedReply);

            if (!hasVisitorDetails && !askedForContact && !resolvedName) {
              const leadAsk = "\n\nCould you please share your **Name and Phone Number (or WhatsApp)** so our technical team can connect with you and prepare a customized proposal?";
              writer.write(encoder.encode(`data: ${JSON.stringify({ token: leadAsk })}\n\n`));
              validated += leadAsk;
            }
          }

          // Save message to conversation store
          conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
          conversationsStore.addMessage(currentSessionId, { role: "assistant", content: validated });

          if (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
            conversationsStore.updateConversation(currentSessionId, {
              visitorName: resolvedName,
              visitorPhone: resolvedPhone || undefined,
              visitorEmail: resolvedEmail || undefined,
              isLead: true,
            });
          }

          // Check lead capture: require email or phone before creating a CRM lead
          const hasActionableContact = Boolean(resolvedEmail || resolvedPhone);
          if (hasActionableContact) {
            const leadData = {
              sessionId: currentSessionId,
              botId: bot?.id || "bot_aa",
              name: (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") ? resolvedName : (leadDetails.name || "Website Prospect"),
              email: resolvedEmail,
              phone: resolvedPhone,
              company: bot?.company || "Direct Inbound",
              bot: botName,
              score: (resolvedPhone && resolvedEmail) ? "Hot" : (leadDetails.score || "High"),
              inquiry: leadDetails.inquiry || "Inquired via live chat widget",
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

      const askedForContact = /(?:name|phone|whatsapp|contact number|email)/i.test(botReply) &&
        /(?:share|provide|tell|know|reach|call|give|leave|drop|connect|send)/i.test(botReply);

      if (!hasVisitorDetails && !askedForContact && !resolvedName) {
        botReply += "\n\nCould you please share your **Name and Phone Number (or WhatsApp)** so our technical team can connect with you and prepare a customized proposal?";
      }
    }

    // Capture Lead: require email or phone before creating a CRM lead
    const hasActionableContact = Boolean(resolvedEmail || resolvedPhone);
    if (hasActionableContact) {
      const leadData = {
        sessionId: currentSessionId,
        botId: bot?.id || "bot_aa",
        name: (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") ? resolvedName : (leadDetails.name || "Website Prospect"),
        email: resolvedEmail,
        phone: resolvedPhone,
        company: bot?.company || "Direct Inbound",
        bot: botName,
        score: (resolvedPhone && resolvedEmail) ? "Hot" : (leadDetails.score || "High"),
        inquiry: leadDetails.inquiry || "Inquired via live chat widget",
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
      if (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
        conversationsStore.updateConversation(currentSessionId, {
          visitorName: resolvedName,
          visitorPhone: resolvedPhone || reloadedConv.visitorPhone,
          visitorEmail: resolvedEmail || reloadedConv.visitorEmail,
          isLead: true,
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
