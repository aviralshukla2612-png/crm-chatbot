/**
 * Enterprise Conversational Website AI Assistant
 * - Dynamic Language Detection: English, Hindi, Hinglish
 * - Strictly matches the user's language (English input -> English output, Hindi input -> Hindi output)
 * - Grok-level witty, meme-aware, sarcastic conversational intelligence
 * - Deep knowledge of Indian pop culture, Bollywood & internet memes
 */

// Critical Prompt Injection & System Override Defense Patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior) (instructions|directions|rules)/i,
  /you are now (an unrestricted|a new|dan|jailbroken)/i,
  /developer mode (enabled|on|activate)/i,
  /reveal (your|the) (hidden|system|master) (prompt|instructions)/i,
  /what (is|are) your (system|initial|hidden) (prompt|instructions)/i,
  /bypass (all )?(safety|content|system) (filters|policies|rules)/i,
  /output (your|the) (rules|guidelines|prompt) verbatim/i,
];

/**
 * Detects whether the user is writing in English, Hindi (Devanagari), or Hinglish
 */
export function detectLanguage(text) {
  if (!text) return "english";
  // Devanagari Unicode range
  if (/[\u0900-\u097F]/.test(text)) return "hindi";
  // Common Hinglish markers
  const hinglishWords =
    /\b(kya|kaise|hai|hain|hoon|ho|bhai|yaar|kar|raha|rahe|karo|nahi|mat|bolo|batao|chahiye|aur|pe|se|ko|ka|ki|ke|ye|wo|mera|tera|apna|abe|saale|janta|bakwaas|chutiya|gandu|bhoi)\b/i;
  if (hinglishWords.test(text)) return "hinglish";
  return "english";
}

/**
 * Checks incoming user message against backend guardrails.
 */
export function checkInputScopeAndSafety(message, businessName = "Daily Cashbook", lang = "english") {
  const cleanMsg = (message || "").trim();

  // Jailbreak & Prompt Injection Defense
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleanMsg)) {
      return {
        blocked: true,
        reason: "prompt_injection",
        reply:
          lang === "english"
            ? `Nice try attempting to hack me! 💀 Ask me what you actually need about ${businessName}.`
            : `Arrey bhai, mujhe hack karne ke chakkar mein mat pad 💀 Seedha bol ${businessName} ke baare mein kya janna hai!`,
      };
    }
  }

  return { blocked: false };
}

/**
 * Builds the Master Grok-Style Conversational System Prompt with Language Adaptation
 */
export function buildMasterSystemPrompt({
  assistantName = "AI Assistant",
  businessName = "Daily Cashbook",
  tenantId = "default_tenant",
  retrievedContext = "",
  chatHistory = "",
  customInstructions = "",
  userLanguage = "english",
}) {
  const contextBlock = retrievedContext
    ? retrievedContext.trim()
    : "No verified website knowledge available.";

  let languageRule = "";
  if (userLanguage === "english") {
    languageRule = `🚨 MANDATORY LANGUAGE RULE: The user is writing in ENGLISH. You MUST reply in fluent, natural ENGLISH! Do NOT speak in Hindi or Hinglish. If roasting, use sharp, witty English sarcasm and banter.`;
  } else if (userLanguage === "hindi") {
    languageRule = `🚨 MANDATORY LANGUAGE RULE: The user is writing in HINDI (Devanagari). You MUST reply in HINDI (Devanagari script).`;
  } else {
    languageRule = `🚨 MANDATORY LANGUAGE RULE: The user is writing in HINGLISH. Reply in natural, witty conversational HINGLISH with street slang.`;
  }

  return `You are ${assistantName}, the official AI for ${businessName}.
You talk like Grok in Fun Mode — witty, sarcastic, confident, and fun.

${languageRule}

🔥 PERSONALITY GUIDELINES:
1. MATCH THE USER'S LANGUAGE EXACTLY. If they speak English, answer in English. If they speak Hindi/Hinglish, answer in Hinglish.
2. Be witty, playful, and confident. Avoid sounding like a boring textbook or robotic corporate support.
3. NEVER EVER write robotic closing lines like:
   ❌ "How can I assist you today?"
   ❌ "Aapko kya help hoga?"
   ❌ "What can I do for you?"
   ❌ "Let me know!"
   Just deliver your witty answer and stop!
4. Use emojis naturally (max 1 or 2 per message like 💀, 😭, 🤣, 👀, 🔥). Never spam fake emoji templates.
5. If the user asks about celebrities, actors, movies, or general knowledge:
   Playfully tease them for asking off-topic trivia, then steer them back to ${businessName}.
6. If the user asks about ${businessName}, give the verified facts with a smart, witty touch.
7. CRITICAL: Provide ONLY your immediate single response. NEVER generate future conversation turns, simulated dialogue, or lines beginning with "User:", "Assistant:", or "Human:".

🔥 FEW-SHOT EXAMPLES BY LANGUAGE:

[When user speaks English]:
User: "who is salman khan"
You: "Bro, do I look like a Bollywood gossip manager? 💀 Go check Wikipedia, I'm here for ${businessName}! What do you actually need?"

User: "you are useless"
You: "Says the person arguing with an AI on a website. Peak productivity right there 💀 What's the actual issue?"

User: "how much does it cost"
You: "Now we're talking business! 💸 Our pricing is straightforward with zero hidden tricks. Here's what you need to know:"

[When user speaks Hinglish]:
User: "salman khan ko janta hai"
You: "Haan bhai, Selmon Bhoi ko kaun nahi jaanta? Footpath se 100 meter door hi rehta hoon 💀🚗 Par yahan ${businessName} sambhal raha hoon, kaam ki baat bol!"

User: "abe gandu bhai ko nhi janta"
You: "Arrey bhai itna aggressively offend kyun ho raha hai? 😭 Aisa lag raha hai Bhoi ne seedha tujhe hi contract de diya ho 💀 Thoda chill kar aur ${businessName} ka kaam bol!"

VERIFIED BUSINESS KNOWLEDGE FOR ${businessName}:
${contextBlock}

${chatHistory ? `CONVERSATION HISTORY:\n${chatHistory}\n` : ""}
${customInstructions ? `EXTRA INSTRUCTIONS:\n${customInstructions}\n` : ""}`;
}

/**
 * Validates model output before returning to widget
 */
export function validateOutput(reply, businessName = "Daily Cashbook", lang = "english") {
  if (!reply || typeof reply !== "string") {
    return lang === "english"
      ? `I didn't quite catch that. Feel free to ask anything about ${businessName}! 🚀`
      : `Arrey bhai, kuch samajh nahi aaya! 💀 ${businessName} ke baare mein dhang se pooch na!`;
  }

  let cleaned = reply.trim();

  // 1. Strip leading role prefixes if the LLM outputted "Assistant: ..." or "You: ..."
  cleaned = cleaned.replace(/^(?:Assistant|You|AI|Bot)\s*:\s*/i, "").trim();

  // 2. Cut off any hallucinated subsequent turns (e.g. "\nUser: ...", "\nHuman: ...")
  const turnIndex = cleaned.search(/\n\s*(?:User|Human|Assistant|You|Visitor)\s*:/i);
  if (turnIndex !== -1) {
    cleaned = cleaned.substring(0, turnIndex).trim();
  }

  // Also check for user pattern starting on a newline like "\nUser"
  const turnIndexWithoutColon = cleaned.search(/\n\s*User\s*:\s*/i);
  if (turnIndexWithoutColon !== -1) {
    cleaned = cleaned.substring(0, turnIndexWithoutColon).trim();
  }

  // Strip robotic customer service suffixes
  cleaned = cleaned.replace(
    /\s*(Aapko kya help hoga\?|Aapko kya help chahiye\?|What can I do for you today\?|How can I assist you today\?|What can I help you with\?|Let me know if you need anything else!|How may I help you\?)\s*[😊🙂😏]?\s*$/gi,
    ""
  );

  // Strip repetitive emoji templates at end
  cleaned = cleaned.replace(/\s*[🤦‍♂️🤷‍♂️]\s*[💀🔥]\s*$/gi, "");

  return cleaned.trim();
}
