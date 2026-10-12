/**
 * Robust Lead Extraction for Sales Inbound Chatbots
 * Accurately extracts Name, Phone (India & Global), Email, and Project Inquiry
 */

export function extractLeadDetails(message = "", history = []) {
  // Combine recent message turns to extract across multi-turn dialogue
  const recentTexts = [
    ...history.slice(-6).map((m) => (typeof m === "string" ? m : m.content || "")),
    message,
  ].filter(Boolean);

  const fullText = recentTexts.join("\n");

  // 1. Extract Email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailMatch = fullText.match(emailRegex);
  const email = emailMatch ? emailMatch[0].trim() : "";

  // 2. Extract Phone (Indian 10-digit mobile starting with 6-9, with optional +91/0, plus global formats)
  let phone = "";
  // Indian standard format: +91 98765 43210, 9876543210, 09876543210, +91-9876543210
  const indianPhoneRegex = /(?:(?:\+|00)91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/;
  // International standard format: +1 (555) 0199, etc.
  const globalPhoneRegex = /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

  const indianMatch = fullText.match(indianPhoneRegex);
  if (indianMatch) {
    // Format cleanly
    const digits = indianMatch[0].replace(/\D/g, "");
    if (digits.length === 10) {
      phone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    } else if (digits.length === 12 && digits.startsWith("91")) {
      phone = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    } else {
      phone = indianMatch[0].trim();
    }
  } else {
    const globalMatch = fullText.match(globalPhoneRegex);
    if (globalMatch) {
      phone = globalMatch[0].trim();
    }
  }

  // 3. Extract Name
  let name = "";

  // Explicit name patterns: "My name is John Doe", "I am Rohan", "Name: Yash"
  const namePatterns = [
    /(?:my\s+name\s+is|i\s+am|i'm|this\s+is|call\s+me|myself)\s+([A-Za-z]{2,20}(?:\s+[A-Za-z]{2,20})?)/i,
    /(?:name\s*[:\-])\s*([A-Za-z]{2,20}(?:\s+[A-Za-z]{2,20})?)/i,
  ];

  for (const pattern of namePatterns) {
    const match = fullText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const lower = candidate.toLowerCase();
      // Skip false positives
      if (!["interested", "looking", "here", "ready", "asking", "calling", "wanting", "user"].includes(lower)) {
        name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        break;
      }
    }
  }

  // If no explicit pattern, check for input containing phone: e.g. "Aviral, 9876543210" or "Aviral 9876543210"
  if (!name && phone) {
    for (const msg of recentTexts.slice().reverse()) {
      if (msg.includes(phone) || (indianMatch && msg.includes(indianMatch[0]))) {
        const rawPhone = indianMatch ? indianMatch[0] : phone;
        const remainder = msg.replace(rawPhone, "").replace(/[,:\n-]/g, " ").trim();
        if (
          /^[A-Za-z]{2,18}(?:\s+[A-Za-z]{2,18})?$/.test(remainder) &&
          !/^(?:hi|hii|hello|hey|dear|sir|mam|madam|thanks|yes|no)$/i.test(remainder)
        ) {
          name = remainder.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
          break;
        }
      }
    }
  }

  // Check if assistant previously asked for the visitor's name/number and visitor replied with just their name
  if (!name) {
    const lastAssistantTurn = [...history].reverse().find((m) => (typeof m === "object" && m.role === "assistant"));
    const askedForName = lastAssistantTurn && /name|naam|who are you|introduce|number|whatsapp/i.test(lastAssistantTurn.content || "");
    const cleanMsg = (message || "").trim();
    if (
      askedForName &&
      /^[A-Za-z]{2,18}(?:\s+[A-Za-z]{2,18}){0,2}$/.test(cleanMsg) &&
      !/^(?:hi|hii|hello|hey|yes|no|ok|okay|sure|thanks|price|cost|quote|office|address)$/i.test(cleanMsg)
    ) {
      name = cleanMsg.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
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
