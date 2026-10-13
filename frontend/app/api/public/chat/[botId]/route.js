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
import { classifyMessageIntent } from "@/lib/ai/intentClassifier";
import {
  handleSalesFlowTurn,
  formatQualificationInquiry,
  ALL_ESS_SERVICES,
  recoverQualificationFromHistory,
  QUALIFICATION_FLOWS,
} from "@/lib/ai/salesFlowManager";
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
    let lang = detectLanguage(message);

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

    // Maintain language continuity across multi-turn sessions
    if (lang === "english" && sessionHistory.length > 0) {
      const explicitEnglishRequest = /\b(?:speak\s+in\s+english|talk\s+in\s+english|switch\s+to\s+english|in\s+english\s+please)\b/i.test(message);
      if (!explicitEnglishRequest) {
        const priorUserMsgs = sessionHistory.filter((m) => m.role === "user").slice(-3);
        for (let i = priorUserMsgs.length - 1; i >= 0; i--) {
          const priorLang = detectLanguage(priorUserMsgs[i].content);
          if (priorLang === "hindi" || priorLang === "hinglish") {
            lang = priorLang;
            break;
          }
        }
      }
    }

    // Step 3.1: Server-Side Intent Classification & Business Scope Gate
    const intentResult = classifyMessageIntent({
      message,
      bot,
      history: sessionHistory,
      lang,
    });

    if (intentResult.action === "REFUSE" || intentResult.action === "RESTRICT") {
      return corsResponse(
        NextResponse.json({
          success: true,
          reply: intentResult.refusalReply,
          intent: intentResult.intent,
          sources: [],
          sessionId: currentSessionId,
        })
      );
    }

    if (intentResult.action === "CLARIFY" && intentResult.clarificationPrompt) {
      if (sessionHistory.length === 0) {
        return corsResponse(
          NextResponse.json({
            success: true,
            reply: intentResult.clarificationPrompt,
            intent: intentResult.intent,
            sources: [],
            sessionId: currentSessionId,
          })
        );
      }
    }

    // Handle CUSTOMER_SPECIFIC memory recall queries deterministically
    if (intentResult.intent === "CUSTOMER_SPECIFIC") {
      const priorUserText = sessionHistory.filter((m) => m.role === "user").map((m) => m.content).join(" ");
      const budgetMatch = priorUserText.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?\s*(?:k|lakh|lac|cr)?)/i);
      const techMatch = priorUserText.match(/\b(flutter|react native|next\.?js|node\.?js|react|python|fastapi|vue|angular)\b/i);
      const projectMatch = priorUserText.match(/\b(e-commerce|ecommerce|mobile app|web platform|saas|ai chatbot|crm|erp)\b/i);

      if (/\b(?:what\s+is\s+my\s+budget|which\s+technology|what\s+did\s+i\s+choose|my\s+requirements?|what\s+do\s+you\s+remember)\b/i.test(message)) {
        const recalledBudget = budgetMatch ? (budgetMatch[0].startsWith("₹") ? budgetMatch[0] : `₹${budgetMatch[0]}`) : null;
        const recalledTech = techMatch ? techMatch[0] : null;
        const recalledProject = projectMatch ? projectMatch[0] : null;

        if (recalledBudget || recalledTech) {
          const parts = [];
          if (recalledBudget) parts.push(`your stated budget is **${recalledBudget}**`);
          if (recalledTech) parts.push(`the technology you chose is **${recalledTech}**`);
          
          let memoryReply = `Based on our conversation, ${parts.join(" and ")}`;
          if (recalledProject) memoryReply += ` for your **${recalledProject}** app`;
          memoryReply += `. How would you like to proceed with your project?`;

          return corsResponse(
            NextResponse.json({
              success: true,
              reply: memoryReply,
              intent: intentResult.intent,
              sources: [],
              sessionId: currentSessionId,
            })
          );
        }
      }
    }

    // 4. Step 4: Multi-Tenant Vector Search over Authorized Knowledge (Top 2 chunks for fast evaluation)
    const relevantChunks = await searchWebsiteKnowledge(botId, message, 2);
    const contextText = relevantChunks
      .map((c) => `[Source: ${c.pageTitle || c.pageUrl}]:\n${c.content}`)
      .join("\n\n");

    // 5. Step 5: Extract lead details and resolve visitor identity
    const currentMsgLead = extractLeadDetails(message, []);
    const sessionLead = extractLeadDetails(message, sessionHistory);
    const leadDetails = sessionLead;

    const isCompanyEmail = (em) =>
      /emperorsmartsolutions\.com|emperorsmartsolutions@gmail\.com|^contact@|^sales@|^info@|^support@|^careers@/i.test(em || "");
    const isCompanyPhone = (ph) => /63591\s*20081/.test((ph || "").replace(/\D/g, ""));
    const isPlaceholderName = (n) => !n || n === "Website Visitor" || n === "Website Prospect";

    // 1. Phone Resolution (Current message has top priority!)
    let resolvedPhone = "";
    if (currentMsgLead.phone && !isCompanyPhone(currentMsgLead.phone)) {
      resolvedPhone = currentMsgLead.phone;
    } else if (sessionLead.phone && !isCompanyPhone(sessionLead.phone)) {
      resolvedPhone = sessionLead.phone;
    } else if (existingConv?.visitorPhone && !isCompanyPhone(existingConv.visitorPhone)) {
      resolvedPhone = existingConv.visitorPhone;
    } else if (visitor?.phone && !isCompanyPhone(visitor.phone)) {
      resolvedPhone = visitor.phone;
    }

    // 2. Email Resolution (Current message has top priority!)
    let resolvedEmail = "";
    if (currentMsgLead.email && !isCompanyEmail(currentMsgLead.email)) {
      resolvedEmail = currentMsgLead.email;
    } else if (sessionLead.email && !isCompanyEmail(sessionLead.email)) {
      resolvedEmail = sessionLead.email;
    } else if (existingConv?.visitorEmail && !isCompanyEmail(existingConv.visitorEmail)) {
      resolvedEmail = existingConv.visitorEmail;
    } else if (visitor?.email && !isCompanyEmail(visitor.email)) {
      resolvedEmail = visitor.email;
    }

    // 3. Name Resolution (Current message has top priority!)
    let resolvedName = "";
    if (currentMsgLead.name && !isPlaceholderName(currentMsgLead.name)) {
      resolvedName = currentMsgLead.name;
    } else if (sessionLead.name && !isPlaceholderName(sessionLead.name)) {
      resolvedName = sessionLead.name;
    } else if (existingConv?.visitorName && !isPlaceholderName(existingConv.visitorName)) {
      resolvedName = existingConv.visitorName;
    } else if (visitor?.name && !isPlaceholderName(visitor.name)) {
      resolvedName = visitor.name;
    }

    const hasVisitorDetails = Boolean(
      resolvedPhone ||
      resolvedEmail ||
      !isPlaceholderName(resolvedName) ||
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
    const hasSoftwareOrCompanyContext = Boolean(message.toLowerCase().match(/\b(flutter|react|native|next\.?js|node|python|backend|frontend|fullstack|api|database|postgres|aws|cloud|ai|rag|llm|agent|chatbot|automation|erp|crm|saas|mvp|prototype|architecture|ui|ux|design|dev|code|coding|software|website|web|app|apps|application|mobile|ios|android|ecommerce|e-commerce|store|portal|platform|custom\s*software|cost|price|pricing|quote|budget|hire|developer|engineer|timeline|sprint|estimate|proposal|package|5k|10k|50k|rupees|inr|rs|ess|emperor|smart\s*solutions|yash|karan|sharma|makwana|shitiratna|panchvati|navrangpura|ahmedabad|consultation|meeting|demo|service|services|provide|provides|providing|offer|offers|offering|offerings|solution|solutions|work|works|working|build|building|make|create|features?|technology|tech|stack|capabilities|expertise|company|business|client|clients)\b/i));

    const isOfferingToShareContact =
      !hasTechnicalKeywords &&
      (/\b(?:note|save|take|record|write|keep)\s+(?:down\s+)?(?:my\s+)?(?:name|number|phone|details|contact|whatsapp)\b/i.test(message) ||
       /\b(?:my\s+name\s+and\s+number|my\s+name\s+&\s+number)\b/i.test(message));

    const isSavedUserDetailsQuery =
      /\b(?:what\s+details?\s+(?:you\s+(?:have\s+)?(?:saved|hared|recorded)|did\s+you\s+save|are\s+saved)|what\s+did\s+you\s+save|show\s+(?:my\s+)?(?:details?|info)|what\s+have\s+you\s+(?:saved|noted))\b/i.test(message) ||
      /\b(?:what\s+details?\s+you\s+ha[a-z]*e\s+hared)\b/i.test(message);

    const isContactDetailsQuery =
      !isOfferingToShareContact &&
      !isSavedUserDetailsQuery &&
      !/\b(?:my\s+(?:name|number|phone|contact|details|email))\b/i.test(message) &&
      /\b(?:c?o[in]*tact|cont[ae]ct|dertails?|details?|phone|whatsapp|email|address|office|location|head\s*office|reach\s*(?:out)?|call|speak\s*to\s*(?:someone|team)|talk\s*to\s*human|sampark|pata)\b/i.test(message) &&
      (/\b(?:give|tell|what|share|show|provide|how\s+to|where|send|details?|contact|ess|emperor|your|company|chahiye|chaiye|vchaiye|mangta|batao|dedo|de\s*do|bhejo|kahan|kidhar|kaha|kya\s+hai)\b/i.test(message) || message.trim().length <= 35);

    const isLanguageSwitchQuery =
      !hasTechnicalKeywords &&
      /\b(?:hindi|hinglish)\b/i.test(message) &&
      (/\b(?:baat|bol|bolte|bolna|bolo|aati|aata|aate|sakte|sakta|saktee|sakti|kar\s+sakte|samajhte|samajh)\b/i.test(message) ||
       /\b(?:speak|talk|know|understand|switch|change|converse|support)\b/i.test(message));

    const isEnglishSwitchQuery =
      !hasTechnicalKeywords &&
      /\b(?:english)\b/i.test(message) &&
      (/\b(?:baat|bol|bolte|bolna|bolo|sakte|sakta|kar\s+sakte)\b/i.test(message) ||
       /\b(?:speak|talk|know|understand|switch|change|converse|support)\b/i.test(message));

    const isLowBudgetQuery =
      /\b(?:[1-9]k|[1-4]\d\s*k|[1-9]\d{2,4})\b/i.test(message) &&
      /\b(?:budget|only|have|afford|pay|give|price|cost|rs|inr|rupees)\b/i.test(message);

    const isExternalEntityQuery =
      /\b(?:owner|founder|co-founder|ceo|cto|leader|chairman|director|president|creator)\s+of\s+(?!ess\b|emperor\b|this\b|your\b)/i.test(message) ||
      /\b(?:mahindra|tata|reliance|adani|google|microsoft|apple|amazon|facebook|meta|tesla|netflix|infosys|tcs|wipro|twitter|openai|nvidia|flipkart|zomato|swiggy|bjp|congress)\b/i.test(message);

    const isEssLeadershipQuery =
      !isExternalEntityQuery &&
      (/\b(?:who\s+(?:is|are|was)\s+(?:the\s+)?(?:founder|co-founder|founder's|ceo|cto|owner|leader|team|boss))\b/i.test(message) ||
       /\b(?:founder|co-founder|owner|ceo|cto|leader|boss)\b/i.test(message) && /\b(?:who|what|name|kiska|kisne|kon|kaun|ess|emperor|emepror|company|agency|details?)\b/i.test(message) ||
       /\b(?:founder|co-founder|owner|ceo|cto|leader|boss)\s*(?:of\s+.*|name)?$/i.test(message) ||
       /\b(?:who\s+(?:is|was|are)\s+)?\b(?:yash\s+sharma|karan\s+makwana)\b/i.test(message) ||
       /\bwho\s+(?:is|was)\s+(?:yash|karan)\b/i.test(message) ||
       /\b(?:who\s+is|who's)\s+karan\b/i.test(message) ||
       /\b(?:who\s+is|who's)\s+yash\b/i.test(message) ||
       /\b(?:kisne|kone)\s+(?:banaya|banayi|start\s*ki|start\s*kiya|shuru\s*kiya|shuru\s*ki|create\s*kiya|setup\s*kiya|found\s*kiya)\b/i.test(message) ||
       /\b(?:kiski|kiska)\s+(?:company|firm|agency|startup|hai)\b/i.test(message) ||
       /\b(?:founder|owner|malik|ceo|cto|leader)\s+(?:kaun|kon)\s+(?:hai|h)\b/i.test(message) ||
       /\b(?:kaun|kon)\s+(?:hai|h)\s+(?:founder|owner|malik|ceo)\b/i.test(message) ||
       /\b(?:ess|emperor|emepror)\s+(?:kisne|kiska|kiski|kaun|founder)\b/i.test(message) ||
       /[\u0900-\u097F].*(?:संस्थापक|मालिक|किसने बनाया|किसकी कंपनी)/i.test(message));

    const isProjectsPortfolioQuery =
      !hasTechnicalKeywords &&
      /\b(?:projects?|portfolio|recent\s*works?|past\s*works?|case\s*studies|clients?|completed\s*projects?|live\s*projects?)\b/i.test(message) &&
      (/\b(?:how\s+many|show|give|list|tell|view|see|completed|done|worked|details?|sample|example|what|share)\b/i.test(message) || message.trim().length <= 35);

    const isServicesQuery =
      !isContactDetailsQuery &&
      !isProjectsPortfolioQuery &&
      !isEssLeadershipQuery &&
      (/\b(?:services?|offerings?|capabilities|expertise)\b/i.test(message) ||
       /\bwhat\s+(?:services?|solutions?)\s+(?:they|you|do\s+you|are|does\s+ess|does\s+emperor)\b/i.test(message) ||
       /\bwhat\s+(?:do\s+you|they|does\s+(?:ess|emperor))\s+(?:do|provide|offer|build|make)\b/i.test(message) ||
       /\bwhat\s+can\s+you\s+(?:do|build|make|provide|offer)\b/i.test(message) ||
       /\b(?:kya|konsi|kaunsi)\s+(?:service|services|kaam|suvidha)\b/i.test(message) ||
       /\b(?:kya\s+karte\s+ho|kya\s+karti\s+hai|kya\s+service\s+dete\s+ho)\b/i.test(message));

    const isFirstMessageQuery = /\bwhat\s+(?:was|is)\s+(?:my\s+)?(?:first|1st|1)\s*(?:message|msg|messgae)\b/i.test(message);

    const lastAssistantMessage = (sessionHistory || []).filter((m) => m.role === "assistant").slice(-1)[0]?.content || "";
    const wasAskedForName =
      /\b(?:name|naam|may\s+i\s+know\s+your\s+name|share\s+your\s+name|apna\s+name)\b/i.test(lastAssistantMessage) ||
      lastAssistantMessage.includes("May I know your name") ||
      lastAssistantMessage.includes("अपना नाम") ||
      lastAssistantMessage.includes("apna Name");

    const isNameIntroductionOnly =
      !hasTechnicalKeywords &&
      !resolvedPhone &&
      !resolvedEmail &&
      Boolean(resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect" &&
        (cleanLower === resolvedName.toLowerCase().replace(/[^a-z0-9]/g, "") ||
         trimmedMsg.startsWith("i am ") ||
         trimmedMsg.startsWith("my name is ") ||
         trimmedMsg.startsWith("my name ") ||
         trimmedMsg.startsWith("mera naam ") ||
         trimmedMsg.endsWith(" here") ||
         /\b(?:i am|my name|mera naam|call me|myself)\b/i.test(trimmedMsg) ||
         wasAskedForName));

    const isContactSubmission =
      !hasTechnicalKeywords &&
      !isContactDetailsQuery &&
      !isOfferingToShareContact &&
      (isNameIntroductionOnly ||
       ((Boolean(resolvedPhone) || Boolean(resolvedEmail)) &&
        (/\b(?:name|naam|number|nunmber|phone|mobile|whatsapp|email|here\s+it\s+is|this\s+is|call\s+me)\b/i.test(message) ||
         (leadDetails.phone && message.includes(leadDetails.phone)) ||
         (resolvedName && message.toLowerCase().includes(resolvedName.toLowerCase())) ||
         /\b[6-9]\d{9}\b/.test(message) ||
         /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(message))));

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
      !isContactDetailsQuery &&
      !isLanguageSwitchQuery &&
      !isEnglishSwitchQuery &&
      !isOfferingToShareContact &&
      !isProjectsPortfolioQuery &&
      !isServicesQuery &&
      !isContactSubmission &&
      (isExternalEntityQuery ||
      (isEntertainmentOrTrivia && !isEssLeadershipQuery) ||
      (!hasSoftwareOrCompanyContext && !isPureGreeting && !isFirstMessageQuery && !isNameIntroductionOnly && /\b(who|what|where|how|why|when|can you|give me|tell me|name|list)\b/i.test(message) && !isEssLeadershipQuery && !/\b(office|address|contact|email|phone)\b/i.test(message)));

    let deterministicReply = null;
    let quickReplies = [];
    if (isLanguageSwitchQuery) {
      lang = /[\u0900-\u097F]/.test(message) ? "hindi" : "hinglish";
      quickReplies = [...ALL_ESS_SERVICES];
      if (lang === "hindi") {
        deterministicReply = `हाँ बिल्कुल! मैं हिंदी में बात कर सकता हूँ। Emperor Smart Solutions में आपका स्वागत है! मैं आपके डिजिटल प्रोजेक्ट में किस प्रकार सहायता कर सकता हूँ? क्या आप कोई मोबाइल ऐप, वेबसाइट या कस्टम AI समाधान बनवाना चाहते हैं?`;
      } else {
        deterministicReply = `Haan bilkul! Main Hindi aur Hinglish dono mein baat kar sakta hoon. Emperor Smart Solutions ki taraf se main aapke digital project mein kaise help kar sakta hoon? Aapko mobile app, website, ya custom AI solution banwana hai?`;
      }
    } else if (isEnglishSwitchQuery) {
      lang = "english";
      quickReplies = [...ALL_ESS_SERVICES];
      deterministicReply = `Yes, absolutely! I can converse fluently in English. Emperor Smart Solutions specializes in custom mobile apps, web platforms, and enterprise AI solutions. What kind of project are you looking to build?`;
    } else if (isOfferingToShareContact) {
      deterministicReply = lang === "hindi"
        ? `जरूर! कृपया अपना **नाम और फ़ोन नंबर (या WhatsApp)** साझा करें, ताकि हम इसे सुरक्षित रूप से नोट कर सकें और हमारी तकनीकी टीम आपसे संपर्क कर सके।`
        : lang === "hinglish"
        ? `Sure! Please apna **Name aur Phone Number (ya WhatsApp)** share karein, hum ise note kar lenge aur hamari technical team aapse connect karegi.`
        : `Sure! Please share your **Name and Phone Number (or WhatsApp)** here, and I'll make sure our technical team connects with you promptly.`;
    } else if (isContactSubmission) {
      const activeQual = existingConv?.qualification || recoverQualificationFromHistory(sessionHistory);
      const hasActiveProject = Boolean(activeQual && activeQual.service);
      const displayName = (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") ? resolvedName : "";

      if (hasActiveProject && (resolvedPhone || resolvedEmail)) {
        const serviceTitle = QUALIFICATION_FLOWS[activeQual.service]?.serviceName || "Digital Project";
        const contactVal = resolvedPhone || resolvedEmail;

        const completedQual = {
          ...activeQual,
          status: "completed",
          consentAsked: false,
          answers: {
            ...(activeQual.answers || {}),
          },
        };

        quickReplies = ["Tell me about ESS", "Recent projects", "Office location"];

        if (lang === "hindi") {
          deterministicReply = `शानदार! धन्यवाद ${displayName || ""}! हमने आपके **${serviceTitle}** प्रोजेक्ट के लिए आपका संपर्क नंबर (**${contactVal}**) सुरक्षित रूप से नोट कर लिया है।\n\nहमारी तकनीकी टीम जल्द ही एक कस्टमाइज्ड प्रस्ताव और कार्ययोजना के साथ आपसे संपर्क करेगी! 🚀`;
        } else if (lang === "hinglish") {
          deterministicReply = `Great! Thank you ${displayName || ""}! Humne aapke **${serviceTitle}** project ke liye aapka contact number (**${contactVal}**) note kar liya hai.\n\nHamari technical team jald hi customized proposal aur project roadmap ke saath aapse connect karegi! 🚀`;
        } else {
          deterministicReply = `Thank you, ${displayName || "there"}! We have recorded your contact number (**${contactVal}**) for your **${serviceTitle}** project.\n\nOur technical team will reach out to you shortly with a customized proposal and project roadmap! 🚀`;
        }

        const inquirySummary = formatQualificationInquiry(completedQual);
        const qAnswers = completedQual.answers || {};

        leadsStore.createLead({
          sessionId: currentSessionId,
          botId: bot?.id || botId,
          name: displayName || leadDetails.name || "Website Prospect",
          email: resolvedEmail || leadDetails.email || "",
          phone: resolvedPhone || leadDetails.phone || "",
          company: bot?.company || "Direct Inbound",
          bot: botName,
          inquiry: inquirySummary || `Qualified ${serviceTitle} Project Inbound`,
          budget: qAnswers.budget || "₹50,000+",
          source: "Web Chatbot Widget",
          qualification: completedQual,
        });

        conversationsStore.updateConversation(currentSessionId, {
          qualification: completedQual,
          status: "completed",
          ...(displayName ? { visitorName: displayName } : {}),
          ...(resolvedPhone ? { visitorPhone: resolvedPhone } : {}),
          ...(resolvedEmail ? { visitorEmail: resolvedEmail } : {}),
        });
      } else {
        quickReplies = [...ALL_ESS_SERVICES];
        if (displayName) {
          if (!resolvedPhone && !resolvedEmail) {
            deterministicReply = lang === "hindi"
              ? `नमस्ते ${displayName}! Emperor Smart Solutions में आपका स्वागत है। आप कौन सा प्रोजेक्ट या समाधान बनवाना चाहते हैं?`
              : lang === "hinglish"
              ? `Nice to meet you, ${displayName}! Emperor Smart Solutions mein aapka swagat hai. Aap kaunsa project plan kar rahe hain?`
              : `Nice to meet you, ${displayName}! Welcome to Emperor Smart Solutions. Which solution are you planning to build?`;
          } else {
            deterministicReply = lang === "hindi"
              ? `धन्यवाद ${displayName}! आपका संपर्क विवरण नोट कर लिया गया है। आप कौन सा प्रोजेक्ट या समाधान बनवाना चाहते हैं?`
              : lang === "hinglish"
              ? `Thank you ${displayName}! Aapki details note kar li gayi hain. Aap kaunsa digital solution develop karwana chahte hain?`
              : `Thank you, ${displayName}! Your contact details have been recorded. Which digital solution are you planning to build?`;
          }

          // Immediately register lead with the visitor's name
          leadsStore.createLead({
            sessionId: currentSessionId,
            botId: bot?.id || botId,
            name: displayName,
            email: resolvedEmail || "",
            phone: resolvedPhone || "",
            company: bot?.company || "Direct Inbound",
            bot: botName,
            inquiry: "Visitor introduced themselves. Offered services options.",
            budget: "₹50,000+",
            source: "Web Chatbot Widget",
          });

          const existingC = conversationsStore.getConversation(currentSessionId);
          if (existingC) {
            conversationsStore.updateConversation(currentSessionId, {
              visitorName: displayName,
              ...(resolvedPhone ? { visitorPhone: resolvedPhone } : {}),
              ...(resolvedEmail ? { visitorEmail: resolvedEmail } : {}),
            });
          }
        } else {
          deterministicReply = lang === "hindi"
            ? `धन्यवाद! आपका संपर्क विवरण नोट कर लिया गया है। क्या आप अपना **नाम** भी साझा कर सकते हैं ताकि हमारी तकनीकी टीम आपसे व्यक्तिगत रूप से संपर्क कर सके?`
            : lang === "hinglish"
            ? `Thank you! Aapka contact number note kar liya gaya hai. Kya aap apna **Name** bhi share kar sakte hain taaki hamari technical team aapse personally connect kar sakein?`
            : `Thank you! Your contact details have been noted. Could you also please share your **Name** so our technical team can address you personally?`;
        }
      }
    } else if (isPureGreeting && !hasTechnicalKeywords) {
      quickReplies = [...ALL_ESS_SERVICES];
      if (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect") {
        deterministicReply = lang === "hindi"
          ? `नमस्ते ${resolvedName}! Emperor Smart Solutions में आपका स्वागत है। आप कौन सा प्रोजेक्ट या समाधान बनवाना चाहते हैं?`
          : lang === "hinglish"
          ? `Hi ${resolvedName}! Emperor Smart Solutions mein aapka swagat hai. Aap kaunsa project plan kar rahe hain?`
          : `Hi ${resolvedName}! Welcome to Emperor Smart Solutions. Which solution are you planning to build?`;
      } else {
        deterministicReply = lang === "hindi"
          ? `नमस्ते! Emperor Smart Solutions में आपका स्वागत है। क्या आप अपना नाम साझा कर सकते हैं ताकि हम बेहतर सहायता कर सकें?`
          : lang === "hinglish"
          ? `Hello! Emperor Smart Solutions mein aapka swagat hai. Kya aap apna Name share kar sakte hain taaki hum aapko personalize assist kar sakein?`
          : `Hello! Welcome to Emperor Smart Solutions. May I know your name so I can assist you better and personalize our conversation?`;
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
    } else if (isSavedUserDetailsQuery) {
      const savedName = (!isPlaceholderName(resolvedName))
        ? resolvedName
        : (leadDetails.name || "Not specified");
      const savedPhone = resolvedPhone || (leadDetails.phone ? leadDetails.phone : "Not specified");
      const savedEmail = resolvedEmail || (leadDetails.email ? leadDetails.email : "Not specified");

      if (lang === "hindi") {
        deterministicReply = `यहाँ आपके प्रोजेक्ट पूछताछ के लिए वर्तमान में रिकॉर्ड किए गए संपर्क विवरण हैं:
• **नाम:** ${savedName}
• **फ़ोन / WhatsApp:** ${savedPhone}
${savedEmail !== "Not specified" ? `• **ईमेल:** ${savedEmail}\n` : ""}
यदि आप अपना फ़ोन नंबर, ईमेल या प्रोजेक्ट विवरण अपडेट करना चाहते हैं, तो कृपया साझा करें और मैं तुरंत आपका रिकॉर्ड अपडेट कर दूँगा!`;
      } else if (lang === "hinglish") {
        deterministicReply = `Yeh rahe aapke project inquiry ke liye currently recorded contact details:
• **Name:** ${savedName}
• **Phone / WhatsApp:** ${savedPhone}
${savedEmail !== "Not specified" ? `• **Email:** ${savedEmail}\n` : ""}
Agar aap apna phone number, email ya project requirements update karna chahte hain, toh please share karein aur main turant aapka record update kar dunga!`;
      } else {
        deterministicReply = `Here are the contact details I currently have recorded for your project inquiry:
• **Name:** ${savedName}
• **Phone / WhatsApp:** ${savedPhone}
${savedEmail !== "Not specified" ? `• **Email:** ${savedEmail}\n` : ""}
If you would like to update your phone number, email, or project requirements, please feel free to share them and I will immediately update your record!`;
      }
    } else if (isContactDetailsQuery) {
      if (lang === "hindi") {
        deterministicReply = `Emperor Smart Solutions के आधिकारिक संपर्क विवरण और मुख्य कार्यालय का पता इस प्रकार है:

🌐 **आधिकारिक वेबसाइट:** https://emperorsmartsolutions.com
📍 **मुख्य कार्यालय:** 202, Shitiratna Complex, Panchvati, Navrangpura, Ahmedabad - 380009, Gujarat, India.
📞 **फ़ोन और WhatsApp:** +91 63591 20081
📧 **ईमेल:** contact@emperorsmartsolutions.com | emperorsmartsolutions@gmail.com
⏰ **कार्य समय:** सोमवार से शनिवार: 10:00 AM – 7:00 PM IST

आप हमारे कार्यालय आ सकते हैं या सीधे WhatsApp/ईमेल द्वारा संपर्क कर सकते हैं! हम आपके प्रोजेक्ट में किस प्रकार सहायता कर सकते हैं?`;
      } else if (lang === "hinglish") {
        deterministicReply = `Emperor Smart Solutions ke official contact details aur head office address yeh hain:

🌐 **Official Website:** https://emperorsmartsolutions.com
📍 **Head Office:** 202, Shitiratna Complex, Panchvati, Navrangpura, Ahmedabad - 380009, Gujarat, India.
📞 **Phone & WhatsApp:** +91 63591 20081
📧 **Inquiries Email:** contact@emperorsmartsolutions.com | emperorsmartsolutions@gmail.com
⏰ **Business Hours:** Monday to Saturday: 10:00 AM – 7:00 PM IST

Aap hamare office visit kar sakte hain ya directly WhatsApp/email par connect kar sakte hain! Hum aapke project mein kaise help kar sakte hain?`;
      } else {
        deterministicReply = `Here are the official contact details and head office address for Emperor Smart Solutions:

🌐 **Official Website:** https://emperorsmartsolutions.com
📍 **Head Office:** 202, Shitiratna Complex, Panchvati, Navrangpura, Ahmedabad - 380009, Gujarat, India.
📞 **Phone & WhatsApp:** +91 63591 20081
📧 **Inquiries Email:** contact@emperorsmartsolutions.com | emperorsmartsolutions@gmail.com
⏰ **Business Hours:** Monday to Saturday: 10:00 AM – 7:00 PM IST

Feel free to visit our office or reach out via WhatsApp/email! How else can we assist you with your project?`;
      }
    } else if (isProjectsPortfolioQuery) {
      deterministicReply = lang === "hindi"
        ? `Emperor Smart Solutions ने मोबाइल ऐप्स, एंटरप्राइज वेब प्लेटफ़ॉर्म और कस्टम AI सिस्टम में **50 से अधिक सफल प्रोजेक्ट्स** पूरे किए हैं! 🚀

हमारे प्रमुख डोमेन:
• **कस्टम मोबाइल ऐप्स:** Flutter, iOS और Android (ई-कॉमर्स, फिनटेक, लॉजिस्टिक्स)
• **वेब प्लेटफ़ॉर्म:** Next.js, React और Node.js एंटरप्राइज पोर्टल्स
• **एंटरप्राइज AI:** कस्टम RAG पाइपलाइन, स्वायत्त AI एजेंट्स और वर्कफ़्लो ऑटोमेशन

क्या आप अपने डोमेन के अनुसार केस स्टडीज या लाइव डेमो देखना चाहेंगे? कृपया अपना **नाम और फ़ोन नंबर (या WhatsApp)** साझा करें ताकि हमारी टीम आपके साथ कस्टमाइज्ड पोर्टफोलियो साझा कर सके!`
        : lang === "hinglish"
        ? `Emperor Smart Solutions ne mobile apps, enterprise web platforms, aur custom AI systems mein **50+ successful projects** deliver kiye hain! 🚀

Hamare key domains:
• **Custom Mobile Apps:** Flutter, iOS & Android (E-commerce, FinTech, Logistics)
• **Web Platforms:** Next.js, React & Node.js enterprise portals
• **Enterprise AI:** Custom RAG pipelines, autonomous AI agents & workflow automation

Kya aap apne domain ke related case studies ya live demos dekhna chahenge? Please apna **Name aur Phone Number (ya WhatsApp)** share karein taaki hamari technical team aapko relevant portfolio share kar sake!`
        : `Emperor Smart Solutions has successfully delivered **over 50+ projects** across mobile applications, enterprise web platforms, and custom AI systems! 🚀

Our key portfolio areas include:
• **Custom Mobile Applications:** High-performance apps in Flutter, iOS, and Android for E-Commerce, FinTech, and Logistics.
• **Full-Stack Web Platforms:** Scalable web portals and SaaS platforms built with Next.js, React, and Node.js.
• **Enterprise AI Solutions:** Production RAG pipelines, autonomous AI agents, and enterprise workflow automation.

Would you like to see relevant case studies or a live demo for your industry? Could you please share your **Name and Phone Number (or WhatsApp)** so our team can send over a tailored portfolio?`;
    } else if (isServicesQuery) {
      deterministicReply = lang === "hindi"
        ? `Emperor Smart Solutions (ESS) एक प्रमुख डिजिटल इंजीनियरिंग और एंटरप्राइज AI डेवलपमेंट कंपनी है। हमारी मुख्य सेवाएं इस प्रकार हैं:

1. **कस्टम मोबाइल ऐप डेवलपमेंट:** Flutter और React Native द्वारा निर्मित हाई-परफॉर्मेंस iOS और Android ऐप्स।
2. **वेब प्लेटफ़ॉर्म और SaaS डेवलपमेंट:** Next.js, React और Node.js आधारित स्केलेबल वेब ऐप्स, कस्टम पोर्टल्स और क्लाउड SaaS प्लेटफ़ॉर्म।
3. **एंटरप्राइज AI और ऑटोमेशन:** कस्टम AI चैटबॉट्स, RAG (Retrieval-Augmented Generation) सिस्टम्स, स्वायत्त AI एजेंट्स और बिजनेस वर्कफ़्लो ऑटोमेशन।
4. **UI/UX डिज़ाइन और प्रोटोटाइपिंग:** आधुनिक और सहज UI/UX डिज़ाइन, सिस्टम आर्किटेक्चर कंसल्टिंग और रैपिड MVP प्रोटोटाइप्स।
5. **क्लाउड और API इंटीग्रेशन:** स्केलेबल बैकएंड सिस्टम्स, सुरक्षित REST/GraphQL APIs और क्लाउड डिप्लॉयमेंट (AWS/Docker)।

प्रत्येक प्रोजेक्ट में एंड-टू-एंड डिज़ाइन, इंजीनियरिंग, कठोर QA टेस्टिंग और 30 दिनों का निःशुल्क पोस्ट-लॉन्च सपोर्ट शामिल है।

आप किस प्रकार का प्रोजेक्ट बनवाना चाहते हैं? कृपया अपनी आवश्यकताएं या अपना **नाम और फ़ोन नंबर (या WhatsApp)** साझा करें, हमारी तकनीकी टीम आपसे संपर्क करेगी!`
        : lang === "hinglish"
        ? `Emperor Smart Solutions (ESS) ek premier digital engineering aur enterprise AI development company hai. Hamari core services yeh hain:

1. **Custom Mobile App Development:** Flutter aur React Native par high-performance iOS aur Android apps.
2. **Web Platforms & Enterprise SaaS:** Next.js, React, aur Node.js par scalable web applications, client portals aur SaaS platforms.
3. **Enterprise AI & Automation:** Custom AI chatbots, production-grade RAG systems, autonomous AI agents aur business workflow automation.
4. **UI/UX Design & Architecture:** Intuitive UI/UX designs, architecture consulting aur rapid MVP prototyping.
5. **Cloud Infrastructure & APIs:** Scalable microservices, secure REST/GraphQL APIs aur cloud deployment (AWS/Docker).

Har project mein end-to-end design, development, QA testing, aur 30 days ka free post-launch support included hota hai.

Aap kis tarah ka digital project build karwana chahte hain? Apna idea ya **Name aur Phone/WhatsApp number** share karein, hamari team aapse jald hi connect karegi!`
        : `Emperor Smart Solutions (ESS) is a full-cycle digital engineering and enterprise AI development company. Here are our core services:

1. **Custom Mobile App Development:** High-performance iOS and Android applications built with Flutter and React Native.
2. **Web Platforms & Enterprise SaaS:** Scalable web applications, customer portals, and cloud SaaS platforms using Next.js, React, Node.js, and modern backends.
3. **Enterprise AI & Automation:** Custom AI chatbots, RAG (Retrieval-Augmented Generation) systems, autonomous AI agents, and intelligent workflow automation.
4. **UI/UX Design & Architecture:** Intuitive UI/UX designs, system architecture consulting, and rapid MVP prototypes.
5. **Cloud Infrastructure & API Integrations:** Scalable microservices, secure REST/GraphQL APIs, database optimization (PostgreSQL/pgvector), and cloud deployments (AWS/Docker).

Every project includes full turnkey execution: end-to-end design, development, rigorous QA testing, and 30 days of free post-launch support.

What kind of digital project are you looking to build? Feel free to share your requirements or your **Name and Phone Number (or WhatsApp)**, and our technical team will prepare a tailored proposal for you!`;
    } else if (isEssLeadershipQuery) {
      if (/\b(?:karan|karan\s+makwana)\b/i.test(message) && !/\byash\b/i.test(message)) {
        deterministicReply = lang === "hindi"
          ? `करण मकवाना (Karan Makwana) Emperor Smart Solutions के सह-संस्थापक (Co-Founder) हैं। वे कंपनी के रणनीतिक विकास और तकनीकी पहलों का नेतृत्व करते हैं। आज हम आपके प्रोजेक्ट में किस प्रकार सहायता कर सकते हैं?`
          : lang === "hinglish"
          ? `Karan Makwana Emperor Smart Solutions ke Co-Founder hain. Woh company ke strategic growth aur technology initiatives lead karte hain. Aaj hum aapke digital project mein kaise help kar sakte hain?`
          : `Karan Makwana is the Co-Founder of Emperor Smart Solutions. He leads strategic growth and technology initiatives at ESS. How can Emperor Smart Solutions assist you with your project today?`;
      } else if (/\b(?:yash|yash\s+sharma)\b/i.test(message) && !/\bkaran\b/i.test(message)) {
        deterministicReply = lang === "hindi"
          ? `यश शर्मा (Yash Sharma) Emperor Smart Solutions के संस्थापक (Founder) हैं। वे एंटरप्राइज AI और कस्टम सॉफ्टवेयर इंजीनियरिंग का नेतृत्व करते हैं। आज हम आपके प्रोजेक्ट में किस प्रकार सहायता कर सकते हैं?`
          : lang === "hinglish"
          ? `Yash Sharma Emperor Smart Solutions ke Founder hain. Woh enterprise AI aur custom software engineering lead karte hain. Aaj hum aapke digital project mein kaise help kar sakte hain?`
          : `Yash Sharma is the Founder of Emperor Smart Solutions. He leads custom engineering and enterprise AI initiatives at ESS. How can Emperor Smart Solutions assist you with your project today?`;
      } else {
        deterministicReply = lang === "hindi"
          ? `Emperor Smart Solutions (ESS) के संस्थापक और नेतृत्व हैं:

1. **Yash Sharma** — Founder (संस्थापक)
2. **Karan Makwana** — Co-Founder (सह-संस्थापक)

Emperor Smart Solutions एक प्रमुख कस्टम सॉफ्टवेयर इंजीनियरिंग और एंटरप्राइज AI डेवलपमेंट कंपनी है, जिसका मुख्यालय अहमदाबाद, गुजरात में स्थित है। आज हम आपके प्रोजेक्ट में किस प्रकार सहायता कर सकते हैं?`
          : lang === "hinglish"
          ? `Emperor Smart Solutions (ESS) ke founders aur leadership yeh hain:

1. **Yash Sharma** — Founder
2. **Karan Makwana** — Co-Founder

Emperor Smart Solutions ek premier custom software engineering aur enterprise AI development company hai, jiska head office Ahmedabad, Gujarat mein hai. Aaj hum aapke digital project mein kaise help kar sakte hain?`
          : `The founders and leadership of Emperor Smart Solutions (ESS) are:

1. **Yash Sharma** — Founder
2. **Karan Makwana** — Co-Founder

Emperor Smart Solutions is a premier custom software engineering and enterprise AI development company headquartered in Ahmedabad, Gujarat. How can we assist you with your project today?`;
      }
    } else if (/\b(?:guarantee\s+delivery|delivery\s+(?:within|in)?\s*(?:7|seven)\s*days?|7\s*day\s*(?:delivery|guarantee)|seven\s*day\s*(?:delivery|guarantee))\b/i.test(message)) {
      deterministicReply = `Emperor Smart Solutions (ESS) does not guarantee delivery of every mobile app within seven days. Production-grade custom mobile and web applications require structured UI/UX architecture, end-to-end engineering, and rigorous QA testing, which typically takes between 2 to 6 weeks depending on requirements and milestones. We do not provide unrealistic 7-day guarantees, as quality, security, and scalability are our top priorities.

Would you like to discuss your project requirements and receive a realistic timeline? Feel free to share your **Name and Phone Number (or WhatsApp)** so our technical team can prepare a customized proposal!`;
    } else if (
      /\b(?:what\s+features|feature\s*list|tell\s+me\s+all\s+features|explain\s+all\s+features|clinic\s+features)\b/i.test(message) &&
      /\b(?:clinic|hospital|doctor|healthcare|medical)\b/i.test(message)
    ) {
      quickReplies = ["Book a live demo", "Get formal quotation", "Tech stack"];
      deterministicReply = `At Emperor Smart Solutions, we specialize in building custom, high-performance websites, patient portals, and digital healthcare platforms tailored specifically for clinics and healthcare providers! 🏥

Here is what our software engineering team builds for your clinic:
1. **Online Patient Appointment Booking:** Real-time doctor calendar scheduling, department filtering, and automated WhatsApp/SMS appointment confirmations.
2. **Doctor Profiles & Services Showcase:** Interactive doctor credentials, clinical specialties, treatment descriptions, and verified patient reviews.
3. **Teleconsultation & Patient Portal:** Secure virtual consultations, digital prescriptions, and electronic medical record management.
4. **Modern, High-Speed Architecture:** Engineered on Next.js and React with PostgreSQL, ensuring sub-second page loads and top local patient Google SEO rankings.

Our custom clinic website & MVP packages start from **₹50,000** (18% GST extra), which includes complete UI/UX design, full-stack engineering, QA testing, and 30 days of free post-launch support.`;
    } else if (isCelebrityOrTriviaQuery) {
      deterministicReply = `I can help with ESS's business and technology services. Which digital solution are you planning to build?`;
      quickReplies = [...ALL_ESS_SERVICES];
    } else if (isLowBudgetQuery) {
      const askForLead = (resolvedName && resolvedName !== "Website Visitor" && resolvedName !== "Website Prospect")
        ? (resolvedPhone ? "" : (
            lang === "hindi"
              ? "\n\nक्या आप अपना **फ़ोन नंबर (या WhatsApp)** साझा कर सकते हैं ताकि हमारे तकनीकी विशेषज्ञ सीधे आपसे संपर्क कर सकें?"
              : lang === "hinglish"
              ? "\n\nKya aap apna **Phone Number (ya WhatsApp)** share kar sakte hain taaki hamari technical team aapse directly connect kar sake?"
              : "\n\nCould you please share your **Phone Number (or WhatsApp)** so our technical specialists can connect with you directly to explore your options?"
          ))
        : (
            lang === "hindi"
              ? "\n\nक्या आप अपना **नाम और फ़ोन नंबर (या WhatsApp)** साझा कर सकते हैं ताकि हमारे तकनीकी विशेषज्ञ सीधे आपसे संपर्क कर सकें?"
              : lang === "hinglish"
              ? "\n\nKya aap apna **Name aur Phone Number (ya WhatsApp)** share kar sakte hain taaki hamari technical team aapse directly connect kar sake?"
              : "\n\nCould you please share your **Name and Phone Number (or WhatsApp)** so our technical specialists can connect with you directly to explore your options?"
          );

      if (lang === "hindi") {
        deterministicReply = `हम आपके बजट का पूरा सम्मान करते हैं! हालांकि हमारे पूर्ण-स्तरीय कस्टम सॉफ़्टवेयर और एप्लिकेशन व्यापक आर्किटेक्चर, UI/UX और गुणवत्ता इंजीनियरिंग सुनिश्चित करने के लिए आमतौर पर ₹50,000 से शुरू होते हैं, लेकिन हमें आपके प्रोजेक्ट के लक्ष्यों को समझने और एक हल्के MVP या चरणबद्ध रोडमैप पर चर्चा करने में खुशी होगी जो आपके बजट के अनुकूल हो!

हमारे आधिकारिक संपर्क विवरण:
📞 **फ़ोन और WhatsApp:** +91 63591 20081
📧 **ईमेल:** contact@emperorsmartsolutions.com
🌐 **वेबसाइट:** https://emperorsmartsolutions.com${askForLead}`;
      } else if (lang === "hinglish") {
        deterministicReply = `Hum aapke budget ki poori respect karte hain! Halanki hamare custom software aur applications comprehensive architecture, UI/UX, aur quality engineering ensure karne ke liye normally ₹50,000 se start hote hain, par hum aapke goals ko samajhkar ek scoped MVP ya phased roadmap explore karne mein khush honge jo aapke budget mein fit ho sake!

Official contact details:
📞 **Phone & WhatsApp:** +91 63591 20081
📧 **Email:** contact@emperorsmartsolutions.com
🌐 **Website:** https://emperorsmartsolutions.com${askForLead}`;
      } else {
        deterministicReply = `We completely respect your budget! While our full-scale custom software and bespoke applications typically start from ₹50,000 to cover comprehensive architecture, UI/UX, and quality engineering, we would be delighted to learn about your goals and explore a lightweight MVP, pre-built modules, or a phased roadmap that fits your budget!

Here are our official contact details to speak with our engineering leadership:
📞 **Phone & WhatsApp:** +91 63591 20081
📧 **Email:** contact@emperorsmartsolutions.com
🌐 **Website:** https://emperorsmartsolutions.com${askForLead}`;
      }
    }

    // Consultative Adaptive Sales Flow Handler
    if (!deterministicReply) {
      const salesResult = handleSalesFlowTurn({
        message,
        existingQualification: existingConv?.qualification,
        sessionHistory,
        lang,
        visitorName: (!isPlaceholderName(resolvedName)) ? resolvedName : "",
        visitorPhone: resolvedPhone,
        visitorEmail: resolvedEmail,
      });

      if (salesResult.shouldHandle) {
        deterministicReply = salesResult.reply;
        quickReplies = salesResult.quickReplies || [];
        if (salesResult.updatedQualification) {
          const conv = conversationsStore.getConversation(currentSessionId);
          if (conv) {
            conversationsStore.updateConversation(currentSessionId, {
              qualification: salesResult.updatedQualification,
              ...(!isPlaceholderName(resolvedName) ? { visitorName: resolvedName } : {}),
              ...(resolvedPhone ? { visitorPhone: resolvedPhone } : {}),
              ...(resolvedEmail ? { visitorEmail: resolvedEmail } : {}),
            });
          } else {
            conversationsStore.createConversation({
              id: currentSessionId,
              botId: bot?.id || botId,
              botName: botName,
              visitorName: (!isPlaceholderName(resolvedName)) ? resolvedName : "Website Visitor",
              visitorEmail: resolvedEmail || "",
              visitorPhone: resolvedPhone || "",
              qualification: salesResult.updatedQualification,
              messages: [],
            });
          }

          // Persist real-time qualification progress and every Yes/No answer to the Lead
          const qAnswers = salesResult.updatedQualification.answers || {};
          const inquirySummary = salesResult.leadDataToSave?.summary || formatQualificationInquiry(salesResult.updatedQualification);
          leadsStore.createLead({
            sessionId: currentSessionId,
            botId: bot?.id || botId,
            name: (!isPlaceholderName(resolvedName)) ? resolvedName : (leadDetails.name || "Website Prospect"),
            email: resolvedEmail || "",
            phone: resolvedPhone || "",
            company: bot?.company || "Direct Inbound",
            bot: botName,
            inquiry: inquirySummary,
            budget: qAnswers.budget || "₹50,000+",
            answers: qAnswers,
            qualification: salesResult.updatedQualification,
            source: "Web Chatbot Widget",
          });
        }
      }
    }

    // --- PHASE 3: REAL-TIME SSE STREAMING (if requested) ---
    const isSseRequested =
      Boolean(requestStream) ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (isSseRequested) {
      if (deterministicReply) {
        conversationsStore.addMessage(currentSessionId, { role: "user", content: message });
        conversationsStore.addMessage(currentSessionId, {
          role: "assistant",
          content: deterministicReply,
          quickReplies: quickReplies || [],
        });
        if (resolvedName || resolvedPhone || resolvedEmail) {
          conversationsStore.updateConversation(currentSessionId, {
            ...(!isPlaceholderName(resolvedName) ? { visitorName: resolvedName } : {}),
            ...(resolvedPhone ? { visitorPhone: resolvedPhone } : {}),
            ...(resolvedEmail ? { visitorEmail: resolvedEmail } : {}),
            ...(resolvedPhone || resolvedEmail ? { isLead: true } : {}),
          });
        }
        const hasActionableContact = Boolean(resolvedEmail || resolvedPhone);
        if (hasActionableContact) {
          const leadData = {
            sessionId: currentSessionId,
            botId: bot?.id || "bot_aa",
            name: (!isPlaceholderName(resolvedName)) ? resolvedName : (leadDetails.name || "Website Prospect"),
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
        let streamPayload = `data: ${JSON.stringify({ token: deterministicReply })}\n\n`;
        if (quickReplies && quickReplies.length > 0) {
          streamPayload += `data: ${JSON.stringify({ quickReplies })}\n\n`;
        }
        streamPayload += `data: [DONE]\n\n`;
        return new Response(streamPayload, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
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

          if (resolvedName || resolvedPhone || resolvedEmail) {
            conversationsStore.updateConversation(currentSessionId, {
              ...(!isPlaceholderName(resolvedName) ? { visitorName: resolvedName } : {}),
              ...(resolvedPhone ? { visitorPhone: resolvedPhone } : {}),
              ...(resolvedEmail ? { visitorEmail: resolvedEmail } : {}),
              ...(resolvedPhone || resolvedEmail ? { isLead: true } : {}),
            });
          }

          // Check lead capture: require email or phone before creating a CRM lead
          const hasActionableContact = Boolean(resolvedEmail || resolvedPhone);
          if (hasActionableContact) {
            const leadData = {
              sessionId: currentSessionId,
              botId: bot?.id || "bot_aa",
              name: (!isPlaceholderName(resolvedName)) ? resolvedName : (leadDetails.name || "Website Prospect"),
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
        name: (!isPlaceholderName(resolvedName)) ? resolvedName : (leadDetails.name || "Website Prospect"),
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
      if (resolvedName || resolvedPhone || resolvedEmail) {
        conversationsStore.updateConversation(currentSessionId, {
          ...(!isPlaceholderName(resolvedName) ? { visitorName: resolvedName } : {}),
          ...(resolvedPhone ? { visitorPhone: resolvedPhone } : {}),
          ...(resolvedEmail ? { visitorEmail: resolvedEmail } : {}),
          ...(resolvedPhone || resolvedEmail ? { isLead: true } : {}),
        });
      }
    } else {
      conversationsStore.createConversation({
        id: currentSessionId,
        botId: bot?.id || botId,
        botName: botName,
        visitorName: (!isPlaceholderName(resolvedName)) ? resolvedName : "Website Visitor",
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
        quickReplies: quickReplies || [],
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
