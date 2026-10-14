/**
 * Razorpay Subscriptions & Billing Lifecycle Manager
 * Handles checkout creation, HMAC SHA-256 webhook verification,
 * idempotent event dispatching, and subscription state persistence.
 */

import crypto from "crypto";
import { queryDb } from "../db/dbPool.js";
import { getPlan } from "./plans.js";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "ess_webhook_secret_sandbox";

// In-memory subscription store for testing / offline mode
const memorySubscriptions = new Map();
const memoryBillingEvents = new Set();

export const billingService = {
  /**
   * Reset in-memory subscriptions (for unit testing)
   */
  _resetMemoryStore() {
    memorySubscriptions.clear();
    memoryBillingEvents.clear();
  },

  /**
   * Get active subscription for an organization.
   */
  async getSubscription(organizationId) {
    if (!organizationId) return null;

    const dbRes = await queryDb(
      'SELECT * FROM "Subscription" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 1;',
      [organizationId]
    );

    if (dbRes.ok && dbRes.rows.length > 0) {
      return dbRes.rows[0];
    }

    return (
      memorySubscriptions.get(organizationId) || {
        id: `sub_${organizationId}`,
        organizationId,
        provider: "razorpay",
        planId: "STARTER",
        status: "active",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelAtPeriodEnd: false,
      }
    );
  },

  /**
   * Create a checkout session / subscription link.
   */
  async createSubscriptionCheckout({ organizationId, planId, customerEmail, customerName }) {
    const plan = getPlan(planId);

    // If Razorpay API credentials are configured, interact with Razorpay API
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      try {
        const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
        const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan_id: plan.razorpayPlanId,
            total_count: 12,
            quantity: 1,
            customer_notify: 1,
            notes: {
              organizationId,
              planId: plan.id,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            mode: "live",
            subscriptionId: data.id,
            shortUrl: data.short_url,
            keyId: RAZORPAY_KEY_ID,
            plan,
          };
        }
      } catch (err) {
        console.warn("[RAZORPAY_LIVE_API_ERR]", err.message);
      }
    }

    // In production, reject simulated checkout if live credentials are not configured
    if (process.env.NODE_ENV === "production") {
      throw new Error("Online checkout is temporarily unavailable. Live payment gateway credentials are not configured.");
    }

    // Sandbox / Test fallback (Non-production environments only)
    const mockSubId = `sub_mock_${Date.now()}`;
    const mockCheckoutUrl = `/dashboard/billing?session_id=${mockSubId}&plan=${plan.id}&org=${organizationId}`;

    const subRecord = {
      id: mockSubId,
      organizationId,
      provider: "razorpay",
      providerSubscriptionId: mockSubId,
      planId: plan.id,
      status: "active",
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
    };

    memorySubscriptions.set(organizationId, subRecord);

    await queryDb(
      `INSERT INTO "Subscription" ("id", "organizationId", "provider", "providerSubscriptionId", "planId", "status", "currentPeriodStart", "currentPeriodEnd")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ("id") DO UPDATE SET "planId" = EXCLUDED."planId", "status" = EXCLUDED."status";`,
      [mockSubId, organizationId, "razorpay", mockSubId, plan.id, "active", subRecord.currentPeriodStart, subRecord.currentPeriodEnd]
    );

    await queryDb('UPDATE "Organization" SET "plan" = $1 WHERE "id" = $2;', [plan.name, organizationId]);

    return {
      mode: "sandbox",
      subscriptionId: mockSubId,
      shortUrl: mockCheckoutUrl,
      keyId: "rzp_test_sandbox",
      plan,
      notice: "Operating in test/sandbox mode. Provide RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for live payments.",
    };
  },

  /**
   * Verify Razorpay Webhook HMAC SHA-256 signature against raw request body.
   */
  verifyWebhookSignature(rawBody, signature, secret = (process.env.RAZORPAY_WEBHOOK_SECRET || (process.env.NODE_ENV === "production" ? "" : "ess_webhook_secret_sandbox"))) {
    if (!rawBody || !signature || !secret) return false;

    try {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  },

  /**
   * Process incoming webhook event with strict idempotency.
   */
  async processWebhookEvent(event) {
    const eventId = event.id || `evt_${crypto.randomUUID().slice(0, 16)}`;
    const eventType = event.event || "unknown";

    // 1. Idempotency Check
    if (memoryBillingEvents.has(eventId)) {
      return { processed: false, duplicate: true, eventId };
    }

    const dbCheck = await queryDb('SELECT "id" FROM "BillingEvent" WHERE "eventId" = $1;', [eventId]);
    if (dbCheck.ok && dbCheck.rows.length > 0) {
      memoryBillingEvents.add(eventId);
      return { processed: false, duplicate: true, eventId };
    }

    // 2. Extract subscription payload
    const subEntity = event.payload?.subscription?.entity;
    const notes = subEntity?.notes || {};
    const organizationId = notes.organizationId;
    const planId = (notes.planId || "STARTER").toUpperCase();

    if (organizationId) {
      let status = "active";
      if (eventType === "subscription.cancelled") status = "cancelled";
      if (eventType === "subscription.halted" || eventType === "payment.failed") status = "past_due";
      if (eventType === "subscription.activated" || eventType === "subscription.charged") status = "active";

      // Update Subscription in DB
      await queryDb(
        `UPDATE "Subscription" 
         SET "status" = $1, "planId" = $2, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "organizationId" = $3;`,
        [status, planId, organizationId]
      );

      // Update Organization Plan
      const plan = getPlan(planId);
      await queryDb('UPDATE "Organization" SET "plan" = $1 WHERE "id" = $2;', [plan.name, organizationId]);

      // Update memory mirror
      const existing = memorySubscriptions.get(organizationId) || {};
      memorySubscriptions.set(organizationId, {
        ...existing,
        organizationId,
        planId,
        status,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Record processed event for durable deduplication
    memoryBillingEvents.add(eventId);
    await queryDb(
      'INSERT INTO "BillingEvent" ("id", "provider", "eventId", "eventType", "organizationId", "payload") VALUES ($1, $2, $3, $4, $5, $6);',
      [`be_${Date.now()}`, "razorpay", eventId, eventType, organizationId || null, JSON.stringify(event)]
    );

    return { processed: true, eventId, eventType, organizationId };
  },

  /**
   * Cancel an active subscription.
   */
  async cancelSubscription(organizationId) {
    await queryDb(
      'UPDATE "Subscription" SET "status" = \'cancelled\', "cancelAtPeriodEnd" = TRUE WHERE "organizationId" = $1;',
      [organizationId]
    );

    const sub = memorySubscriptions.get(organizationId);
    if (sub) {
      sub.status = "cancelled";
      sub.cancelAtPeriodEnd = true;
    }

    return { success: true, message: "Subscription will cancel at the end of the current billing cycle." };
  },
};
