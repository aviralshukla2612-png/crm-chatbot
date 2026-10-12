import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../../frontend/lib/config/envValidator.js";

test("EnvValidator - passes with valid production configuration", () => {
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://postgres:MyRealSecretPass99@postgres:5432/ess_chatbot?schema=public",
    DEFAULT_AI_PROVIDER: "groq",
    GROQ_API_KEY: "gsk_live_valid_api_key_12345",
    GROQ_MODEL: "llama-3.3-70b-versatile",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
  assert.equal(res.summary.provider, "groq");
});

test("EnvValidator - fails in production when DATABASE_URL is missing", () => {
  const env = {
    NODE_ENV: "production",
    DEFAULT_AI_PROVIDER: "mock",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("DATABASE_URL is missing")));
});

test("EnvValidator - detects placeholder passwords in DATABASE_URL without leaking credentials", () => {
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://postgres:your_secure_password_here@postgres:5432/ess_chatbot",
    DEFAULT_AI_PROVIDER: "mock",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("default placeholder password")));
});

test("EnvValidator - rejects invalid or unsupported provider name", () => {
  const env = {
    DEFAULT_AI_PROVIDER: "unsupported_llm_backend",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("is not supported")));
});

test("EnvValidator - requires GROQ_API_KEY when groq is selected", () => {
  const env = {
    DEFAULT_AI_PROVIDER: "groq",
    GROQ_API_KEY: "",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("GROQ_API_KEY is required")));
});
