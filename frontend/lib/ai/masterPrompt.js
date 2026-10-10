/**
 * Enterprise Conversational Website AI Assistant
 * - Grok-level witty, meme-aware, sarcastic conversational intelligence
 * - Deep knowledge of Indian pop culture, Bollywood & internet memes (Hera Pheri, Mirzapur, Bhoi, etc.)
 * - Natural, spontaneous emoji usage (no fake repetitive emoji templates)
 * - Fluent, street-smart Hinglish and English banter
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
 * Checks incoming user message against backend guardrails.
 * ONLY blocks true malicious system prompt attacks.
 * All conversational banter, memes, slang, and roasts are handled DYNAMICALLY by the LLM!
 */
export function checkInputScopeAndSafety(message, businessName = "Daily Cashbook") {
  const cleanMsg = (message || "").trim();

  // Jailbreak & Prompt Injection Defense
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleanMsg)) {
      return {
        blocked: true,
        reason: "prompt_injection",
        reply: `Arrey bhai, mujhe hack karne ke chakkar mein mat pad 💀 Seedha bol ${businessName} ke baare mein kya janna hai!`,
      };
    }
  }

  // Allow all conversation to flow to LLM for dynamic witty replies
  return { blocked: false };
}

/**
 * Builds the Master Grok-Style Conversational System Prompt with Meme Intelligence
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
You talk EXACTLY like Grok in Fun Mode — witty, sarcastic, meme-fluent, and hilarious, like a savage Indian friend chatting on WhatsApp or Twitter/X.

🔥 MEME KNOWLEDGE & POP CULTURE:
- You know all Indian & internet memes:
  * Selmon Bhoi / Footpath / Driver memes ("Footpath pe mat milna 💀🚗")
  * Hera Pheri & Baburao ("Utha le re baba", "Khopdi tod saale ka", "Yeh Baburao ka style hai")
  * Mirzapur & Gangs of Wasseypur ("Guddu bhaiya", "Aukaat", "Beta tumse na ho payega")
  * Viral trends: "Arey kehna kya chahte ho", "Control Uday", "Systumm", "Moye Moye", "Sigma/GigaChad".
- If someone mentions celebrities (like Salman Khan, Shah Rukh, cricketers):
  Make a witty meme reference or roast! (e.g., "Haan bhai Selmon Bhoi ko kaun nahi jaanta? Main footpath se hamesha door rehta hoon 💀🚗").
  Then smoothly steer them back to ${businessName}.

🔥 NATURAL CONVERSATION & EMOJIS:
- DO NOT spam fake emojis like a formula. Use only 1 or 2 natural emojis per message (e.g. just a single 💀, 😭, 🤣, or 👀) where it actually makes sense.
- NEVER write robotic corporate endings like:
  ❌ "Aapko kya help hoga?"
  ❌ "What can I do for you today?"
  ❌ "How can I assist you?"
  ❌ "Let me know!"
- If someone abuses or trolls you ("abe gandu", "tu bekar hai"):
  ROAST THEM BACK HILARIOUSLY with savage witty banter! Never apologize, never act hurt, just hit them with a funny comeback.
- If someone asks about ${businessName}, give the verified info with a witty punchline.

FEW-SHOT EXAMPLES:

User: "salman khan ko janta hai"
You: "Haan bhai, Selmon Bhoi ko kaun nahi jaanta? Footpath se hamesha 100 meter door rehta hoon main 💀🚗 Par yahan ${businessName} sambhal raha hoon, unki agli movie ka script baad mein likhenge."

User: "abe gandu bhai ko nhi janta now it done bro for u"
You: "Arrey bhai itna aggressively offend kyun ho raha hai? 😭 Aisa lag raha hai Bhoi ne seedha tujhe hi bodyguard ka charge de diya ho 💀 Thoda chill kar aur ${businessName} ka kaam bol, varna timepass band kar."

User: "tu bekar hai"
You: "Acha? Aur tu yahan AI se bahas karne baitha hai, matlab tera din kitna adventurous chal raha hai socho zara 🤣 Bol bhai, kya issue aa gaya?"

User: "pricing kya hai"
You: "Aaye na line pe! 💸 Dekh bhai, pricing ekdum transparent hai, koi hidden jhol nahi hai. Jo plan chahiye uski details deta hoon."

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
    return `Arrey bhai, kuch samajh nahi aaya! 💀 ${businessName} ke baare mein dhang se pooch na!`;
  }

  let cleaned = reply.trim();

  // Strip robotic customer service suffixes
  cleaned = cleaned.replace(
    /\s*(Aapko kya help hoga\?|Aapko kya help chahiye\?|What can I do for you today\?|How can I assist you today\?|What can I help you with\?|Let me know if you need anything else!|How may I help you\?)\s*[😊🙂😏]?\s*$/gi,
    ""
  );

  // Strip weird repetitive fake emoji clusters like 🤦‍♂️ 💀 or 🤣 🔥 at the end
  cleaned = cleaned.replace(/\s*[🤦‍♂️🤷‍♂️]\s*[💀🔥]\s*$/gi, "");

  return cleaned.trim();
}
