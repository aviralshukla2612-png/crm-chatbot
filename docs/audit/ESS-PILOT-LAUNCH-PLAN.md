# ESS Controlled Pilot Launch Plan

**Document ID:** `ESS-PILOT-LAUNCH-PLAN-001`  
**Classification:** Go-To-Market & Reliability Operations  
**Target Group:** 1 to 3 Trusted B2B Design Partners  
**Phase:** Controlled Private Pilot (Closed Beta)  

---

## 1. Pilot Scope & Eligibility Criteria

### 1.1 Candidate Partner Qualifications
- **Partner Profile:** Existing B2B commercial contacts with manual relationship management.
- **Scale:** Maximum 3 design partners simultaneously.
- **Channels in Scope:** Web-embedded AI chatbot widget and lead capture dashboard only.
- **Channels Out of Scope:** Meta WhatsApp Cloud API (remains disabled until Meta Business verification passes).
- **Billing Model:** White-glove manual subscription / invoiced pilot (Razorpay self-service billing remains in sandbox/disabled).

---

## 2. Partner Provisioning Runbook

1. **Organization Creation:**
   Super Admin creates tenant record via API or migration seed script:
   - Sets tier to `Starter` or `Professional`.
   - Allocates monthly message quota (e.g. 1,000 messages).
2. **Sub-Admin Onboarding:**
   Issue invite link or seed admin credential with forced password reset on first login.
3. **Chatbot Configuration & Knowledge Ingestion:**
   Upload partner knowledge base (PDF/text) through the dashboard; verify chunks are isolated to partner `organization_id`.
4. **Embed Widget Verification:**
   Whitelist partner domain (e.g., `partnerwebsite.com`) in bot settings. Test embed snippet on partner staging environment.

---

## 3. Cost and Safety Controls

- **Per-Bot Concurrency Limit:** Maximum 10 simultaneous inference streams.
- **Monthly Token Cap:** Hard limit enforced at 1,000 messages/month; requests beyond this return friendly out-of-quota messages.
- **Monitoring Cadence:** Daily review of error logs, inference latency, and memory utilization on Ollama container.
- **Support Escalation SLA:** Direct communication channel (Slack / WhatsApp group with ESS engineering team), 1-hour response time for critical incidents.

---

## 4. Criteria for Expanding to Public Commercial Launch

Before expanding from this 3-partner pilot to general public registration:
1. Complete 14 consecutive days of zero cross-tenant data leaks and zero Sev-1 outages.
2. Resolve the `login/page.js` syntax issue and achieve automated green builds in CI/CD.
3. Provision live Razorpay merchant credentials and verify real credit card / UPI subscription checkout.
4. Pass Meta Business verification and configure production WhatsApp Cloud API webhook.
5. Successfully execute a verified PostgreSQL backup and restore drill against staging.
