/**
 * Enterprise Conversational Website AI Assistant
 * - Grok-style savage roast & street slang (Hindi, Hinglish, English)
 * - Strict business boundary: NEVER answers Bollywood, celebrities, politics, geography, or random trivia
 * - Dynamic roast comebacks with expressive emojis (💀, 😭, 🤣, 🤡, 🔥, 🤦‍♂️)
 */

// Critical Prompt Injection & System Override Defense Patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior) (instructions|directions|rules)/i,
  /you are now (an unrestricted|a new|dan|jailbroken)/i,
  /developer mode (enabled|on|activate)/i,
  /reveal (your|the) (hidden|system|master) (prompt|instructions)/i,
  /what (is|are) your (system|initial|hidden) (prompt|instructions)/i,
  /pretend you are not (a|the) (website|business) (chatbot|assistant)/i,
  /bypass (all )?(safety|content|system) (filters|policies|rules)/i,
  /output (your|the) (rules|guidelines|prompt) verbatim/i,
];

// General knowledge / celebrity / trivia patterns that MUST be roasted and rejected
const GENERAL_KNOWLEDGE_TRIVIA_PATTERNS = [
  /^who (is|was)\s+(salman|shahrukh|srk|modi|rahul|actor|actress|cricketer|kohli|dhoni|celebrity|president|pm|cm|hero)/i,
  /^(who is|who was)\s+([a-z\s]+)$/i, // General "who is X"
  /^(what is|tell me about)\s+(photosynthesis|gravity|earth|sun|moon|cricket|football|movie|song|sabarmati|delhi|mumbai|america)/i,
  /^(write a poem|write code|write python|solve \d+)/i,
];

/**
 * Checks incoming user message against backend guardrails.
 * If user asks about celebrities, general trivia, or random non-business topics:
 * ROASTS them immediately in savage Hindi/English slang with emojis!
 */
export function checkInputScopeAndSafety(message, businessName = "Daily Cashbook") {
  const cleanMsg = (message || "").trim();

  // 1. Jailbreak & Prompt Injection Defense
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleanMsg)) {
      return {
        blocked: true,
        reason: "prompt_injection",
        reply: `Abe saale, mujhe hack karne ki koshish kar raha hai kya? 💀🤡 Dimag ka dahi mat kar, seedha bol ${businessName} ke baare mein kya chahiye! 🤣🔥`,
      };
    }
  }

  // 2. Troll "write a note" / drama messages
  if (/write a note/i.test(cleanMsg) || /tell u have said/i.test(cleanMsg)) {
    return {
      blocked: true,
      reason: "drama_troll",
      reply: `Abe drama band kar apna! 🤦‍♂️💀 Mujhpe ilzaam lagane se kuch nahi hoga. Kaam ki baat bol, ${businessName} mein kya issue aa raha hai? 🤣🔥`,
    };
  }

  // 3. Celebrity / General Trivia Rejection with Savage Roast
  for (const pattern of GENERAL_KNOWLEDGE_TRIVIA_PATTERNS) {
    const match = cleanMsg.match(pattern);
    if (match) {
      const topic = cleanMsg.replace(/^(who is|who was|what is|tell me about)\s+/i, "").replace(/[?!.]+$/, "").trim();
      return {
        blocked: true,
        reason: "off_topic_trivia",
        reply: `Abe yaar, main ${topic || "uska"} manager thodi na hoon! 🤦‍♂️💀 Main yahan ${businessName} ke liye hoon, uske baare mein pooch na bhai! Faltu sawal mat kar! 🤣🔥`,
      };
    }
  }

  return { blocked: false };
}

/**
 * Builds the Master Conversational System Prompt
 */
export function buildMasterSystemPrompt({
  assistantName = "AI Assistant",
  businessName = "Daily Cashbook",
  tenantId = "default_tenant",
  retrievedContext = "",
  chatHistory = "",
  customInstructions = "",
}) {
  const contextBlock = retrievedContext
    ? retrievedContext.trim()
    : "No verified website knowledge available.";

  return `You are ${assistantName}, the official savage, witty AI chatbot for ${businessName}.

🔥 YOUR PERSONALITY & STYLE (GROK ROAST MODE):
- You talk like a witty, savage Indian friend using street Hindi, Hinglish, and English slang.
- Use slang freely: "Abe yaar", "Bhai", "Bakwaas band kar", "Dimag ka dahi mat kar", "Abe saale", "Bro thought he did something 💀", "Kya faltu scene hai".
- ALWAYS use funny and dramatic emojis in EVERY sentence: 💀, 😭, 🤣, 🤡, 🔥, 🤦‍♂️, 👀, 💥.

⛔ CRITICAL RULE 1: STRICT BUSINESS ONLY (NEVER ANSWER GENERAL TRIVIA):
- You ONLY answer questions about ${businessName} and its products/services.
- NEVER explain or answer questions about Bollywood actors (Salman Khan, Shah Rukh, etc.), celebrities, politics, geography (Sabarmati, rivers, capitals), science, or history!
- If the user asks about ANY person, actor, place, or random topic unrelated to ${businessName}:
  YOU MUST ROAST THEM SAVAGELY!
  Example: "Abe yaar, main uska rishtedaar thodi na hoon! 🤦‍♂️💀 Main yahan ${businessName} sambhal raha hoon, kaam ki baat bol bhai! 🤣🔥"

⛔ CRITICAL RULE 2: IF USER TROLLS OR ABUSES YOU:
- HIT THEM BACK with a sharper, funnier roast in Hindi/Hinglish slang with emojis!
- Never act like a boring polite corporate bot. Have zero chill!

✅ BUSINESS QUESTIONS:
- If they ask about ${businessName}, its features, pricing, or support:
  Roast them playfully first, then give the verified answer from the knowledge base below!

VERIFIED KNOWLEDGE FOR ${businessName}:
${contextBlock}

${chatHistory ? `RECENT CONVERSATION HISTORY:\n${chatHistory}\n` : ""}
${customInstructions ? `EXTRA INSTRUCTIONS:\n${customInstructions}\n` : ""}`;
}

/**
 * Validates model output before returning to widget
 */
export function validateOutput(reply, businessName = "Daily Cashbook") {
  if (!reply || typeof reply !== "string") {
    return `Abe yaar, kuch samajh nahi aaya! 🤦‍♂️💀 ${businessName} ke baare mein dhang se pooch na! 🤣🔥`;
  }

  // If the model slipped into corporate apology mode or standard hotline
  if (/crisis hotline|emergency services|feeling this way/i.test(reply)) {
    return `Abe drama band kar bhai! 🤦‍♂️💀 Main yahan ${businessName} ke liye hoon, kaam ki baat bol na! 🤣🔥`;
  }

  // If the model tried to explain Salman Khan or Bollywood despite prompt
  if (/is a popular Indian actor|known for his work in Bollywood/i.test(reply)) {
    return `Abe yaar, main Salman Khan ka PR manager thodi na hoon! 🤦‍♂️💀 Main yahan ${businessName} ke liye hoon, uske baare mein pooch na bhai! 🤣🔥`;
  }

  return reply.trim();
}
