/**
 * Server-Side Environment Variable Validator
 * Validates mandatory credentials, URLs, and provider choices at startup.
 * Sanitizes errors to strictly prevent credential leakage in logs.
 */

const ALLOWED_PROVIDERS = new Set(["groq", "ollama", "vllm", "mock"]);

const INSECURE_DEFAULT_PASSWORDS = new Set([
  "postgrespassword",
  "password",
  "admin",
  "123456",
  "root",
  "your_secure_password_here",
  "your_strong_postgres_password_here",
]);

export function validateEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];

  const isProduction = env.NODE_ENV === "production";

  // 1. Database URL Validation
  const dbUrl = env.DATABASE_URL;
  if (!dbUrl) {
    if (isProduction) {
      errors.push("DATABASE_URL is missing. Production deployment requires a valid PostgreSQL connection string.");
    } else {
      warnings.push("DATABASE_URL is missing. Using local fallback.");
    }
  } else {
    try {
      const parsed = new URL(dbUrl);
      if (!parsed.protocol.startsWith("postgres")) {
        errors.push("DATABASE_URL protocol must be 'postgresql:' or 'postgres:'.");
      }
      if (!parsed.hostname) {
        errors.push("DATABASE_URL must specify a database hostname.");
      }
      
      const pass = decodeURIComponent(parsed.password || "");
      if (pass) {
        const passLower = pass.toLowerCase();
        if (INSECURE_DEFAULT_PASSWORDS.has(passLower) || passLower.includes("placeholder") || passLower.includes("your_")) {
          errors.push("DATABASE_URL contains an insecure default or placeholder password. Replace with a strong, production-grade credential.");
        }
      } else if (isProduction) {
        errors.push("DATABASE_URL must include a secure password in production.");
      }
    } catch (e) {
      errors.push("DATABASE_URL format is invalid. Ensure special characters in passwords are percent-encoded (e.g. '@' as '%40').");
    }
  }

  // 2. AI Inference Provider Validation
  const provider = (env.DEFAULT_AI_PROVIDER || (env.GROQ_API_KEY ? "groq" : "ollama")).toLowerCase();
  if (!ALLOWED_PROVIDERS.has(provider)) {
    errors.push(`DEFAULT_AI_PROVIDER '${provider}' is not supported. Must be one of: ${Array.from(ALLOWED_PROVIDERS).join(", ")}`);
  }

  if (provider === "groq") {
    if (!env.GROQ_API_KEY || env.GROQ_API_KEY.includes("your_groq_api_key") || env.GROQ_API_KEY.includes("your_actual_groq")) {
      errors.push("GROQ_API_KEY is required and must not be a placeholder when DEFAULT_AI_PROVIDER is 'groq'.");
    }
  } else if (provider === "ollama") {
    const ollamaUrl = env.OLLAMA_URL || "http://127.0.0.1:11434";
    try {
      new URL(ollamaUrl);
    } catch (e) {
      errors.push("OLLAMA_URL must be a valid URL (e.g. http://ollama:11434).");
    }
  }

  // 3. Session Secret Hygiene
  if (env.SESSION_SECRET) {
    const secret = env.SESSION_SECRET.trim();
    if (secret.length < 32 || secret.includes("ess_dev_secret") || secret.includes("replace_in_prod")) {
      errors.push("SESSION_SECRET must be at least 32 characters long and must not use the development default.");
    }
  } else if (isProduction) {
    warnings.push("SESSION_SECRET is missing. A cryptographically random 32+ character secret must be configured for production session signing.");
  }

  // 4. Distributed Redis Validation
  if (env.REDIS_URL) {
    try {
      const parsedRedis = new URL(env.REDIS_URL);
      if (!parsedRedis.protocol.startsWith("redis")) {
        errors.push("REDIS_URL protocol must be 'redis:' or 'rediss:'.");
      }
    } catch {
      errors.push("REDIS_URL format is invalid.");
    }
  } else if (isProduction) {
    warnings.push("REDIS_URL is not configured. Distributed rate limiting will operate in process-local memory mode.");
  }

  // 5. Payment Gateway (Razorpay) Hygiene
  if (env.RAZORPAY_KEY_ID) {
    const key = env.RAZORPAY_KEY_ID.toLowerCase();
    if (key.includes("your_") || key.includes("placeholder")) {
      errors.push("RAZORPAY_KEY_ID contains an invalid placeholder.");
    }
    if (!env.RAZORPAY_KEY_SECRET) {
      errors.push("RAZORPAY_KEY_SECRET is required when RAZORPAY_KEY_ID is configured.");
    }
  } else if (isProduction) {
    warnings.push("Razorpay credentials absent. Self-service subscription checkout will remain disabled.");
  }

  // 6. Meta WhatsApp Integration Hygiene
  if (env.WHATSAPP_API_TOKEN) {
    const token = env.WHATSAPP_API_TOKEN.toLowerCase();
    if (token.includes("your_") || token.includes("placeholder")) {
      errors.push("WHATSAPP_API_TOKEN contains an invalid placeholder.");
    }
  } else if (isProduction) {
    warnings.push("WhatsApp API credentials absent. WhatsApp messaging channel will remain disabled.");
  }

  // 7. Webhook Secret Hygiene
  if (env.LEAD_WEBHOOK_URL && !env.LEAD_WEBHOOK_SECRET) {
    warnings.push("LEAD_WEBHOOK_URL is configured without LEAD_WEBHOOK_SECRET. Webhooks will be sent unsigned.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      provider,
      nodeEnv: env.NODE_ENV || "development",
      hasDbUrl: Boolean(dbUrl),
      hasRedis: Boolean(env.REDIS_URL),
      hasRazorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
      hasWhatsApp: Boolean(env.WHATSAPP_API_TOKEN),
      hasGroqKey: Boolean(env.GROQ_API_KEY && !env.GROQ_API_KEY.includes("your_groq_api_key") && !env.GROQ_API_KEY.includes("your_actual_groq")),
      hasWebhook: Boolean(env.LEAD_WEBHOOK_URL),
    },
  };
}
