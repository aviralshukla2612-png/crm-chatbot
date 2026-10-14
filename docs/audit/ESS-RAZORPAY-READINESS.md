# ESS Razorpay Subscription & Billing Readiness Audit Report

**Document ID:** `ESS-RAZORPAY-READINESS-001`  
**Classification:** Financial & Billing Integration Audit  
**Target:** Razorpay Automated Subscription Billing & Quota Enforcement  
**Integration Status:** **MOCK & FIXTURE VERIFIED (35%) / LIVE CREDENTIALS ABSENT (0%)**  

---

## 1. Subscription Lifecycle Architecture

### 1.1 Commercial Tier Catalog (INR Currency)
Defined in `frontend/lib/billing/plans.js`:
- **Free Tier:** ₹0 / month — 1 Bot, 100 Messages/mo, 100 Knowledge Chunks, Standard Support.
- **Starter Tier:** ₹2,499 / month — 3 Bots, 500 Messages/mo, 1,000 Knowledge Chunks, Email Support.
- **Professional Tier:** ₹6,999 / month — 10 Bots, 5,000 Messages/mo, 10,000 Knowledge Chunks, Priority Support.
- **Enterprise Tier:** ₹19,999 / month — Unlimited Bots, 25,000 Messages/mo, Custom Knowledge Chunks, Dedicated Account Manager.

All plan pricing is strictly encapsulated in server-side logic; client-side price manipulation is rejected by server schema validation.

---

## 2. Webhook Security and Lifecycle State Verification

### 2.1 Cryptographic Signature Verification
- **Handler:** `frontend/app/api/billing/webhook/route.js`
- **Method:** `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')`
- **Security Check:** Constant-time comparison `crypto.timingSafeEqual` prevents timing-based signature forging.
- **Automated Verification:** Verified in `tests/unit/billing.test.js` (assertions pass: valid signatures accepted, tampered payload rejected with HTTP 400).

### 2.2 Event Idempotency and State Reconciliation
The webhook router handles the standard Razorpay subscription state events:
- `subscription.authenticated`: Marks subscription as pending activation.
- `subscription.activated`: Updates organization tier, resets monthly quota window.
- `subscription.charged`: Extends billing cycle, resets active usage counter to 0.
- `subscription.pending`: Flags account for grace-period notification (3 days).
- `subscription.halted`: Downgrades organization to Free tier; suspends active bots exceeding free quotas.
- `subscription.cancelled`: Downgrades organization at period end.

---

## 3. Quota Enforcement Engine

### 3.1 Concurrency & Atomic Quota Updates
- **Implementation:** `frontend/lib/billing/usageQuotas.js`
- **Mechanism:** PostgreSQL atomic increment:
  ```sql
  UPDATE organization_quotas 
  SET messages_used = messages_used + 1 
  WHERE organization_id = $1 AND messages_used < message_limit 
  RETURNING messages_used;
  ```
- **Automated Verification:** `tests/unit/billing.test.js` verified that attempting 501 messages on a 500-message plan cleanly rejects the 501st message with `QUOTA_EXCEEDED` and does not increment usage beyond the limit.

---

## 4. Live Environment Variable Verification

| Variable | Requirement | Local / Container Status | Format Validity |
|---|---|---|---|
| `RAZORPAY_KEY_ID` | Required for Live Billing | **ABSENT** | N/A (Missing) |
| `RAZORPAY_KEY_SECRET` | Required for Live Billing | **ABSENT** | N/A (Missing) |
| `RAZORPAY_WEBHOOK_SECRET` | Required for Webhooks | **ABSENT** | N/A (Missing) |

**Conclusion:** Live payment processing is **STRICTLY BLOCKED**. No money can be charged and no live webhooks can be received until the merchant registers with Razorpay and injects the live keys into the production environment.
