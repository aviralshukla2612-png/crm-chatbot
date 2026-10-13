/**
 * Robust Lead Extraction for Sales Inbound Chatbots
 * Accurately extracts Name, Phone (India & Global), Email, and Project Inquiry
 */

export function extractLeadDetails(message = "", history = []) {
  // Combine ONLY USER messages from recent turns (NEVER extract from assistant replies!)
  const userTexts = [
    ...history
      .filter((m) => (typeof m === "object" ? m.role === "user" : true))
      .slice(-6)
      .map((m) => (typeof m === "string" ? m : m.content || "")),
    message,
  ].filter(Boolean);

  const recentTexts = userTexts;
  const fullText = userTexts.join("\n");

  // Company contact patterns to NEVER extract as visitor leads
  const isCompanyEmail = (em) =>
    /emperorsmartsolutions\.com|emperorsmartsolutions@gmail\.com|^contact@|^sales@|^info@|^support@|^careers@/i.test(em || "");
  // 1. Extract Email: search newest user messages first
  let email = "";
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  for (const text of userTexts.slice().reverse()) {
    const match = text.match(emailRegex);
    if (match && !isCompanyEmail(match[0].trim())) {
      email = match[0].trim();
      break;
    }
  }

  // 2. Extract Phone (Indian mobile, 10-12 digits, labeled phone with typos, global formats)
  function formatPhoneNumber(raw) {
    if (!raw) return "";
    const clean = raw.trim();
    const digits = clean.replace(/\D/g, "");
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return clean;
  }

  let phone = "";
  const indianPhoneRegex = /(?:(?:\+|00)91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5,6}\b/;
  const labeledPhoneRegex = /(?:phone|number|nunmber|mobile|whatsapp|contact|no)\s*(?:is|:|-)?\s*(\+?\d{10,12})\b/i;
  const rawDigitsRegex = /\b[6-9]\d{9,11}\b/;
  const globalPhoneRegex = /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

  let indianMatch = null;
  for (const text of userTexts.slice().reverse()) {
    const labeledMatch = text.match(labeledPhoneRegex);
    if (labeledMatch && labeledMatch[1]) {
      phone = formatPhoneNumber(labeledMatch[1]);
      break;
    }
    const indMatch = text.match(indianPhoneRegex);
    if (indMatch) {
      indianMatch = indMatch;
      phone = formatPhoneNumber(indMatch[0]);
      break;
    }
    const rawMatch = text.match(rawDigitsRegex);
    if (rawMatch) {
      phone = formatPhoneNumber(rawMatch[0]);
      break;
    }
    const globMatch = text.match(globalPhoneRegex);
    if (globMatch) {
      phone = globMatch[0].trim();
      break;
    }
  }

  // 3. Extract Name: search newest messages first, with strict validation
  let name = "";

  const NON_NAME_WORDS = new Set([
    // Question words
    "who", "what", "where", "when", "why", "how", "which", "whose", "whom",
    // Auxiliary & Common verbs
    "is", "are", "was", "were", "am", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "done",
    "can", "could", "will", "would", "shall", "should", "may", "might", "must",
    "want", "need", "like", "build", "make", "create", "develop", "code", "design",
    "hire", "help", "tell", "give", "show", "find", "get", "got", "send", "know",
    "see", "look", "ask", "call", "say", "talk", "speak", "discuss", "offer", "provide",
    "interested", "looking", "ready", "seeking", "planning", "trying", "working",
    // Pronouns
    "i", "me", "my", "myself", "you", "your", "yours", "yourself",
    "he", "him", "his", "she", "her", "hers", "it", "its",
    "we", "us", "our", "ours", "they", "them", "their", "theirs",
    "this", "that", "these", "those", "there", "here",
    // Conjunctions & prepositions
    "a", "an", "the", "and", "or", "but", "if", "because", "as", "until", "while",
    "of", "at", "by", "for", "with", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out",
    "on", "off", "over", "under", "again", "further", "then", "once", "also", "just", "only",
    // Greetings / Conversational
    "hi", "hii", "hello", "hey", "yo", "sup", "whatsup", "greetings", "namaste",
    "yes", "no", "ok", "okay", "sure", "fine", "yep", "nope", "yeah", "nah",
    "thanks", "thank", "please", "welcome", "sorry", "bye", "goodbye",
    "good", "bad", "great", "nice", "cool", "morning", "afternoon", "evening", "night",
    // Business / Tech / Domain terms / Celebrities
    "ess", "emperor", "solution", "solutions", "software", "tech", "company", "firm",
    "website", "web", "site", "app", "apps", "application", "mobile", "flutter", "react",
    "native", "ios", "android", "node", "python", "backend", "frontend", "api", "ai",
    "bot", "chatbot", "agent", "agents", "saas", "project", "mvp", "prototype",
    "quote", "cost", "price", "pricing", "rate", "budget", "money", "cash", "rupees",
    "rs", "inr", "dollar", "dollars", "k", "lakh", "crore",
    "info", "details", "contact", "number", "phone", "email", "address", "office",
    "location", "founder", "founders", "cofounder", "ceo", "cto", "developer", "engineer",
    "srk", "salman", "khan", "actor", "movie", "film", "star", "celebrity"
  ]);

  function isValidPersonName(str) {
    if (!str || typeof str !== "string") return false;
    const clean = str.trim();
    if (!/^[A-Za-z.']{2,20}(?:\s+[A-Za-z.']{2,20}){0,2}$/.test(clean)) return false;
    const words = clean.toLowerCase().split(/\s+/);
    for (const w of words) {
      const stripped = w.replace(/[.']/g, "");
      if (NON_NAME_WORDS.has(stripped)) {
        return false;
      }
    }
    return true;
  }

  const namePatterns = [
    /(?:my\s+name\s+(?:is\s+)?|i\s+am|i'm|this\s+is|call\s+me|myself|mera\s+naam\s+(?:hai\s+)?)\s*([A-Za-z.']{2,20}(?:\s+[A-Za-z.']{2,20})?)/i,
    /(?:name\s*[:\-\s]\s*)([A-Za-z.']{2,20}(?:\s+[A-Za-z.']{2,20})?)/i,
  ];

  for (const text of recentTexts.slice().reverse()) {
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].replace(/[.,:;!?]+$/, "").trim();
        if (isValidPersonName(candidate)) {
          name = candidate.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
          break;
        }
      }
    }
    if (name) break;
  }

  // If no explicit pattern, check for input containing phone: e.g. "Aviral, 9876543210" or "Aviral 9876543210"
  if (!name && phone) {
    for (const msg of recentTexts.slice().reverse()) {
      if (msg.includes(phone) || (indianMatch && msg.includes(indianMatch[0]))) {
        const rawPhone = indianMatch ? indianMatch[0] : phone;
        const remainder = msg.replace(rawPhone, "").replace(/[,:\n-]/g, " ").trim();
        if (isValidPersonName(remainder)) {
          name = remainder.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
          break;
        }
      }
    }
  }

  // Check if any recent user turn was a standalone 1-3 word person name in response to an assistant asking for name
  if (!name && Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn && turn.role === "user" && typeof turn.content === "string") {
        const clean = turn.content.trim();
        if (isValidPersonName(clean)) {
          const prevAssistant = history.slice(0, i).reverse().find((m) => m && m.role === "assistant");
          const askedForName = prevAssistant && /name|naam|who are you|introduce|number|whatsapp|assist you better|personalize/i.test(prevAssistant.content || "");
          if (askedForName) {
            name = clean.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            break;
          }
        }
      }
    }
  }

  // Also check if current message is a standalone valid name following an assistant prompt asking for name
  if (!name && Array.isArray(history) && history.length > 0) {
    const cleanCurrent = (message || "").trim();
    if (isValidPersonName(cleanCurrent)) {
      const lastAssistantTurn = [...history].reverse().find((m) => m && m.role === "assistant");
      const askedForName = lastAssistantTurn && /name|naam|who are you|introduce|number|whatsapp|assist you better|personalize/i.test(lastAssistantTurn.content || "");
      if (askedForName) {
        name = cleanCurrent.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      }
    }
  }

  // Fallback name from email if available
  if (!name && email) {
    const prefix = email.split("@")[0].replace(/[._-]/g, " ");
    name = prefix
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // 4. Extract Project Inquiry Topic
  let inquiry = "";
  const inquiries = [];
  for (const msg of recentTexts) {
    const lower = msg.toLowerCase();
    if (lower.includes("price") || lower.includes("cost") || lower.includes("quote") || lower.includes("rate")) {
      inquiries.push("Pricing & Commercial Quote");
    }
    if (lower.includes("hire") || lower.includes("developer") || lower.includes("engineer")) {
      inquiries.push("Dedicated Developer Hiring");
    }
    if (lower.includes("app") || lower.includes("flutter") || lower.includes("mobile") || lower.includes("ios") || lower.includes("android")) {
      inquiries.push("Mobile App Development");
    }
    if (lower.includes("ai") || lower.includes("rag") || lower.includes("llm") || lower.includes("bot") || lower.includes("agent")) {
      inquiries.push("Enterprise AI & RAG Solutions");
    }
    if (lower.includes("web") || lower.includes("saas") || lower.includes("website") || lower.includes("nextjs") || lower.includes("react")) {
      inquiries.push("Web & SaaS Engineering");
    }
    if (lower.includes("erp") || lower.includes("crm") || lower.includes("odoo") || lower.includes("sap")) {
      inquiries.push("ERP & CRM Systems");
    }
  }

  if (inquiries.length > 0) {
    inquiry = [...new Set(inquiries)].join(", ");
  } else {
    // Take the first question the user asked
    const firstUserMsg = recentTexts.find((t) => t.length > 10 && !t.includes(phone) && !t.includes(email));
    inquiry = firstUserMsg ? firstUserMsg.slice(0, 120) : "Consultation requested via live chat widget";
  }

  // Lead qualification score
  let score = "Medium";
  if (phone && email) {
    score = "Hot";
  } else if (phone) {
    score = "High";
  } else if (email) {
    score = "Medium";
  }

  return {
    hasLeadData: Boolean(phone || email || name),
    name: name || "",
    email,
    phone,
    inquiry,
    score,
  };
}
