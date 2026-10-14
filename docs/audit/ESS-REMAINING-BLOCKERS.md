# REMAINING LAUNCH BLOCKERS & PRODUCTION ACTION ITEMS

**Audit Date:** October 14, 2026  
**Auditor:** Principal Enterprise Architect  

---

## 1. Critical Launch Blockers (Must resolve before opening public registrations)

| Blocker ID | Domain | Description | Remediation Required |
|:---:|---|---|---|
| **BLK-01** | **Billing** | `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are not set in `.env`. System currently runs in sandbox mode. | Obtain live Merchant API keys from Razorpay Dashboard and add them to VPS production `.env`. |
| **BLK-02** | **External API** | `WHATSAPP_API_TOKEN` and `WHATSAPP_APP_SECRET` are not set in `.env`. | Configure Meta WhatsApp Cloud API credentials and register `https://<domain>/api/whatsapp/webhook` in Meta Developer Portal. |
| **BLK-03** | **Git / Build** | Working tree contains uncommitted SaaS implementation files on `main`. | Commit all tested SaaS files (`git add .`, `git commit -m "feat(saas): multi-tenant auth, billing, quotas, whatsapp"`) and push to remote. |
| **BLK-04** | **DNS & SSL** | Cloudflare Full (Strict) SSL pointing is pending for the production domain. | Complete DNS A-record pointing to VPS IP (`187.127.158.24`) and verify HTTPS certificate termination via Nginx. |

---

## 2. Non-Blocking Secondary Recommendations (Post-Launch Phase)

1. **Transactional Email Gateway:** Add SendGrid/Resend API keys to enable outbound email verification and password reset workflows.
2. **External Penetration Testing:** Schedule a formal third-party OWASP Top 10 penetration test against the live HTTPS domain.
3. **APM & Sentry Monitoring:** Connect Sentry or Prometheus for automated error alerting and latency tracking.
