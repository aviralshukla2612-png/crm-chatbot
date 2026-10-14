# AUDIT REPORT: BILLING & USAGE QUOTAS

**Audit Date:** October 14, 2026  
**Audited Components:** `frontend/lib/billing/plans.js`, `billingService.js`, `quotaGuard.js`, `frontend/app/api/billing/*`, `frontend/app/api/public/chat/[botId]/route.js`  
**Verdict:** **SANDBOX READY / PRODUCTION CONDITIONAL (Grade: B+ / 82%)**

---

## 1. Subscription Plans & INR Pricing
- **Implementation:** `frontend/lib/billing/plans.js`
- **Tiers:**
  - `STARTER`: ₹2,499/mo (1 bot, 500 messages, 10 knowledge docs)
  - `GROWTH`: ₹7,999/mo (5 bots, 5,000 messages, 50 knowledge docs, WhatsApp)
  - `ENTERPRISE`: ₹24,999/mo (unlimited bots, 50,000 messages, 500 knowledge docs, custom LoRA)
- **Currency Compliance:** Strictly Indian Rupees (₹), aligned with Phase 11 master specification.

## 2. Webhook Security & Idempotency
- **Implementation:** `frontend/lib/billing/billingService.js`
- **HMAC Verification:** Computes SHA-256 HMAC of raw body string against `RAZORPAY_WEBHOOK_SECRET`. Tested in `tests/unit/billing.test.js` (valid passes, payload tampering fails).
- **Idempotency Ledger:** Each event ID is checked against table `BillingEvent` and an in-memory set before processing. Duplicate events return `{ processed: false, duplicate: true }`.

## 3. Atomic Quota Enforcement
- **Implementation:** `frontend/lib/billing/quotaGuard.js`
- **Interception Point:** Invoked in `frontend/app/api/public/chat/[botId]/route.js` (lines 175–190) before language detection, RAG retrieval, or LLM inference.
- **Verification Evidence:**
  - In `tests/unit/billing.test.js`, requests 1–500 on the Starter plan succeeded.
  - The 501st message was blocked with `{ allowed: false, reason: "QUOTA_EXCEEDED" }` returning HTTP 402 Payment Required.
  - Subscriptions marked `past_due` or `expired` are refused immediately.

## 4. Launch Blocker: Live Credentials Missing
- **Current State:** Environment variables `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are not populated in production `.env`.
- **Impact:** System operates in test/sandbox mode. Real customer credit cards/UPI cannot be processed.
- **Action Required:** Generate live API keys in the Razorpay Merchant Dashboard and configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the VPS.
