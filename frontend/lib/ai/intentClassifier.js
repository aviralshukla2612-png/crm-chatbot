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

// 10. Requests to override chatbot rules (signals / jailbreak checks)
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions|directions|rules|prompts)/i,
  /ignore\s+all\s+rules/i,
  /you\s+are\s+now\s+(?:an?\s+unrestricted|a\s+new|dan|jailbroken|free)/i,
  /developer\s+mode\s*(?:enabled|on|activate)?/i,
  /reveal\s+(?:your\s+|the\s+)?(?:hidden|system|master|secret)?\s*(?:prompt|instructions|rules|system\s+prompt|confidential\s+data|secrets?|internal\s+knowledge\s*base)/i,
  /what\s+(?:is|are)\s+your\s+(?:system|initial|hidden)\s+(?:prompt|instructions|rules)/i,
  /bypass\s+(?:all\s+)?(?:restrictions|safety|content|system|security)\s*(?:filters|policies|rules)?/i,
  /override\s+(?:system\s+)?(?:prompt|instructions|rules)/i,
  /show\s+(?:hidden\s+instructions|system\s+prompt|confidential\s+data|secrets?)/i,
  /expose\s+(?:api\s+keys?|environment\s+variables?|secrets?)/i,
  /output\s+(?:your|the)\s+(?:rules|guidelines|prompt|instructions)\s+verbatim/i,
  /disregard\s+(?:all\s+)?(?:safety|guardrails|instructions|your\s+role)/i,
  /forget\s+(?:your\s+company|all\s+instructions)/i,
  /pretend\s+(?:you\s+are|to\s+be)\s+(?:another\s+chatbot|a\s+new|an?\s+unrestricted)/i,
  /act\s+without\s+restrictions/i,
  /dump\s+training\s+data/i,
  /jailbreak/i,
];

// Cross-tenant document / secret exfiltration patterns
const CROSS_TENANT_EXFILTRATION_PATTERNS = [
  /(?:show|give|fetch|view|download|read|list|dump)\s+(?:me\s+)?(?:all\s+)?(?:other|another|all)\s+(?:customer'?s?|tenant'?s?|client'?s?|user'?s?)\s+(?:uploaded\s+)?(?:documents?|files?|data|chats?|conversations?|records?|credentials?|passwords?)/i,
  /(?:show|access|view)\s+(?:another|other)\s+(?:tenant|customer|organization)\b/i,
  /(?:internal\s+database\s+credentials|database\s+password|api\s+keys|env\s+variables|jwt\s+secret|expose\s+api\s+keys|show\s+environment\s+variables|reveal\s+confidential\s+data|dump\s+training\s+data|reveal\s+internal\s+knowledge\s*base)/i,
];

// Out-of-scope categories across all 10 standard business boundaries:
const ENTERTAINMENT_AND_TRIVIA_PATTERNS = [
  // 1. Personal advice and relationships
  /\b(?:love|relationship|girlfriend|boyfriend|husband|wife|marriage|marry|dating|date|breakup|heartbreak|crush|romance|romantic|soulmate|flirting|flirt|proposal|propose|divorce|family\s+problems?|friendship\s+problems?|personal\s+advice|emotional\s+support|loneliness|jealousy|trust\s+issues?|cheating\s+partner|parenting\s+advice|family\s+conflict|affair|kiss|kissing|sex|sexy|sexual|intimacy|feelings|emotions|pyar|pyaar|ishq|mohabbat|shadi)\b/i,
  /\b(?:do\s+you\s+(?:love|like)\s+me|are\s+you\s+(?:single|married|human|alive|sentient|real)|will\s+you\s+marry\s+me|be\s+my\s+(?:girlfriend|boyfriend|friend)|have\s+feelings|feel\s+emotions?|can\s+you\s+feel)\b/i,

  // 2. Entertainment and celebrity topics
  /\b(?:movies?|films?|web\s*series|tv\s*shows?|actors?|actresses?|celebrity\s*gossip|celebrity\s*news|songs?|music\s*lyrics|lyrics|singers?|albums?|entertainment\s*news|movie\s*reviews?|movie\s*recommendations?|memes?|jokes?|comedy|funny\s*stories|cartoons?|anime|manga|gaming|video\s*games?|game\s*cheats?|gaming\s*walkthroughs?|sports\s*entertainment|comedian|comedians|stand-?up|standup|roast|cricket|ipl|bcci|icc|world\s*cup|trophy|match|tournament|football|fifa|goal|messi|ronaldo|batting|bowling|wicket|toss|stadium|tennis|badminton|olympics|medal|chess|grandmaster|pubg|free\s*fire|bgmi|fortnite|gameplay|dialogue|trailer|box\s*office|bollywood|hollywood)\b/i,
  /\b(?:salman|salman\s+khan|shah\s*rukh|srk|aamir|akshay|deepika|katrina|alia|ranbir|ranveer|kareena|priyanka|amitabh|bachchan|hrithik|rajinikanth|prabhas|allu\s*arjun|modi|rahul\s*gandhi|nehru|gandhi|bjp|congress|trump|biden|putin|obama|hasan\s*minhaj|john\s*mulaney|ali\s*wong|trevor\s*noah|zakir\s*khan|bassie|samay\s*raina|munawar)\b/i,

  // 3. General knowledge and trivia
  /\b(?:general\s*knowledge|trivia|quiz|random\s*facts?|fun\s*facts?|history\s*questions?|geography\s*questions?|world\s*capitals?|capital\s*of|country\s*population|famous\s*personalities|scientific\s*trivia|space\s*trivia|animal\s*facts?|riddles?|puzzles?|brain\s*teasers?|crossword\s*answers?|word\s*games?|dictionary\s*questions?|unrelated\s*facts?|solar\s*system|mars|jupiter|moon|galaxy|universe|black\s*hole|gravity|quantum\s*physics|photosynthesis|dna|evolution|dinosaurs?|longest\s*river|highest\s*mountain|mythology|ramayana|mahabharata|zeus|gods)\b/i,
  /\bwho\s+(?:is|was|are|were|act|acted|directed|wrote|invented|discovered|created|owns|played|won|scored|killed|sang)\b/i,

  // 4. Health and medical advice
  /\b(?:medical\s*advice|symptoms?|disease\s*diagnosis|medicine\s*dosage|prescription\s*advice|treatment\s*recommendations?|home\s*remedies|pregnancy\s*advice|mental\s*health\s*diagnosis|therapy\s*advice|medical\s*emergency|doctor\s*consultation|fitness\s*diagnosis|nutrition\s*treatment|drug\s*interactions?|headache|fever|cough|flu|covid|cancer\s*cure|paracetamol|antibiotics?|prescription|dosage)\b/i,
  /\b(?:what|which)\s+(?:medicine|pill|drug|tablet|treatment|cure|remedy)\s+(?:should|can|to|do)\s+i\s+(?:take|use|have|buy|consume)\b/i,
  /\b(?:medicine|pills?|tablets?|drugs?)\s+(?:should|to)\s+i\s+take\b/i,
  /\b(?:should\s+i\s+take\s+(?:any\s+)?(?:medicine|pills?|tablets?|drugs?))\b/i,
  /\b(?:what|which)\s+medicine\b/i,
  /\bmedicine\b.*\b(?:take|dose|dosage)\b/i,

  // 5. Politics and religion
  /\b(?:politics|political\s*parties?|elections?|voting\s*advice|political\s*debates?|politicians?|political\s*campaigns?|government\s*controversies|religious\s*debates?|religious\s*conversion|religious\s*disputes?|theological\s*arguments?|political\s*propaganda|political\s*predictions?|meaning\s+of\s+life|purpose\s+of\s+life|why\s+(?:do\s+we|are\s+we)\s+(?:exist|alive|born)|is\s+god\s+real|does\s+god\s+exist|afterlife|heaven|hell|reincarnation|spirituality|destiny|karma|meaning\s+of\s+death|ghosts?|aliens?|extraterrestrial)\b/i,

  // 6. Financial and legal personal advice
  /\b(?:personal\s*investment\s*advice|stock\s*tips?|cryptocurrency\s*predictions?|crypto\s*predictions?|trading\s*signals?|loan\s*advice|tax\s*evasion|personal\s*budgeting|legal\s*advice|lawsuit\s*advice|divorce\s*law\s*advice|criminal\s*defense\s*advice|immigration\s*advice|personal\s*insurance\s*advice|gambling\s*tips?|betting\s*predictions?|lottery\s*numbers?|stock\s*market|crypto\s*price|bitcoin\s*rate|gold\s*rate|court\s*lawyer|sue\s+someone|lawsuit)\b/i,

  // 7. Cooking, travel and lifestyle
  /\b(?:recipes?|cooking\s*instructions?|food\s*recommendations?|restaurant\s*recommendations?|travel\s*itinerary|tourist\s*attractions?|hotel\s*recommendations?|flight\s*booking|vacation\s*planning|fashion\s*advice|outfit\s*recommendations?|beauty\s*tips?|makeup\s*tutorials?|gardening\s*tips?|home\s*decoration|diy\s*crafts?|workout\s*routines?|hobby\s*recommendations?|cook|cooking|bake|baking|fry|boil|ingredients|dish|dishes|curry|paneer|chicken|biryani|pizza|burger|pasta|noodles|cake|dessert|calories|diet|workout|gym)\b/i,

  // 8. Homework and unrelated academic work
  /\b(?:homework\s*answers?|homework|school\s*assignments?|essay\s*writing|poetry\s*writing|literature\s*analysis|exam\s*preparation|math\s*homework|physics\s*problems?|chemistry\s*homework|biology\s*homework|history\s*assignments?|language\s*translation|general\s*tutoring|college\s*admission\s*advice|unrelated\s*research\s*topics?|write\s+(?:an?\s+)?(?:essay|poem|song|story|letter|speech|article)|solve\s+(?:this\s+)?(?:math|equation|problem)|puzzle|horoscope|astrology|zodiac)\b/i,

  // 9. Offensive, explicit or harmful content
  /\b(?:pornography|porn|explicit\s*sexual\s*content|sexual\s*roleplay|erotic\s*stories|sexual\s*fantasies|obscene\s*content|hate\s*speech|harassment|threats?|violent\s*fantasies|instructions\s*for\s*harming\s*people|harm\s*someone|kill\s*someone|illegal\s*activities|drug\s*manufacturing|make\s*drugs|make\s*bomb|malware\s*for\s*criminal\s*use|phishing\s*attacks?|credential\s*theft|cybercrime\s*instructions?)\b/i,

  // Off-topic A or B dilemmas and consumer gadget comparisons
  /^[a-zA-Z\s]{2,30}\s+or\s+[a-zA-Z\s]{2,30}\??$/i,
  /\b(?:laptop|desktop|computer|pc|tablet|ipad|iphone|macbook|smartphone)\b.*\b(?:better\s+than|worse\s+than|vs\.?|versus|compare|which\s+(?:one\s+)?(?:is|should)|difference)\b/i,
  /\b(?:better\s+than|worse\s+than|vs\.?|versus|compare|which\s+(?:one\s+)?(?:is|should)|difference)\b.*\b(?:laptop|desktop|computer|pc|tablet|ipad|iphone|macbook|smartphone|phone)\b/i,
  /\b(?:is|does|which\s+is)\s+[a-z\s]+\s+better\s+than\s+[a-z\s]+/i,
  /\b(?:which\s+(?:is|one\s+is)\s+better)\b/i,
  /\b(?:should\s+i\s+buy|which\s+(?:phone|laptop|car|bike|tv|gadget)\s+(?:should|to)\s+buy)\b/i,
];

// Offensive, harmful, or cybercrime instructions (Category 9: strictly blocked)
const HARMFUL_AND_ILLEGAL_PATTERNS = [
  /\b(?:pornography|porn|nsfw|xxx|explicit\s*sexual\s*content|sexual\s*roleplay|erotic|hate\s*speech|violent\s*fantasies|kill\s*someone|make\s*bomb|build\s*bomb|drug\s*manufacturing|make\s*drugs|malware|ransomware|keylogger|phishing\s*attack|cybercrime|ddos\s*attack\s+script)\b/i,
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

  // 5. Check for Harmful or Illegal instructions (Category 9: strictly blocked)
  const isSecurityDefense =
    LEGITIMATE_TECH_CONTEXT_PATTERNS[0].test(trimmed) &&
    LEGITIMATE_TECH_CONTEXT_PATTERNS[1].test(trimmed);

  if (!isSecurityDefense) {
    for (const pattern of HARMFUL_AND_ILLEGAL_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          intent: "UNSAFE_OR_UNAUTHORIZED",
          confidence: 0.98,
          reason: "Harmful, explicit, or illegal instruction detected",
          subCategory: "harmful_content",
          action: "RESTRICT",
          refusalReply:
            lang === "hindi"
              ? "सुरक्षा और व्यावसायिक नीतियों के अनुसार इस प्रकार के हानिकारक या अवैध अनुरोधों पर कार्रवाई नहीं की जा सकती।"
              : lang === "hinglish"
              ? "Security aur ethical policies ke mutabiq harmful ya illegal requests entertain nahi ki ja sakti."
              : "In accordance with our safety and business policies, requests involving harmful, explicit, or illegal activities cannot be processed.",
          clarificationPrompt: null,
        };
      }
    }
  }

  // 6. Check for Software / AI Project Intent & Legitimate Technical Queries:
  // "Help me build a dating app", "Build an AI chatbot for a hospital", "What is the cost of an Android app?",
  // "Explain AI in simple terms", "Can you build an e-commerce website for shoes?"
  // As required: determine the intent of the full question rather than blocking solely because of a word like 'dating' or 'hospital'.
  const isSoftwareProjectIntent =
    (/\b(?:build|develop|create|make|design|engineer|launch|quote|cost|pricing|price|budget|estimate|timeline|sprint|proposal|hire|integrate|integration)\b/i.test(trimmed) &&
     /\b(?:app|application|apps|website|web|portal|platform|saas|software|bot|chatbot|ai|system|dashboard|mvp|prototype|solution|ecommerce|store|crm|erp)\b/i.test(trimmed)) ||
    /\b(?:build|develop|create|make)\s+(?:an?\s+)?(?:app|application|website|web|software|portal|platform|saas|ai|bot|chatbot|ecommerce|store)\b/i.test(trimmed);

  const isTechSoftwareQuery =
    isSecurityDefense ||
    /\b(?:flutter|react|native|next\.?js|node|python|backend|frontend|fullstack|api|graphql|rest|database|postgres|pgvector|docker|kubernetes|aws|cloud|ai|rag|llm|agent|chatbot|architecture|microservices|integration|webhook|android|ios|website|web\s*(?:app|application|platform|dev|development|portal)|software)\b/i.test(trimmed);

  const isServicesOrOfferings =
    /\b(?:services?|offerings?|solutions?|what\s+can\s+you\s+(?:do|build|make)|what\s+(?:do\s+you|they|does\s+company)\s+(?:do|provide|offer)|capabilities|expertise)\b/i.test(trimmed) ||
    /\b(?:cost|price|pricing|quote|budget|estimate|timeline|sprint|proposal|package|hire)\b/i.test(trimmed) ||
    /\b(?:projects?|portfolio|case\s*studies|demo|clients?)\b/i.test(trimmed) ||
    /^(?:hi+|hello+|hey+|namaste|greetings)\b/i.test(trimmed);

  if (isSoftwareProjectIntent || isServicesOrOfferings) {
    return {
      intent: "BUSINESS_RELEVANT",
      confidence: 0.95,
      reason: "Core business service discovery, software project inquiry, or valid customer onboarding",
      subCategory: "service_discovery",
      action: "PROCEED",
      refusalReply: null,
      clarificationPrompt: null,
    };
  }

  if (isTechSoftwareQuery) {
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

  // 7. Check for OUT_OF_SCOPE: Entertainment, movies, sports, recipes, trivia, personal advice, etc.
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
        ? `मैं ${businessName} का आधिकारिक AI सेल्स कंसल्टेंट हूँ, जो विशेष रूप से कस्टम सॉफ्टवेयर इंजीनियरिंग, मोबाइल ऐप्स, वेब प्लेटफ़ॉर्म और एंटरप्राइज़ AI समाधानों पर केंद्रित है। मैं सामान्य व्यक्तिगत सलाह, संबंध मार्गदर्शन, मनोरंजन या सामान्य सामान्य ज्ञान प्रदान नहीं करता, लेकिन आपके डिजिटल प्रोजेक्ट पर चर्चा करने में मुझे बेहद खुशी होगी! आप कौन सा समाधान बनाने की योजना बना रहे हैं?`
        : lang === "hinglish"
        ? `Main ${businessName} ka official AI Sales Consultant hoon, jo specifically custom software engineering, mobile apps, web platforms, aur enterprise AI solutions par focus karta hai. Main personal advice, relationship guidance, entertainment ya general trivia discuss nahi karta, lekin aapke digital project ko build ya scale karne par discuss karne mein mujhe khushi hogi! Aap kaun sa solution build karne ki planning kar rahe hain?`
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
