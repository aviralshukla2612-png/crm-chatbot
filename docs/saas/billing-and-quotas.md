# SUBSCRIPTION BILLING & ATOMIC QUOTA ENFORCEMENT

## 1. Overview
The platform implements an India-first subscription billing engine using **Razorpay Subscriptions** as the primary gateway, with configurable INR pricing plans, HMAC SHA-256 webhook verification, idempotent event processing, and atomic quota enforcement.

## 2. Subscription Plans (`frontend/lib/billing/plans.js`)

| Plan | Monthly Price (INR) | Max Bots | Max Messages / Month | Max Knowledge Pages | Features |
|---|:---:|:---:|:---:|:---:|---|
| **Starter** | **₹2,499** | 1 | 500 | 10 | Lead capture, standard email support |
| **Growth** | **₹7,999** | 5 | 5,000 | 50 | WhatsApp Cloud API, custom branding, domain lock |
| **Enterprise**| **₹24,999** | Unlimited | 50,000 | 500 | Custom LoRA weights, dedicated support, custom SLA |

## 3. Webhook Security & Idempotency (`frontend/lib/billing/billingService.js`)
- **HMAC Verification:** Computes SHA-256 HMAC of the unparsed raw request body against `RAZORPAY_WEBHOOK_SECRET`. Forged signatures are rejected with HTTP 400.
- **Idempotency Guard:** Every event identifier (`eventId`) is verified against the PostgreSQL `BillingEvent` table and an in-memory deduplication set before processing. Duplicate deliveries are skipped safely without duplicate charges or state corruption.

## 4. Atomic Quota Enforcement (`frontend/lib/billing/quotaGuard.js`)
To prevent race conditions during high concurrency:
1. **Pre-flight Check:** When a message or crawl job arrives, `checkAndReserveQuota(organizationId, metric, quantity)` calculates total period usage from table `UsageRecord`.
2. **Subscription Status Validation:** If subscription is `past_due` or `cancelled`, the request is immediately rejected with HTTP 402.
3. **Usage Threshold Interception:** If `currentUsage + quantity > plan.maxLimit`, the request is blocked before invoking LLM inference:
   ```json
   {
     "error": "Monthly quota exceeded for messages. You have used 500 of your 500 allowed quota on the Starter plan.",
     "code": "QUOTA_EXCEEDED"
   }
   ```
4. **Atomic Write:** If allowed, a new record is inserted into table `UsageRecord` with foreign keys and period key (`YYYY-MM`).
