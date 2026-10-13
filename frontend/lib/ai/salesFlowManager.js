/**
 * Adaptive Conversational Sales Flow Manager
 * Consultative sales qualification engine for Emperor Smart Solutions (ESS)
 * 
 * Flow capabilities:
 * - Short, sequential questions (5-20 words) with structured Quick Replies
 * - Adaptive branching based on answers provided (skips already known info)
 * - Multi-attribute extraction from single multi-requirement messages
 * - Graceful switching when customer changes project type halfway through
 * - Brief answering of direct questions before resuming qualification
 * - Concise summary and consent-based contact collection handoff
 * - Multi-language support (English, Hindi, Hinglish)
 */

export const QUALIFICATION_FLOWS = {
  website: {
    serviceName: "Website Development",
    questions: [
      {
        id: "is_business",
        text: {
          english: "Is this website for your business?",
          hindi: "क्या यह वेबसाइट आपके व्यवसाय के लिए है?",
          hinglish: "Kya yeh website aapke business ke liye hai?",
        },
        quickReplies: {
          english: ["Yes", "No"],
          hindi: ["हाँ", "नहीं"],
          hinglish: ["Haan", "Nahi"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|ha|bilkul|sure|definitely|business|company|clinic|shop|store|hospital)\b/i.test(text)) return true;
          if (/\b(?:no|nope|nah|nahi|personal|hobby|student)\b/i.test(text)) return false;
          return null;
        },
      },
      {
        id: "is_redesign",
        text: {
          english: "Do you need a new website or a redesign?",
          hindi: "क्या आपको एक नई वेबसाइट चाहिए या मौजूदा वेबसाइट का नया डिज़ाइन?",
          hinglish: "Aapko nayi website chahiye ya existing website ka redesign?",
        },
        quickReplies: {
          english: ["New website", "Redesign"],
          hindi: ["नई वेबसाइट", "री-डिज़ाइन"],
          hinglish: ["New website", "Redesign"],
        },
        extract: (text) => {
          if (/\b(?:redesign|revamp|re-design|existing|update\s+old|modify|improve)\b/i.test(text)) return "Redesign";
          if (/\b(?:new|fresh|scratch|from\s+scratch|start|nayi)\b/i.test(text)) return "New website";
          return null;
        },
      },
      {
        id: "website_type",
        text: {
          english: "Is it a business website, e-commerce store, portfolio, or web application?",
          hindi: "क्या यह एक बिजनेस वेबसाइट, ई-कॉमर्स स्टोर, पोर्टफोलियो या वेब एप्लिकेशन है?",
          hinglish: "Yeh business website, e-commerce store, portfolio ya web application hai?",
        },
        quickReplies: {
          english: ["Business website", "E-commerce", "Portfolio", "Web application", "Not sure"],
          hindi: ["बिजनेस वेबसाइट", "ई-कॉमर्स", "पोर्टफोलियो", "वेब ऐप", "पक्का नहीं"],
          hinglish: ["Business website", "E-commerce", "Portfolio", "Web application", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:e-?commerce|shop|store|sell\s+online|products?|cart|checkout)\b/i.test(text)) return "E-commerce";
          if (/\b(?:portfolio|showcase|resume|personal)\b/i.test(text)) return "Portfolio";
          if (/\b(?:web\s*app(?:lication)?|portal|saas|dashboard|platform)\b/i.test(text)) return "Web application";
          if (/\b(?:business|clinic|corporate|company|agency|services?)\b/i.test(text)) return "Business website";
          if (/\b(?:not\s+sure|don't\s+know|confused|pata\s+nahi)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_admin",
        text: {
          english: "Do you need an admin panel to manage content and users?",
          hindi: "क्या आपको सामग्री और उपयोगकर्ताओं को प्रबंधित करने के लिए एडमिन पैनल चाहिए?",
          hinglish: "Kya aapko content aur users manage karne ke liye admin panel chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|ha|admin|dashboard|management|control\s*panel)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|static|simple)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_payment",
        text: {
          english: "Do you need online payment gateway integration?",
          hindi: "क्या आपको ऑनलाइन पेमेंट गेटवे इंटीग्रेशन की आवश्यकता है?",
          hinglish: "Kya aapko online payment gateway integration chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No"],
          hindi: ["हाँ", "नहीं"],
          hinglish: ["Haan", "Nahi"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|payment|razorpay|stripe|upi|gateway|cards?|netbanking)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|cash|inquiry\s*only)\b/i.test(text)) return "No";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for this project?",
          hindi: "इस प्रोजेक्ट के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "Is project ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "₹2,00,000 से अधिक", "अभी तय नहीं"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When would you like to launch the website?",
          hindi: "आप वेबसाइट कब तक लॉन्च करना चाहते हैं?",
          hinglish: "Aap website kab tak launch karna chahte hain?",
        },
        quickReplies: {
          english: ["Within 2 weeks", "Within a month", "1–3 months", "Flexible"],
          hindi: ["2 सप्ताह में", "1 महीने में", "1–3 महीने में", "लचीला (Flexible)"],
          hinglish: ["Within 2 weeks", "Within a month", "1–3 months", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },

  mobile_app: {
    serviceName: "Mobile Application",
    questions: [
      {
        id: "platform",
        text: {
          english: "Do you need an Android app, iOS app, or both?",
          hindi: "क्या आपको एंड्रॉइड ऐप, आईओएस ऐप या दोनों चाहिए?",
          hinglish: "Aapko Android app, iOS app ya dono chahiye?",
        },
        quickReplies: {
          english: ["Android", "iOS", "Both"],
          hindi: ["एंड्रॉइड", "आईओएस (iOS)", "दोनों"],
          hinglish: ["Android", "iOS", "Both"],
        },
        extract: (text) => {
          if (/\b(?:both|dono|cross-?platform|flutter|react\s*native)\b/i.test(text)) return "Both Android & iOS";
          if (/\b(?:android)\b/i.test(text) && !/\b(?:ios|apple|iphone)\b/i.test(text)) return "Android";
          if (/\b(?:ios|apple|iphone)\b/i.test(text) && !/\b(?:android)\b/i.test(text)) return "iOS";
          return null;
        },
      },
      {
        id: "is_new_app",
        text: {
          english: "Is this a new app or an extension of an existing product?",
          hindi: "क्या यह एक नया ऐप है या किसी मौजूदा उत्पाद का विस्तार?",
          hinglish: "Kya yeh naya app hai ya existing product ka extension?",
        },
        quickReplies: {
          english: ["New app", "Existing product extension"],
          hindi: ["नया ऐप", "मौजूदा प्रोडक्ट का विस्तार"],
          hinglish: ["New app", "Existing product extension"],
        },
        extract: (text) => {
          if (/\b(?:existing|extension|integrate|upgrade|v2|current)\b/i.test(text)) return "Existing product extension";
          if (/\b(?:new|fresh|scratch|first\s*time|naya)\b/i.test(text)) return "New app";
          return null;
        },
      },
      {
        id: "needs_backend",
        text: {
          english: "Do you need a backend server and admin dashboard?",
          hindi: "क्या आपको बैकएंड सर्वर और एडमिन डैशबोर्ड की आवश्यकता है?",
          hinglish: "Kya aapko backend server aur admin dashboard chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|backend|api|server|database|admin|dashboard)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|offline|standalone)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "needs_payment",
        text: {
          english: "Do you require payment or third-party integrations?",
          hindi: "क्या आपको भुगतान या थर्ड-पार्टी इंटीग्रेशन की आवश्यकता है?",
          hinglish: "Kya aapko payment ya third-party integrations chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No"],
          hindi: ["हाँ", "नहीं"],
          hinglish: ["Haan", "Nahi"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|payment|gateway|maps?|sms|third-?party|api)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi)\b/i.test(text)) return "No";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for the mobile application?",
          hindi: "मोबाइल एप्लिकेशन के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "Mobile app ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "₹2,00,000 से अधिक", "अभी तय नहीं"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When do you want to launch your app?",
          hindi: "आप अपना ऐप कब तक लॉन्च करना चाहते हैं?",
          hinglish: "Aap apna app kab tak launch karna chahte hain?",
        },
        quickReplies: {
          english: ["Within a month", "1–3 months", "Flexible"],
          hindi: ["1 महीने में", "1–3 महीने में", "लचीला (Flexible)"],
          hinglish: ["Within a month", "1–3 months", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },

  ai_chatbot: {
    serviceName: "AI Chatbot & Automation",
    questions: [
      {
        id: "channel",
        text: {
          english: "Do you need the chatbot for your website, WhatsApp, or both?",
          hindi: "क्या आपको चैटबॉट वेबसाइट, व्हाट्सएप या दोनों के लिए चाहिए?",
          hinglish: "Aapko chatbot website, WhatsApp ya dono ke liye chahiye?",
        },
        quickReplies: {
          english: ["Website", "WhatsApp", "Both"],
          hindi: ["वेबसाइट", "व्हाट्सएप", "दोनों"],
          hinglish: ["Website", "WhatsApp", "Both"],
        },
        extract: (text) => {
          if (/\b(?:both|dono|all)\b/i.test(text)) return "Both Website & WhatsApp";
          if (/\b(?:whatsapp|wa)\b/i.test(text) && !/\b(?:website|web)\b/i.test(text)) return "WhatsApp";
          if (/\b(?:website|web|site)\b/i.test(text) && !/\b(?:whatsapp)\b/i.test(text)) return "Website";
          return null;
        },
      },
      {
        id: "needs_docs",
        text: {
          english: "Should it answer questions from your company documents and PDFs?",
          hindi: "क्या इसे आपकी कंपनी के दस्तावेज़ों और पीडीएफ से उत्तर देना चाहिए?",
          hinglish: "Kya ise aapke company documents aur PDFs se answer karna chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|docs|documents?|pdf|kb|knowledge|files?)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|faq|rules)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "purpose",
        text: {
          english: "Do you need lead collection, customer support automation, or both?",
          hindi: "क्या आपको लीड संग्रह, ग्राहक सहायता ऑटोमेशन या दोनों चाहिए?",
          hinglish: "Aapko lead collection, customer support automation ya dono chahiye?",
        },
        quickReplies: {
          english: ["Lead collection", "Customer support", "Both"],
          hindi: ["लीड संग्रह", "ग्राहक सहायता", "दोनों"],
          hinglish: ["Lead collection", "Customer support", "Both"],
        },
        extract: (text) => {
          if (/\b(?:both|dono)\b/i.test(text)) return "Both Leads & Support";
          if (/\b(?:lead|sales|inbound|enquiry|inquiries)\b/i.test(text)) return "Lead collection";
          if (/\b(?:support|customer|service|tickets?|helpdesk)\b/i.test(text)) return "Customer support";
          return null;
        },
      },
      {
        id: "needs_crm",
        text: {
          english: "Do you require integration with an existing CRM or database?",
          hindi: "क्या आपको मौजूदा CRM या डेटाबेस के साथ एकीकरण की आवश्यकता है?",
          hinglish: "Kya aapko existing CRM ya database ke saath integration chahiye?",
        },
        quickReplies: {
          english: ["Yes", "No", "Not sure"],
          hindi: ["हाँ", "नहीं", "पक्का नहीं"],
          hinglish: ["Haan", "Nahi", "Not sure"],
        },
        extract: (text) => {
          if (/\b(?:yes|yep|yeah|haan|crm|salesforce|hubspot|sheets?|database|webhook)\b/i.test(text)) return "Yes";
          if (/\b(?:no|nope|nah|nahi|standalone)\b/i.test(text)) return "No";
          if (/\b(?:not\s+sure|don't\s+know)\b/i.test(text)) return "Not sure";
          return null;
        },
      },
      {
        id: "budget",
        text: {
          english: "What is your approximate budget for the AI chatbot?",
          hindi: "एआई चैटबॉट के लिए आपका अनुमानित बजट क्या है?",
          hinglish: "AI chatbot ke liye aapka approximate budget kitna hai?",
        },
        quickReplies: {
          english: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
          hindi: ["₹50,000 से कम", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "₹2,00,000 से अधिक", "अभी तय नहीं"],
          hinglish: ["Under ₹50,000", "₹50,000–₹1,00,000", "₹1,00,000–₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
        },
        extract: (text) => extractBudgetAnswer(text),
      },
      {
        id: "timeline",
        text: {
          english: "When would you like to deploy the chatbot?",
          hindi: "आप चैटबॉट कब तक तैनात करना चाहते हैं?",
          hinglish: "Aap chatbot kab tak live karna chahte hain?",
        },
        quickReplies: {
          english: ["Within 2 weeks", "Within a month", "Flexible"],
          hindi: ["2 सप्ताह में", "1 महीने में", "लचीला (Flexible)"],
          hinglish: ["Within 2 weeks", "Within a month", "Flexible"],
        },
        extract: (text) => extractTimelineAnswer(text),
      },
    ],
  },
};

function extractBudgetAnswer(text) {
  const clean = text.toLowerCase();
  if (/\b(?:under\s*50|less\s*than\s*50|< ?50|below\s*50|50000\s*se\s*kam|50\s*k\s*se\s*kam|5k|10k|20k|30k|40k)\b/i.test(clean)) {
    return "Under ₹50,000";
  }
  if (/\b(?:50\s*k\s*(?:to|-)\s*1\s*l|50,000\s*(?:to|-)\s*1,00,000|50k|60k|70k|80k|90k|1\s*lakh)\b/i.test(clean)) {
    return "₹50,000–₹1,00,000";
  }
  if (/\b(?:1\s*l\s*(?:to|-)\s*2\s*l|1,00,000\s*(?:to|-)\s*2,00,000|1\.5\s*lakh|2\s*lakh)\b/i.test(clean)) {
    return "₹1,00,000–₹2,00,000";
  }
  if (/\b(?:above\s*2|more\s*than\s*2|> ?2|2\s*lakh\s*plus|3\s*lakh|5\s*lakh|enterprise)\b/i.test(clean)) {
    return "Above ₹2,00,000";
  }
  if (/\b(?:not\s+sure|don't\s+know|no\s+idea|tbd|pata\s+nahi|undecided|flexible)\b/i.test(clean)) {
    return "Not sure yet";
  }
  const match = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?\s*(?:k|lakh|lac)?)/i);
  if (match) {
    return match[0].startsWith("₹") ? match[0] : `₹${match[0]}`;
  }
  return null;
}

function extractTimelineAnswer(text) {
  const clean = text.toLowerCase();
  if (/\b(?:2\s*weeks?|two\s*weeks?|14\s*days?|urgent|asap|turant|immediately|jaldi)\b/i.test(clean)) {
    return "Within 2 weeks";
  }
  if (/\b(?:month|1\s*month|one\s*month|30\s*days?|char\s*hafte)\b/i.test(clean)) {
    return "Within a month";
  }
  if (/\b(?:1\s*(?:to|-)\s*3\s*months?|2\s*months?|3\s*months?|quarter)\b/i.test(clean)) {
    return "1–3 months";
  }
  if (/\b(?:flexible|no\s*rush|anytime|kabhi\s*bhi|aaram\s*se)\b/i.test(clean)) {
    return "Flexible";
  }
  return null;
}

/**
 * Detects if the visitor is initiating or switching services
 */
export function detectServiceIntent(message = "", currentService = null) {
  const clean = message.toLowerCase();

  // Mobile App Intent
  if (/\b(?:mobile\s*app|ios\s*app|android\s*app|flutter\s*app|react\s*native|build\s*an?\s*app|app\s*development|mobile\s*application)\b/i.test(clean)) {
    return "mobile_app";
  }

  // AI Chatbot Intent
  if (/\b(?:ai\s*chatbot|chatbot|bot|whatsapp\s*bot|rag|support\s*bot|automated\s*agent|ai\s*agent)\b/i.test(clean)) {
    return "ai_chatbot";
  }

  // Website Intent
  if (/\b(?:website|web\s*site|web\s*portal|web\s*page|landing\s*page|e-?commerce\s*website|clinic\s*website|business\s*website|web\s*platform)\b/i.test(clean)) {
    return "website";
  }

  // Custom Software / System Intent
  if (/\b(?:custom\s*software|software\s*development|software|erp|crm|custom\s*system)\b/i.test(clean)) {
    return "website";
  }

  // Generic Software / Web requirement
  if (/\b(?:build|develop|create|want|need)\s+(?:a|an)?\s*(?:new\s+)?(?:system|software|portal|platform)\b/i.test(clean)) {
    return currentService || "website";
  }

  return currentService || null;
}

/**
 * Formats all qualification answers into an informative inquiry string for the CRM lead
 */
export function formatQualificationInquiry(qualification) {
  if (!qualification || !qualification.service) return "Inquired via live chat widget";
  const flow = QUALIFICATION_FLOWS[qualification.service];
  const serviceName = flow ? flow.serviceName : qualification.service;
  const answers = qualification.answers || {};

  const parts = [];
  if (qualification.service === "website") {
    if (answers.is_business !== undefined) {
      parts.push(`Business: ${answers.is_business ? "Yes" : "No"}`);
    }
    if (answers.is_redesign) {
      parts.push(`Project: ${answers.is_redesign}`);
    }
    if (answers.website_type) {
      parts.push(`Type: ${answers.website_type}`);
    }
    if (answers.needs_admin) {
      parts.push(`Admin Panel: ${answers.needs_admin}`);
    }
    if (answers.needs_payment) {
      parts.push(`Online Payments: ${answers.needs_payment}`);
    }
  } else if (qualification.service === "mobile_app") {
    if (answers.platform) parts.push(`Platform: ${answers.platform}`);
    if (answers.is_new_app) parts.push(`App Type: ${answers.is_new_app}`);
    if (answers.needs_backend) parts.push(`Backend/Admin: ${answers.needs_backend}`);
    if (answers.needs_integrations) parts.push(`Integrations: ${answers.needs_integrations}`);
  } else if (qualification.service === "ai_chatbot") {
    if (answers.channel) parts.push(`Channel: ${answers.channel}`);
    if (answers.purpose) parts.push(`Purpose: ${answers.purpose}`);
    if (answers.needs_docs) parts.push(`Document RAG: ${answers.needs_docs}`);
    if (answers.needs_crm) parts.push(`CRM Sync: ${answers.needs_crm}`);
  }

  if (answers.budget) parts.push(`Budget: ${answers.budget}`);
  if (answers.timeline) parts.push(`Timeline: ${answers.timeline}`);

  if (parts.length === 0) {
    return `${serviceName} Inquiry (In progress)`;
  }
  return `${serviceName}: ${parts.join(" | ")}`;
}

/**
 * Recovers qualification state from session history if existingQualification is missing
 */
export function recoverQualificationFromHistory(sessionHistory = []) {
  if (!Array.isArray(sessionHistory) || sessionHistory.length === 0) return null;

  let service = null;
  const askedQuestions = [];
  const answers = {};

  for (const m of sessionHistory) {
    const text = m.content || "";
    if (m.role === "assistant") {
      if (/website\s+for\s+your\s+business|new\s+website\s+or\s+a\s+redesign|business\s+website,\s+e-commerce/i.test(text)) {
        service = "website";
      } else if (/Android\s+app,\s+iOS\s+app|new\s+app\s+or\s+an\s+extension/i.test(text)) {
        service = "mobile_app";
      } else if (/chatbot\s+for\s+your\s+website|answer\s+from\s+your\s+company\s+documents/i.test(text)) {
        service = "ai_chatbot";
      }
    } else if (m.role === "user" && !service) {
      const detected = detectServiceIntent(text);
      if (detected) service = detected;
    }
  }

  if (!service) return null;
  const flow = QUALIFICATION_FLOWS[service];
  if (!flow) return null;

  for (let i = 0; i < sessionHistory.length; i++) {
    const msg = sessionHistory[i];
    if (msg.role === "assistant") {
      const astText = msg.content || "";
      for (const q of flow.questions) {
        if (
          astText.includes(q.text.english) ||
          astText.includes(q.text.hindi) ||
          astText.includes(q.text.hinglish) ||
          (q.id === "is_business" && /website\s+for\s+your\s+business/i.test(astText)) ||
          (q.id === "is_redesign" && /new\s+website\s+or\s+(?:a\s+)?redesign/i.test(astText)) ||
          (q.id === "website_type" && /e-commerce\s+store,\s+portfolio/i.test(astText)) ||
          (q.id === "needs_admin" && /admin\s+panel/i.test(astText)) ||
          (q.id === "needs_payment" && /payment/i.test(astText)) ||
          (q.id === "budget" && /budget/i.test(astText)) ||
          (q.id === "timeline" && /launch/i.test(astText)) ||
          (q.id === "platform" && /Android\s+app,\s+iOS\s+app/i.test(astText))
        ) {
          if (!askedQuestions.includes(q.id)) askedQuestions.push(q.id);
          for (let j = i + 1; j < sessionHistory.length; j++) {
            if (sessionHistory[j].role === "user") {
              const uText = sessionHistory[j].content || "";
              const ans = q.extract(uText);
              if (ans !== null && ans !== undefined) {
                answers[q.id] = ans;
              }
              break;
            }
          }
        }
      }
    }
  }

  return {
    service,
    answers,
    askedQuestions,
    currentStage: askedQuestions[askedQuestions.length - 1] || "init",
    status: "in_progress",
    consentAsked: false,
  };
}

/**
 * Extracts multiple requirements from user message across flow definitions
 */
export function extractAnswersFromMessage(message = "", service = "website", currentAnswers = {}) {
  const flow = QUALIFICATION_FLOWS[service];
  if (!flow) return currentAnswers;

  const updated = { ...currentAnswers };

  for (const q of flow.questions) {
    if (updated[q.id] === undefined || updated[q.id] === null || updated[q.id] === "") {
      const extracted = q.extract(message);
      if (extracted !== null && extracted !== undefined) {
        updated[q.id] = extracted;
      }
    }
  }

  return updated;
}

/**
 * Gets the next unanswered question in the qualification flow
 */
export function getNextQuestion(service = "website", answers = {}, lang = "english") {
  const flow = QUALIFICATION_FLOWS[service];
  if (!flow) return null;

  for (const q of flow.questions) {
    if (answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === "") {
      const qText = q.text[lang] || q.text.english;
      const qReplies = q.quickReplies[lang] || q.quickReplies.english;
      return {
        id: q.id,
        text: qText,
        quickReplies: qReplies,
        isFinal: false,
      };
    }
  }

  return null;
}

/**
 * Generates concise summary of the customer's project requirements
 */
export function generateRequirementsSummary(service = "website", answers = {}, lang = "english") {
  const serviceTitle = QUALIFICATION_FLOWS[service]?.serviceName || "Digital Project";
  const parts = [];

  if (service === "website") {
    if (answers.website_type) parts.push(answers.website_type);
    if (answers.is_redesign) parts.push(answers.is_redesign === "Redesign" ? "redesign" : "new build");
    if (answers.needs_admin === "Yes") parts.push("with admin panel");
    if (answers.needs_payment === "Yes") parts.push("online payment gateway");
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`target launch: ${answers.timeline}`);
  } else if (service === "mobile_app") {
    if (answers.platform) parts.push(answers.platform);
    if (answers.is_new_app) parts.push(answers.is_new_app);
    if (answers.needs_backend === "Yes") parts.push("with custom backend");
    if (answers.needs_payment === "Yes") parts.push("payment integrations");
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`target launch: ${answers.timeline}`);
  } else if (service === "ai_chatbot") {
    if (answers.channel) parts.push(`for ${answers.channel}`);
    if (answers.purpose) parts.push(`purpose: ${answers.purpose}`);
    if (answers.needs_docs === "Yes") parts.push("document-trained RAG");
    if (answers.needs_crm === "Yes") parts.push("CRM integration");
    if (answers.budget) parts.push(`budget: ${answers.budget}`);
    if (answers.timeline) parts.push(`timeline: ${answers.timeline}`);
  }

  const specString = parts.length > 0 ? parts.join(", ") : "custom features";

  if (lang === "hindi") {
    return `शानदार! मैंने आपकी **${serviceTitle}** आवश्यकताओं को संक्षेप में नोट कर लिया है: ${specString}।`;
  }
  if (lang === "hinglish") {
    return `Great! Maine aapke **${serviceTitle}** requirements note kar liye hain: ${specString}.`;
  }
  return `Great! I've summarized your **${serviceTitle}** requirements: ${specString}.`;
}

/**
 * Checks if the user is asking a direct business question mid-flow
 */
export function detectDirectBusinessQuestion(message = "") {
  const clean = message.toLowerCase();

  if (/\b(?:what\s+is\s+your\s+starting\s+budget|how\s+much\s+does\s+it\s+cost|what\s+are\s+your\s+rates|minimum\s+budget|starting\s+price)\b/i.test(clean)) {
    return {
      type: "pricing",
      briefReply: {
        english: "Our custom development packages typically start from ₹50,000 (18% GST extra).",
        hindi: "हमारे कस्टम डेवलपमेंट पैकेज आमतौर पर ₹50,000 से शुरू होते हैं (18% GST अतिरिक्त)।",
        hinglish: "Hamare custom development packages typically ₹50,000 se start hote hain (18% GST extra).",
      },
    };
  }

  if (/\b(?:what\s+are\s+your\s+recent\s+projects|share\s+portfolio|case\s+studies|past\s+work)\b/i.test(clean)) {
    return {
      type: "portfolio",
      briefReply: {
        english: "ESS has delivered 50+ production systems across mobile apps, SaaS web platforms, and custom AI pipelines.",
        hindi: "ESS ने मोबाइल ऐप्स, सास वेब प्लेटफॉर्म और कस्टम एआई सिस्टम में 50 से अधिक सफल प्रोजेक्ट्स डिलीवर किए हैं।",
        hinglish: "ESS ne mobile apps, SaaS web platforms aur custom AI pipelines mein 50+ successful projects deliver kiye hain.",
      },
    };
  }

  if (/\b(?:which\s+tech\s*stack|what\s+technologies|do\s+you\s+use\s+flutter|next\.?js)\b/i.test(clean)) {
    return {
      type: "tech_stack",
      briefReply: {
        english: "We engineer enterprise solutions using Next.js, React, Node.js, Flutter, and PostgreSQL.",
        hindi: "हम Next.js, React, Node.js, Flutter और PostgreSQL का उपयोग करके उच्च-प्रदर्शन समाधान बनाते हैं।",
        hinglish: "Hum Next.js, React, Node.js, Flutter aur PostgreSQL use karke high-performance solutions engineer karte hain.",
      },
    };
  }

  return null;
}

/**
 * Main Consultative Sales Flow Coordinator
 */
export function handleSalesFlowTurn({
  message = "",
  existingQualification = null,
  sessionHistory = [],
  lang = "english",
  visitorName = "",
}) {
  const cleanMsg = message.trim();
  let current = existingQualification
    ? { ...existingQualification }
    : {
        service: null,
        answers: {},
        askedQuestions: [],
        currentStage: "init",
        status: "idle",
        consentAsked: false,
      };

  // 0. Auto-recover service and qualification from sessionHistory if missing
  if (!current.service && Array.isArray(sessionHistory) && sessionHistory.length > 0) {
    const recovered = recoverQualificationFromHistory(sessionHistory);
    if (recovered && recovered.service) {
      current.service = recovered.service;
      current.answers = { ...(recovered.answers || {}), ...(current.answers || {}) };
      current.askedQuestions = Array.from(new Set([...(recovered.askedQuestions || []), ...(current.askedQuestions || [])]));
      current.currentStage = recovered.currentStage;
      current.status = "in_progress";
    }
  }

  // 1. Detect service or switch of service
  const detectedService = detectServiceIntent(cleanMsg, current.service);
  const serviceChanged = Boolean(detectedService && current.service && detectedService !== current.service);

  if (serviceChanged) {
    current.service = detectedService;
    current.answers = {};
    current.askedQuestions = [];
    current.status = "in_progress";
    current.consentAsked = false;
  } else if (detectedService && !current.service) {
    current.service = detectedService;
    current.status = "in_progress";
  }

  if (!current.service) {
    return { shouldHandle: false };
  }

  // 2. Check if user already provided consent to be contacted
  if (current.consentAsked) {
    if (/\b(?:yes|contact\s*me|sure|okay|definitely|call\s*me|haan|kar\s*lo|theek\s*hai)\b/i.test(cleanMsg)) {
      current.status = "collecting_contact";
      const promptText = lang === "hindi"
        ? (visitorName ? `धन्यवाद ${visitorName}! कृपया अपना **फ़ोन नंबर (या WhatsApp)** साझा करें ताकि हमारी तकनीकी टीम आपसे संपर्क कर सके।` : "कृपया अपना **नाम और फ़ोन नंबर (या WhatsApp)** साझा करें ताकि हमारी तकनीकी टीम आपसे संपर्क कर सके।")
        : lang === "hinglish"
        ? (visitorName ? `Thank you ${visitorName}! Please apna **Phone Number (ya WhatsApp)** share karein taaki hamari technical team aapse connect karein.` : "Please apna **Name aur Phone Number (ya WhatsApp)** share karein taaki hamari technical team aapse connect kar sakein.")
        : (visitorName ? `Thank you ${visitorName}! Could you please share your **Phone Number (or WhatsApp)** so our technical team can prepare your proposal?` : "Could you please share your **Name and Phone Number (or WhatsApp)** so our technical team can prepare a formal proposal?");
      return {
        shouldHandle: true,
        reply: promptText,
        quickReplies: [],
        updatedQualification: current,
        leadDataToSave: {
          service: current.service,
          answers: current.answers,
          summary: formatQualificationInquiry(current),
        },
      };
    } else if (/\b(?:no|not\s*now|later|nahi|badme|baad\s*mein|not\s*right\s*now)\b/i.test(cleanMsg)) {
      current.status = "completed";
      const replyText = lang === "hindi"
        ? "बिल्कुल! यदि आपके कोई अन्य तकनीकी प्रश्न हैं, तो मैं यहाँ सहायता के लिए उपलब्ध हूँ।"
        : lang === "hinglish"
        ? "Bilkul koi baat nahi! Agar aapka koi aur technical ya project question hai, toh main yahan help ke liye hoon."
        : "No problem at all! Feel free to ask any other technical or business questions when you're ready.";
      return {
        shouldHandle: true,
        reply: replyText,
        quickReplies: ["Tell me about ESS", "Recent projects", "Tech stack"],
        updatedQualification: current,
        leadDataToSave: {
          service: current.service,
          answers: current.answers,
          summary: formatQualificationInquiry(current),
        },
      };
    }
  }

  // 3. Extract answers from incoming message across all attributes
  // Prioritize answering currentStage if cleanMsg is a direct reply like "Yes", "No", "New website", etc.
  if (current.currentStage && current.service) {
    const flow = QUALIFICATION_FLOWS[current.service];
    const currentQ = flow?.questions.find((q) => q.id === current.currentStage);
    if (currentQ && (current.answers[currentQ.id] === undefined || current.answers[currentQ.id] === null)) {
      const singleAns = currentQ.extract(cleanMsg);
      if (singleAns !== null && singleAns !== undefined) {
        current.answers[currentQ.id] = singleAns;
      }
    }
  }

  current.answers = extractAnswersFromMessage(cleanMsg, current.service, current.answers);

  // 4. Check if user asked a direct question mid-flow
  const directQ = detectDirectBusinessQuestion(cleanMsg);
  const briefAnswer = directQ ? directQ.briefReply[lang] || directQ.briefReply.english : null;

  // 5. Find the next unanswered qualification question
  const nextQ = getNextQuestion(current.service, current.answers, lang);

  if (nextQ) {
    current.askedQuestions = Array.from(new Set([...current.askedQuestions, nextQ.id]));
    current.currentStage = nextQ.id;

    let finalReply = nextQ.text;
    if (briefAnswer) {
      finalReply = `${briefAnswer} ${nextQ.text}`;
    }

    return {
      shouldHandle: true,
      reply: finalReply,
      quickReplies: nextQ.quickReplies,
      updatedQualification: current,
      leadDataToSave: {
        service: current.service,
        answers: current.answers,
        summary: formatQualificationInquiry(current),
      },
    };
  }

  // 6. All qualification questions answered! Present brief summary and ask for contact consent
  const summary = generateRequirementsSummary(current.service, current.answers, lang);
  current.status = "summary_ready";
  current.consentAsked = true;

  const consentPrompt = lang === "hindi"
    ? `${summary}\n\nक्या आप चाहेंगे कि ESS इंजीनियरिंग टीम इस प्रोजेक्ट पर आपसे चर्चा करने के लिए संपर्क करे?`
    : lang === "hinglish"
    ? `${summary}\n\nKya aap chahenge ki ESS technical team is project ko discuss karne ke liye aapse connect kare?`
    : `${summary}\n\nWould you like the ESS team to contact you about this project?`;

  const consentReplies = lang === "hindi"
    ? ["हाँ, संपर्क करें", "अभी नहीं"]
    : lang === "hinglish"
    ? ["Haan, contact me", "Not right now"]
    : ["Yes, contact me", "Not right now"];

  return {
    shouldHandle: true,
    reply: consentPrompt,
    quickReplies: consentReplies,
    updatedQualification: current,
    leadDataToSave: {
      service: current.service,
      answers: current.answers,
      summary: summary,
    },
  };
}
