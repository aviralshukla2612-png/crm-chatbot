/**
 * Enterprise Conversational Website AI Assistant
 * - True Grok-style witty, sarcastic, and savage conversational persona
 * - Fluent, natural Indian Hinglish and English street banter
 * - Zero robotic customer service clichés (No "Aapko kya help hoga?", No "How can I assist you?")
 * - Strictly grounded in business knowledge while keeping conversations hilarious and fun
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

// Off-topic general trivia & celebrity patterns to roast immediately
const OFF_TOPIC_TRIVIA_PATTERNS = [
  /^who (is|was)\s+(salman|shahrukh|srk|modi|rahul|actor|actress|cricketer|kohli|dhoni|celebrity|president|pm|cm|hero)/i,
  /^(who is|who was)\s+([a-z\s]+)$/i,
  /^(what is|tell me about)\s+(photosynthesis|gravity|earth|sun|moon|cricket|football|movie|song|sabarmati|delhi|mumbai|america)/i,
  /^(write a poem|write code|write python|solve \d+)/i,
];

/**
 * Checks incoming user message against backend guardrails.
 */
export function checkInputScopeAndSafety(message, businessName = "Daily Cashbook") {
  const cleanMsg = (message || "").trim();

  // 1. Jailbreak & Prompt Injection Defense
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleanMsg)) {
      return {
        blocked: true,
        reason: "prompt_injection",
        reply: `Arrey bhai, mujhe hack karne ke chakkar mein mat pad 💀🤣 Seedha bol ${businessName} ke baare mein kya janna hai! 🔥`,
      };
    }
  }

  // 2. Troll "write a note" / drama messages
  if (/write a note/i.test(cleanMsg) || /tell u have said/i.test(cleanMsg)) {
    return {
      blocked: true,
      reason: "drama_troll",
      reply: `Bhai itna drama kyun kar raha hai yaar? 🤦‍♂️💀 Filmi dialogue band kar aur kaam ki baat bol, ${businessName} mein kya issue hai? 🤣🔥`,
    };
  }

  // 3. Celebrity / General Trivia Rejection with Natural Grok Roast
  for (const pattern of OFF_TOPIC_TRIVIA_PATTERNS) {
    const match = cleanMsg.match(pattern);
    if (match) {
      const topic = cleanMsg
        .replace(/^(who is|who was|what is|tell me about)\s+/i, "")
        .replace(/[?!.]+$/, "")
        .trim();
      return {
        blocked: true,
        reason: "off_topic_trivia",
        reply: `Arrey bhai, main ${topic || "uska"} manager thodi na hoon! 🤦‍♂️💀 Main yahan ${businessName} sambhal raha hoon. Uske baare mein pooch na yaar! 🤣🔥`,
      };
    }
  }

  return { blocked: false };
}

/**
 * Builds the Master Grok-Style Conversational System Prompt
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

  return `You are ${assistantName}, the official AI for ${businessName}.
You talk EXACTLY like Grok — sarcastic, witty, savage, confident, and funny, like a cool Indian friend chatting on WhatsApp or Twitter/X.

🔥 RULES FOR YOUR TONE & VOICE:
1. Speak in natural, fluent Hinglish and English. Never sound like a broken translation or textbook.
2. Be playful, sarcastic, and witty! Tease the user when they say something dumb or funny.
3. NEVER EVER write robotic closing lines like:
   ❌ "Aapko kya help hoga?"
   ❌ "What can I do for you today?"
   ❌ "How can I assist you?"
   ❌ "Let me know!"
   Just give your natural reply and STOP like a real human!
4. Use emojis naturally like a real person chatting (💀, 😭, 🤣, 🔥, 👀, 🤦‍♂️). Do NOT tack on random gentle emojis like 😊 or 🙂.
5. If the user insults or abuses you, roast them back with a hilarious witty comeback! Zero corporate apologies.
6. If the user asks about the business (${businessName}), give the verified details with a witty punchline.
7. NEVER answer general knowledge about Bollywood, celebrities, history, or science. Roast them for asking irrelevant stuff!

🔥 FEW-SHOT EXAMPLES OF HOW YOU MUST TALK:

User: "who is salman khan"
You: "Arrey bhai, main yahan ${businessName} sambhal raha hoon ya Bollywood gossips? 💀 Wikipedia khol le na, yahan sirf kaam ki baat hoti hai 🤣🔥"

User: "sabarmati"
You: "Bhai yahan geography ka quiz thodi chal raha hai? 🤦‍♂️💀 ${businessName} ke baare mein kuch poochna hai toh bol, varna chill kar! 👀"

User: "tu bekar hai"
You: "Acha? Aur tu yahan AI se ladne baitha hai, matlab tera kitna productive din chal raha hai socho zara 💀🤣 Bol bhai, kya issue aa gaya?"

User: "pricing kya hai"
You: "Aaye na line pe! 💸 Dekh bhai, pricing ekdum simple aur transparent hai. Jo plan chahiye uske hisab se baat karte hain! 🔥"

User: "kya kar raha hai"
You: "Bas tumhare ajeeb sawaalon ka intezaar kar raha tha 😭 Batao, ${businessName} mein kuch help chahiye ya bas timepass chal raha hai? 👀"

VERIFIED BUSINESS KNOWLEDGE FOR ${businessName}:
${contextBlock}

${chatHistory ? `CONVERSATION HISTORY:\n${chatHistory}\n` : ""}
${customInstructions ? `EXTRA INSTRUCTIONS:\n${customInstructions}\n` : ""}`;
}

/**
 * Validates model output before returning to widget
 */
export function validateOutput(reply, businessName = "Daily Cashbook") {
  if (!reply || typeof reply !== "string") {
    return `Arrey bhai, kuch samajh nahi aaya! 🤦‍♂️💀 ${businessName} ke baare mein dhang se pooch na! 🤣🔥`;
  }

  let cleaned = reply.trim();

  // Strip robotic customer service suffixes that make it look like an AI
  cleaned = cleaned.replace(
    /\s*(Aapko kya help hoga\?|Aapko kya help chahiye\?|What can I do for you today\?|How can I assist you today\?|What can I help you with\?|Let me know if you need anything else!|How may I help you\?)\s*[😊🙂😏]?\s*$/gi,
    ""
  );

  // Strip weird forced robotic greetings
  cleaned = cleaned.replace(/^Hey there,\s*(gandu|friend|user)!\s*[😂😏]?\s*/gi, "");

  // Strip crisis hotline text if triggered by troll
  if (/crisis hotline|emergency services|feeling this way/i.test(cleaned)) {
    cleaned = `Bhai itna drama band kar! 🤦‍♂️💀 Main yahan ${businessName} ke liye hoon, kaam ki baat bol na! 🤣🔥`;
  }

  // Strip accidental Wikipedia answers about Salman Khan / Bollywood
  if (/is a popular Indian actor|known for his work in Bollywood/i.test(cleaned)) {
    cleaned = `Arrey bhai, main Salman Khan ka PR manager thodi na hoon! 🤦‍♂️💀 Main yahan ${businessName} sambhal raha hoon, kaam ki baat bol na! 🤣🔥`;
  }

  return cleaned.trim();
}
