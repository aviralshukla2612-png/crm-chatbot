import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { PLANS, getPlan } from "../../frontend/lib/billing/plans.js";
import { billingService } from "../../frontend/lib/billing/billingService.js";
import { quotaGuard } from "../../frontend/lib/billing/quotaGuard.js";

describe("SaaS Subscription Billing & Quota Enforcement Suite", () => {
  beforeEach(() => {
    billingService._resetMemoryStore();
    quotaGuard._resetMemoryStore();
  });

  it("1. Configures INR pricing and plan limits correctly", () => {
    assert.equal(PLANS.STARTER.currency, "INR");
    assert.equal(PLANS.STARTER.priceINR, 2499);
    assert.equal(PLANS.STARTER.maxMessagesPerMonth, 500);

    assert.equal(PLANS.GROWTH.priceINR, 7999);
    assert.equal(PLANS.GROWTH.maxMessagesPerMonth, 5000);

    assert.equal(PLANS.ENTERPRISE.priceINR, 24999);
    assert.equal(PLANS.ENTERPRISE.maxMessagesPerMonth, 50000);

    assert.equal(getPlan("unknown").id, "STARTER");
  });

  it("2. Verifies authentic HMAC SHA-256 Razorpay webhook signatures", () => {
    const rawPayload = JSON.stringify({ event: "subscription.activated", id: "evt_123" });
    const secret = "test_webhook_secret_key_999";

    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const verified = billingService.verifyWebhookSignature(rawPayload, validSignature, secret);
    assert.equal(verified, true);

    // Tampered payload must fail
    const tamperedPayload = rawPayload + " ";
    const tamperedVerified = billingService.verifyWebhookSignature(tamperedPayload, validSignature, secret);
    assert.equal(tamperedVerified, false);

    // Invalid signature must fail
    assert.equal(billingService.verifyWebhookSignature(rawPayload, "invalid_sig", secret), false);
  });

  it("3. Enforces strict idempotency on duplicate webhook events", async () => {
    const mockEvent = {
      id: "evt_duplicate_test_001",
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            notes: {
              organizationId: "org_subscriber_123",
              planId: "GROWTH",
            },
          },
        },
      },
    };

    // First delivery -> processed
    const firstDelivery = await billingService.processWebhookEvent(mockEvent);
    assert.equal(firstDelivery.processed, true);
    assert.equal(firstDelivery.duplicate, undefined);

    // Second delivery of same eventId -> duplicate skipped
    const secondDelivery = await billingService.processWebhookEvent(mockEvent);
    assert.equal(secondDelivery.processed, false);
    assert.equal(secondDelivery.duplicate, true);
  });

  it("4. Allows usage within quota and atomically increments counter", async () => {
    const orgId = "org_quota_test_tenant";

    // 1st request -> Allowed
    const res1 = await quotaGuard.checkAndReserveQuota(orgId, "message", 1);
    assert.equal(res1.allowed, true);
    assert.equal(res1.currentUsage, 1);

    // 2nd request -> Allowed
    const res2 = await quotaGuard.checkAndReserveQuota(orgId, "message", 1);
    assert.equal(res2.allowed, true);
    assert.equal(res2.currentUsage, 2);
  });

  it("5. Rejects inference request when monthly message quota is exhausted", async () => {
    const orgId = "org_quota_exhausted_tenant";

    // Reserve 500 messages (Starter limit)
    const setup = await quotaGuard.checkAndReserveQuota(orgId, "message", 500);
    assert.equal(setup.allowed, true);
    assert.equal(setup.currentUsage, 500);

    // 501st message -> REJECTED with QUOTA_EXCEEDED
    const blocked = await quotaGuard.checkAndReserveQuota(orgId, "message", 1);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, "QUOTA_EXCEEDED");
    assert.ok(blocked.error.includes("Monthly quota exceeded"));
  });
});
