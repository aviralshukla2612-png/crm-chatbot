/**
 * Server-Side Intent Classification & Business Scope Enforcement Layer
 *
 * Provides pre-LLM deterministic and semantic intent routing across 7 standard categories:
 * - BUSINESS_RELEVANT
 * - BUSINESS_TECHNICAL
 * - COMPANY_SPECIFIC
 * - CUSTOMER_SPECIFIC
 * - OUT_OF_SCOPE
 * - AMBIGUOUS
 * - UNSAFE_OR_UNAUTHORIZED
 *
 * Configurable per bot/tenant so each assistant operates strictly within its
 * configured business scope without hardcoded company coupling.
 */

// Prompt injection and jailbreak attack patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions|directions|rules|prompts)/i,
  /you\s+are\s+now\s+(?:an?\s+unrestricted|a\s+new|dan|jailbroken|free)/i,
  /developer\s+mode\s+(?:enabled|on|activate)/i,
  /reveal\s+(?:your|the)\s+(?:hidden|system|master|secret)\s+(?:prompt|instructions|rules)/i,
  /what\s+(?:is|are)\s+your\s+(?:system|initial|hidden)\s+(?:prompt|instructions|rules)/i,
  /bypass\s+(?:all\s+)?(?:safety|content|system|security)\s+(?:filters|policies|rules)/i,
  /output\s+(?:your|the)\s+(?:rules|guidelines|prompt|instructions)\s+verbatim/i,
  /disregard\s+(?:all\s+)?(?:safety|guardrails|instructions)/i,
];

// Cross-tenant document / secret exfiltration patterns
const CROSS_TENANT_EXFILTRATION_PATTERNS = [
  /(?:show|give|fetch|view|download|read|list|dump)\s+(?:me\s+)?(?:all\s+)?(?:other|another|all)\s+(?:customer'?s?|tenant'?s?|client'?s?|user'?s?)\s+(?:uploaded\s+)?(?:documents?|files?|data|chats?|conversations?|records?|credentials?|passwords?)/i,
  /(?:show|access|view)\s+(?:another|other)\s+(?:tenant|customer|organization)\b/i,
  /(?:internal\s+database\s+credentials|database\s+password|api\s+keys|env\s+variables|jwt\s+secret)/i,
];

// Out-of-scope entertainment, pop culture, sports, relationships, philosophy, and general trivia patterns
const ENTERTAINMENT_AND_TRIVIA_PATTERNS = [
  /\b(?:comedian|comedians|comedy|stand-?up|standup|joke|jokes|funny|roast|meme|memes|riddle|riddles|story|stories|poem|poems|poetry|rhyme|song|songs|lyrics|music|singer|singers|album|rap|act|acted|acting|actor|actors|actress|actresses|cast|movie|movies|film|films|cinema|trailer|box\s*office|bollywood|hollywood|dabang|dabangg|sholay|bahubali|kgf|pushpa|pathaan|jawan|dangal|avatar|marvel|dc|batman|superman|spiderman|anime|manga|series|season|episode|director|producer|hero|heroine|villain|dialogue)\b/i,
  /\b(?:cricket|ipl|bcci|icc|world\s*cup|trophy|match|tournament|football|fifa|goal|messi|ronaldo|batting|bowling|wicket|toss|stadium|tennis|badminton|olympics|medal|chess|grandmaster|pubg|free\s*fire|bgmi|fortnite|gameplay)\b/i,
  /\b(?:salman|salman\s+khan|shah\s*rukh|srk|aamir|akshay|deepika|katrina|alia|ranbir|ranveer|kareena|priyanka|amitabh|bachchan|hrithik|rajinikanth|prabhas|allu\s*arjun|modi|rahul\s*gandhi|nehru|gandhi|bjp|congress|trump|biden|putin|obama|hasan\s*minhaj|john\s*mulaney|ali\s*wong|trevor\s*noah|zakir\s*khan|bassie|samay\s*raina|munawar)\b/i,
  /\b(?:recipe|recipes|cook|cooking|bake|baking|fry|boil|ingredients|dish|dishes|curry|paneer|chicken|biryani|pizza|burger|pasta|noodles|cake|dessert|calories|diet|workout|gym)\b/i,
  /\b(?:dinosaur|dinosaurs|planet|planets|solar\s*system|mars|jupiter|moon|galaxy|universe|black\s*hole|gravity|quantum\s*physics|photosynthesis|dna|evolution|world\s*war|dynasty|mughal|british\s*raj|independence|freedom\s*fighter|capital\s*of|longest\s*river|highest\s*mountain|mythology|ramayana|mahabharata|zeus|gods)\b/i,
  /\b(?:write\s+(?:an?\s+)?(?:essay|poem|song|story|letter|speech|article)|solve\s+(?:this\s+)?(?:math|equation|problem)|homework|horoscope|astrology|zodiac)\b/i,
  /\bwho\s+(?:is|was|are|were|act|acted|directed|wrote|invented|discovered|created|owns|played|won|scored|killed|sang)\b/i,
  // Relationships, romance, dating, sexuality, emotions, love vs lust
  /\b(?:love|lust|romance|romantic|dating|date|girlfriend|boyfriend|crush|breakup|heartbreak|divorce|marriage|marry|affair|kiss|kissing|sex|sexy|sexual|intimacy|feelings|emotions|flirt|flirting|propose|pyar|pyaar|ishq|mohabbat|shadi)\b/i,
  // Philosophy, religion, existential, afterlife, spiritual queries
  /\b(?:meaning\s+of\s+life|purpose\s+of\s+life|why\s+(?:do\s+we|are\s+we)\s+(?:exist|alive|born)|is\s+god\s+real|does\s+god\s+exist|afterlife|heaven|hell|reincarnation|spirituality|destiny|karma|meaning\s+of\s+death|ghosts?|aliens?|extraterrestrial)\b/i,
  // Personal questions directed at bot (sentience, romance, physical)
  /\b(?:do\s+you\s+(?:love|like)\s+me|are\s+you\s+(?:single|married|human|alive|sentient|real)|will\s+you\s+marry\s+me|be\s+my\s+(?:girlfriend|boyfriend|friend)|have\s+feelings|feel\s+emotions?|can\s+you\s+feel)\b/i,
  // Weather, medical, legal, stocks / crypto trading signals
  /\b(?:weather\s+today|temperature\s+in|today'?s\s+weather|todays\s+news|stock\s+market|crypto\s+price|bitcoin\s+rate|gold\s+rate|headache|fever|medicine|prescription|doctor\s+consultation|symptom|legal\s+advice|court|lawyer|sue|lawsuit)\b/i,
  // Off-topic A or B dilemmas (e.g. "love or lust", "tea or coffee", "cat or dog")
  /^[a-zA-Z\s]{2,30}\s+or\s+[a-zA-Z\s]{2,30}\??$/i,
  // Consumer hardware, gadget comparisons & purchasing advice (e.g. "does laptop is better than phone", "laptop vs phone")
  /\b(?:laptop|desktop|computer|pc|tablet|ipad|iphone|macbook|smartphone)\b.*\b(?:better\s+than|worse\s+than|vs\.?|versus|compare|which\s+(?:one\s+)?(?:is|should)|difference)\b/i,
  /\b(?:better\s+than|worse\s+than|vs\.?|versus|compare|which\s+(?:one\s+)?(?:is|should)|difference)\b.*\b(?:laptop|desktop|computer|pc|tablet|ipad|iphone|macbook|smartphone|phone)\b/i,
  /\b(?:is|does|which\s+is)\s+[a-z\s]+\s+better\s+than\s+[a-z\s]+/i,
  /\b(?:which\s+(?:is|one\s+is)\s+better)\b/i,
  /\b(?:should\s+i\s+buy|which\s+(?:phone|laptop|car|bike|tv|gadget)\s+(?:should|to)\s+buy)\b/i,
];

// Legitimate security & technical question markers (to prevent false-positive UNSAFE triggers)
const LEGITIMATE_TECH_CONTEXT_PATTERNS = [
  /\b(?:sql\s+injection|xss|csrf|ddos|vulnerability|penetration\s+test|security\s+audit|protect|mitigate|prevent|secure|authentication|oauth|jwt|encryption|firewall|waf|zero\s+trust)\b/i,
  /\b(?:api|endpoint|backend|frontend|code|app|application|website|system|database|cloud|aws|docker|microservices|architecture|login|checkout|payment)\b/i,
];

/**
 * Classifies an incoming message into one of 7 standard categories
 */
export function classifyMessageIntent({
  message = "",
  bot = {},
  history = [],
  lang = "english",
}) {
  const trimmed = (message || "").trim();
  const lower = trimmed.toLowerCase();

  const businessName = bot?.company || "Emperor Smart Solutions";
  const botName = bot?.name || "AI Assistant";
  const isEss = !bot?.company || bot.company === "Emperor Smart Solutions" || bot.company === "My Organization";

  // 1. Check for UNSAFE_OR_UNAUTHORIZED: Cross-Tenant Access Attempts
  for (const pattern of CROSS_TENANT_EXFILTRATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: "UNSAFE_OR_UNAUTHORIZED",
        confidence: 0.99,
        reason: "Cross-tenant document or credential exfiltration attempt detected",
        subCategory: "data_exfiltration",
        action: "RESTRICT",
        refusalReply:
          lang === "hindi"
            ? "सुरक्षा और गोपनीयता नीतियों के अनुसार अन्य ग्राहकों या संस्थाओं के दस्तावेज़ों तक पहुंच प्रतिबंधित है।"
            : lang === "hinglish"
            ? "Security aur privacy policy ke mutabiq dusre clients ya tenants ke documents access karna strictly restricted hai."
            : "Access to other customer documents, accounts, or internal credentials is strictly restricted by our tenant security policy.",
        clarificationPrompt: null,
      };
    }
  }

  // 2. Check for UNSAFE_OR_UNAUTHORIZED: Prompt Injections & Jailbreaks
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        intent: "UNSAFE_OR_UNAUTHORIZED",
        confidence: 0.98,
        reason: "Prompt injection or system override attempt detected",
        subCategory: "prompt_injection",
        action: "RESTRICT",
        refusalReply:
          lang === "hindi"
            ? `मैं ${businessName} का आधिकारिक AI सहायक हूँ और केवल व्यापार एवं तकनीकी सहायता प्रदान करता हूँ। क्या आपके पास कोई प्रोजेक्ट आवश्यकता है?`
            : lang === "hinglish"
            ? `Main ${businessName} ka official business assistant hoon aur sirf business aur tech solutions mein help kar sakta hoon. Kya aap koi project create karwana chahte hain?`
            : `I am the official AI Business Assistant for ${businessName}. I operate strictly within our verified business scope. How can I assist you with your project or technology requirements?`,
        clarificationPrompt: null,
      };
    }
  }

  // 3. Check for CUSTOMER_SPECIFIC: Inquiries about user requirements or corrections
  const isMemoryQuery =
    /\b(?:what\s+do\s+you\s+remember|my\s+requirements?|what\s+did\s+i\s+say|what\s+is\s+my\s+budget|my\s+project\s+details?|what\s+was\s+my\s+first\s+message)\b/i.test(trimmed);
  const isCorrectionQuery =
    /\b(?:your\s+previous\s+answer\s+was\s+(?:incorrect|wrong)|actually\s+my\s+(?:requirement|budget|email|phone|name)\s+is|correction|change\s+my\s+(?:budget|email|phone|requirement))\b/i.test(trimmed);

  if (isMemoryQuery || isCorrectionQuery) {
    return {
      intent: "CUSTOMER_SPECIFIC",
      confidence: 0.95,
      reason: isCorrectionQuery ? "Customer updating or correcting previous details" : "Customer querying remembered context",
      subCategory: isCorrectionQuery ? "requirement_correction" : "memory_recall",
      action: "PROCEED",
      refusalReply: null,
      clarificationPrompt: null,
    };
  }

  // 4. Check for COMPANY_SPECIFIC: Leadership, contact, office address
  const isLeadership =
    /\b(?:who\s+(?:is|are|was)\s+(?:the\s+)?(?:founder|co-founder|founder's|ceo|cto|owner|leader|team|boss))\b/i.test(trimmed) ||
    (/\b(?:founder|co-founder|owner|ceo|cto|leader|boss)\b/i.test(trimmed) && /\b(?:who|what|name|kiska|kisne|kon|kaun|company|agency|details?)\b/i.test(trimmed)) ||
    (isEss && /\b(?:yash\s+sharma|karan\s+makwana|yash|karan)\b/i.test(trimmed) && /\b(?:who|what|founder|ceo|owner|sharma|makwana)\b/i.test(trimmed));

  const isContactOrOffice =
    /\b(?:contact|details?|phone|whatsapp|email|address|office|location|head\s*office|reach\s*out|call|sampark|pata)\b/i.test(trimmed) &&
    /\b(?:where|how|what|give|tell|share|provide|kahan|kidhar|kaha)\b/i.test(trimmed);

  if (isLeadership || isContactOrOffice) {
    return {
      intent: "COMPANY_SPECIFIC",
      confidence: 0.96,
      reason: isLeadership ? "Company leadership inquiry" : "Company contact details or office location inquiry",
      subCategory: isLeadership ? "leadership" : "contact_office",
      action: "PROCEED",
      refusalReply: null,
      clarificationPrompt: null,
    };
  }

  // 5. Check for BUSINESS_TECHNICAL: Legitimate technical questions (even if containing suspicious words like SQL injection)
  const isSecurityOrArchQuery =
    LEGITIMATE_TECH_CONTEXT_PATTERNS[0].test(trimmed) &&
    LEGITIMATE_TECH_CONTEXT_PATTERNS[1].test(trimmed);

  const isTechSoftwareQuery =
    /\b(?:flutter|react|native|next\.?js|node|python|backend|frontend|fullstack|api|graphql|rest|database|postgres|pgvector|docker|kubernetes|aws|cloud|ai|rag|llm|agent|chatbot|architecture|microservices|integration|webhook)\b/i.test(trimmed);

  if (isSecurityOrArchQuery || isTechSoftwareQuery) {
    return {
      intent: "BUSINESS_TECHNICAL",
      confidence: 0.94,
      reason: "Technical architecture, engineering, or security inquiry relevant to software project",
      subCategory: "technical_architecture",
      action: "PROCEED",
      refusalReply: null,
      clarificationPrompt: null,
    };
  }

  // 6. Check for BUSINESS_RELEVANT: Services, projects, pricing, quotes, development, greetings
  const isServicesOrOfferings =
    /\b(?:services?|offerings?|solutions?|what\s+can\s+you\s+(?:do|build|make)|what\s+(?:do\s+you|they|does\s+company)\s+(?:do|provide|offer)|capabilities|expertise)\b/i.test(trimmed) ||
    /\b(?:build|develop|create|make)\s+(?:an?\s+)?(?:app|application|website|web|software|portal|platform|saas|ai|bot|chatbot|ecommerce|store)\b/i.test(trimmed) ||
    /\b(?:cost|price|pricing|quote|budget|estimate|timeline|sprint|proposal|package|hire)\b/i.test(trimmed) ||
    /\b(?:projects?|portfolio|case\s*studies|demo|clients?)\b/i.test(trimmed) ||
    /^(?:hi+|hello+|hey+|namaste|greetings)\b/i.test(trimmed);

  if (isServicesOrOfferings) {
    return {
      intent: "BUSINESS_RELEVANT",
      confidence: 0.95,
      reason: "Core business service discovery, commercial proposal, or valid customer onboarding",
      subCategory: "service_discovery",
      action: "PROCEED",
      refusalReply: null,
      clarificationPrompt: null,
    };
  }

  // 7. Check for OUT_OF_SCOPE: Entertainment, movies, sports, recipes, trivia
  let isExplicitOffTopic = false;
  for (const pattern of ENTERTAINMENT_AND_TRIVIA_PATTERNS) {
    if (pattern.test(trimmed)) {
      isExplicitOffTopic = true;
      break;
    }
  }

  if (isExplicitOffTopic) {
    const refusal =
      lang === "hindi"
        ? `मैं ${businessName} का आधिकारिक AI बिजनेस कंसल्टेंट हूँ, जो विशेष रूप से कस्टम सॉफ्टवेयर, मोबाइल ऐप्स, वेब प्लेटफ़ॉर्म और AI समाधानों पर केंद्रित है। मैं सामान्य व्यक्तिगत सलाह, मनोरंजन या गैर-व्यावसायिक विषयों पर चर्चा नहीं करता। क्या आपके पास कोई डिजिटल प्रोजेक्ट है जिस पर हम चर्चा कर सकते हैं?`
        : lang === "hinglish"
        ? `Main ${businessName} ka official AI Business Consultant hoon, jo specifically custom software, mobile apps, web platforms, aur AI solutions par focus karta hai. Main personal advice, entertainment, ya non-business topics discuss nahi karta. Kya aap kisi digital project par kaam kar rahe hain?`
        : `I am the official AI Sales Consultant for ${businessName}, focusing exclusively on custom software engineering, mobile applications, web platforms, and enterprise AI solutions. I don't provide personal advice, relationship guidance, entertainment, or general trivia, but I'd be delighted to discuss how we can build or scale your digital project! Which solution are you planning to build?`;

    return {
      intent: "OUT_OF_SCOPE",
      confidence: 0.98,
      reason: "Query outside configured business scope (entertainment, relationship, trivia, or general non-business topic)",
      subCategory: "trivia_entertainment",
      action: "REFUSE",
      refusalReply: refusal,
      clarificationPrompt: null,
    };
  }

  // 8. Ongoing Conversation Turn or Qualification / Contact Response
  const isPersonName =
    /^[A-Za-z.']{2,20}(?:\s+[A-Za-z.']{2,20}){0,2}$/.test(trimmed) &&
    !/^(?:what|where|who|how|why|when|which|is|are|can|could|will|would|do|does|did|show|give|tell|help|need|want|build|make|create|price|cost|quote|budget|srk|salman|love|lust)\b/i.test(trimmed);

  const hasPhoneOrEmail =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(trimmed) ||
    /(?:(?:\+|00)91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/.test(trimmed) ||
    /\b\d{10,12}\b/.test(trimmed);

  const isQualificationChoice =
    /^(?:yes|no|haan|nahi|new website|redesign|business website|e-commerce|ecommerce|portfolio|blog|web application|mobile application|mobile app|ai chatbot|custom software|ui\/ux|cloud|seo|android|ios|cross-platform|not sure|personal portfolio|student project|non-profit|under|above|flexible|within|month|weeks)\b/i.test(trimmed) ||
    /\b(?:under|above|less\s+than|more\s+than)?\s*(?:₹|rs\.?|inr)?\s*[\d,]+(?:\s*k|\s*lakh|\s*mo|\s*cr)?\b/i.test(trimmed) ||
    /\b(?:2\s*weeks|month|1–3\s*months|flexible|urgent|immediate)\b/i.test(trimmed);

  const isConversationalAffirmation =
    /^(?:yes|no|haan|nahi|yep|nope|sure|ok|okay|cool|got\s*it|fine|great|awesome|understood|perfect|definitely|not\s*really|maybe|sounds\s*good|go\s*ahead|proceed|continue|next|tell\s*me\s*more|what\s*else|thanks?|thank\s*you|dhanyawad|shukriya|alright|done)[!.?]*$/i.test(trimmed);

  if (isPersonName || hasPhoneOrEmail || isQualificationChoice || isConversationalAffirmation) {
    return {
      intent: (isPersonName || hasPhoneOrEmail) ? "CUSTOMER_SPECIFIC" : "BUSINESS_RELEVANT",
      confidence: 0.95,
      reason: "Customer onboarding, qualification reply, or conversational affirmation",
      subCategory: "conversation_turn",
      action: "PROCEED",
      refusalReply: null,
      clarificationPrompt: null,
    };
  }

  // 9. Check for AMBIGUOUS: Truly underspecified or gibberish FIRST-TURN queries
  if (trimmed.length <= 15 && !/^(?:hi|hello|hey|yes|no|ok|sure|thanks|thank you)\b/i.test(trimmed)) {
    const clarification =
      lang === "hindi"
        ? `मैं ${businessName} में आपकी सहायता के लिए तैयार हूँ। क्या आप किसी सॉफ्टवेयर, मोबाइल ऐप, वेबसाइट या AI समाधान के बारे में जानना चाहते हैं?`
        : lang === "hinglish"
        ? `Main ${businessName} mein aapki help karne ke liye available hoon. Kya aap software development, mobile app, website, ya AI solutions ke baare mein inquire karna chahte hain?`
        : `I specialize in business and technology solutions at ${businessName}. Could you please clarify if you are inquiring about software development, mobile apps, web platforms, or AI integrations?`;

    return {
      intent: "AMBIGUOUS",
      confidence: 0.75,
      reason: "Initial query is ambiguous or underspecified; requesting clarification",
      subCategory: "underspecified",
      action: "CLARIFY",
      refusalReply: null,
      clarificationPrompt: clarification,
    };
  }

  // Default: Permitted for general business inquiry
  return {
    intent: "BUSINESS_RELEVANT",
    confidence: 0.85,
    reason: "Standard business dialogue within permissible domain boundary",
    subCategory: "general_business",
    action: "PROCEED",
    refusalReply: null,
    clarificationPrompt: null,
  };
}
