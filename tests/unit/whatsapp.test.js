import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { whatsappService } from "../../frontend/lib/integrations/whatsappService.js";

describe("Meta WhatsApp Cloud API Integration Suite", () => {
  beforeEach(() => {
    whatsappService._resetMemoryStore();
  });

  it("1. Successfully validates Meta webhook challenge on correct verify token", () => {
    const challenge = "CHALLENGE_STRING_123456";
    const res = whatsappService.verifyChallenge({
      mode: "subscribe",
      token: "ess_whatsapp_verify_token_default",
      challenge,
    });

    assert.equal(res.ok, true);
    assert.equal(res.challenge, challenge);
  });

  it("2. Rejects unauthorized Meta webhook challenge on invalid token", () => {
    const res = whatsappService.verifyChallenge({
      mode: "subscribe",
      token: "attacker_fake_token",
      challenge: "test",
    });

    assert.equal(res.ok, false);
    assert.ok(res.error.includes("Verification failed"));
  });

  it("3. Verifies authentic Meta HMAC SHA-256 webhook signatures", () => {
    const rawBody = JSON.stringify({ entry: [] });
    const secret = "test_meta_app_secret_123";

    const hash = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const validSignature = `sha256=${hash}`;

    const verified = whatsappService.verifySignature(rawBody, validSignature, secret);
    assert.equal(verified, true);

    const tampered = whatsappService.verifySignature(rawBody + " ", validSignature, secret);
    assert.equal(tampered, false);
  });

  it("4. Normalizes incoming Meta Cloud API message payload", () => {
    const metaPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "10987654321" },
                messages: [
                  {
                    from: "919876543210",
                    id: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhgWM0VCMDEyMzQ1Njc4OABC",
                    timestamp: "1728900000",
                    text: { body: "Hello, can you develop an e-commerce website?" },
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const normalized = whatsappService.normalizeIncomingPayload(metaPayload);
    assert.equal(normalized.isMessage, true);
    assert.equal(normalized.senderPhone, "919876543210");
    assert.equal(normalized.text, "Hello, can you develop an e-commerce website?");
    assert.equal(normalized.phoneNumberId, "10987654321");
  });

  it("5. Executes sales qualification flow and captures lead from incoming WhatsApp inquiry", async () => {
    const result = await whatsappService.handleInboundMessage({
      senderPhone: "919876543210",
      messageId: "msg_wa_test_001",
      text: "Hi I am Aviral Shukla, need a mobile app for our clinic. My number is 9876543210",
      phoneNumberId: "10987654321",
    });

    assert.equal(result.status, "success");
    assert.ok(result.reply.length > 0);

    // Duplicate messageId must be skipped
    const dup = await whatsappService.handleInboundMessage({
      senderPhone: "919876543210",
      messageId: "msg_wa_test_001",
      text: "Duplicate delivery",
    });
    assert.equal(dup.duplicate, true);
  });
});
