import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { WebhookDispatcher } from "../../frontend/lib/integrations/webhookDispatcher.js";

test("WebhookDispatcher - computes correct HMAC SHA-256 signature", () => {
  const secret = "test_super_secret_key_123";
  const payload = JSON.stringify({ event: "lead_captured", name: "Rohan" });
  
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const computedSig = WebhookDispatcher.signPayload(payload, secret);

  assert.equal(computedSig, expectedSig);
  assert.equal(computedSig.length, 64);
});

test("WebhookDispatcher - payload tampering invalidates signature", () => {
  const secret = "test_super_secret_key_123";
  const payload = JSON.stringify({ event: "lead_captured", amount: 100 });
  const tamperedPayload = JSON.stringify({ event: "lead_captured", amount: 999999 });

  const originalSig = WebhookDispatcher.signPayload(payload, secret);
  const tamperedSig = WebhookDispatcher.signPayload(tamperedPayload, secret);

  assert.notEqual(originalSig, tamperedSig);
});

test("WebhookDispatcher - returns empty string if no secret provided", () => {
  const sig = WebhookDispatcher.signPayload("{}", "");
  assert.equal(sig, "");
});

test("WebhookDispatcher - rejects invalid or empty URL", async () => {
  const res = await WebhookDispatcher.dispatch({ url: "", payload: {} });
  assert.equal(res.success, false);
  assert.ok(res.error.includes("Invalid webhook URL"));
});
