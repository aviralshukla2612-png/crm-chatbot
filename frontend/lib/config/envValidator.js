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

  // 3. Webhook Secret Hygiene
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
      hasGroqKey: Boolean(env.GROQ_API_KEY && !env.GROQ_API_KEY.includes("your_groq_api_key") && !env.GROQ_API_KEY.includes("your_actual_groq")),
      hasWebhook: Boolean(env.LEAD_WEBHOOK_URL),
    },
  };
}
