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

test("EnvValidator - fails when default password 'postgrespassword' is used", () => {
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://postgres:postgrespassword@postgres:5432/ess_chatbot",
    DEFAULT_AI_PROVIDER: "mock",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("insecure default or placeholder password")));
});

test("EnvValidator - handles URL-encoded special characters in passwords", () => {
  const env = {
    NODE_ENV: "production",
    // Password is "p@ss:word#99!" encoded
    DATABASE_URL: "postgresql://postgres:p%40ss%3Aword%2399!@postgres:5432/ess_chatbot?schema=public",
    DEFAULT_AI_PROVIDER: "mock",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, true);
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
  assert.ok(res.errors.some((e) => e.includes("insecure default or placeholder password")));
});

test("EnvValidator - rejects invalid or unsupported provider name", () => {
  const env = {
    DEFAULT_AI_PROVIDER: "unsupported_llm_backend",
  };

  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("is not supported")));
});

test("EnvValidator - requires GROQ_API_KEY and rejects placeholders when groq is selected", () => {
  const env1 = {
    DEFAULT_AI_PROVIDER: "groq",
    GROQ_API_KEY: "",
  };
  const res1 = validateEnvironment(env1);
  assert.equal(res1.valid, false);

  const env2 = {
    DEFAULT_AI_PROVIDER: "groq",
    GROQ_API_KEY: "gsk_your_actual_groq_api_key_here",
  };
  const res2 = validateEnvironment(env2);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes("must not be a placeholder")));
});

test("EnvValidator - rejects weak or default SESSION_SECRET", () => {
  const envShort = {
    DEFAULT_AI_PROVIDER: "mock",
    SESSION_SECRET: "too_short_secret",
  };
  const resShort = validateEnvironment(envShort);
  assert.equal(resShort.valid, false);
  assert.ok(resShort.errors.some((e) => e.includes("SESSION_SECRET must be at least 32 characters")));

  const envDevDefault = {
    DEFAULT_AI_PROVIDER: "mock",
    SESSION_SECRET: "ess_dev_secret_replace_in_prod_minimum_32_chars_long_123456",
  };
  const resDevDefault = validateEnvironment(envDevDefault);
  assert.equal(resDevDefault.valid, false);
  assert.ok(resDevDefault.errors.some((e) => e.includes("SESSION_SECRET must be at least 32 characters")));
});

test("EnvValidator - rejects RAZORPAY_KEY_ID configured without RAZORPAY_KEY_SECRET", () => {
  const env = {
    DEFAULT_AI_PROVIDER: "mock",
    RAZORPAY_KEY_ID: "rzp_live_abc123456",
  };
  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("RAZORPAY_KEY_SECRET is required")));
});

test("EnvValidator - rejects invalid REDIS_URL protocol", () => {
  const env = {
    DEFAULT_AI_PROVIDER: "mock",
    REDIS_URL: "http://myredis:6379",
  };
  const res = validateEnvironment(env);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes("REDIS_URL protocol must be 'redis:' or 'rediss:'")));
});
