import test from "node:test";
import assert from "node:assert/strict";
import { InferenceProvider } from "../../frontend/lib/ai/inferenceProvider.js";

test("InferenceProvider - Mock provider generates non-streaming response", async () => {
  const result = await InferenceProvider.generate({
    provider: "mock",
    messages: [{ role: "user", content: "Who founded the company?" }],
    stream: false,
  });

  assert.ok(result.includes("Mock response"));
  assert.ok(result.includes("Yash Sharma"));
});

test("InferenceProvider - Mock provider streams tokens progressively", async () => {
  const tokens = [];
  const result = await InferenceProvider.generate({
    provider: "mock",
    messages: [{ role: "user", content: "Tell me about pricing" }],
    stream: true,
    onToken: (tok) => tokens.push(tok),
  });

  assert.ok(tokens.length > 5);
  assert.equal(tokens.join("").trim(), result.trim());
});

test("InferenceProvider - Handles empty messages gracefully", async () => {
  const result = await InferenceProvider.generate({
    provider: "mock",
    messages: [],
  });

  assert.ok(result.includes("Mock response"));
});
