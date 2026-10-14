# SECURITY THREAT MODEL & HARDENING AUDIT

## 1. Threat Modeling Matrix (STRIDE)

| Threat Category | Potential Attack Scenario | Implemented Mitigation | Verification Status |
|---|---|---|:---:|
| **Spoofing** | Attacker impersonates an existing user or submits forged session token. | Tamper-proof HMAC-SHA256 session tokens with expiration and HttpOnly/SameSite cookie scoping. Constant-time `scrypt` password verification. | 🟢 Verified by test suite |
| **Tampering** | Attacker modifies subscription webhook payloads to grant free Enterprise tier. | HMAC SHA-256 signature verification computed over raw unparsed body. Signature failure returns HTTP 400. | 🟢 Verified by test suite |
| **Repudiation** | Malicious administrator deletes or modifies customer bots or leads. | Audit logs recorded in table `AuditLog` capturing `organizationId`, `userId`, `action`, `resourceId`, and `ipAddress`. | 🟢 Verified by schema |
| **Information Disclosure** | Unauthenticated user calls `/api/bots` or `/api/leads` to dump customer data. | Strict `requireAuth` guard removes wildcard CORS; all queries scoped strictly by caller's `organizationId`. | 🟢 Verified by test suite |
| **Denial of Service** | Flooding chat API with requests to exhaust Groq/LLM tokens or crash Node.js. | Distributed sliding-window rate limiting via Redis sorted sets + monthly message quota enforcement. | 🟢 Verified by test suite |
| **Elevation of Privilege** | Member changes dropdown in browser to access `/admin/*` super-admin panel. | Server-side route middleware and API guard require verified `SUPER_ADMIN` platform role. Client role inputs are never trusted. | 🟢 Verified by test suite |

## 2. SSRF (Server-Side Request Forgery) Guardrails
- **Implementation:** `frontend/lib/security/ssrf.js`
- **Protected Endpoints:** Website crawler, document ingestion, webhook dispatching.
- **Blocked Ranges:**
  - Loopback: `127.0.0.1`, `localhost`, `::1`
  - Cloud Metadata: `169.254.169.254`
  - RFC 1918 Private Subnets: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
  - Non-HTTP Schemes: `file://`, `gopher://`, `ftp://`

## 3. SQL Injection Defense
All database queries utilize parameterized `$1, $2, $3...` SQL placeholders via PostgreSQL connection pool (`frontend/lib/db/dbPool.js`). Dynamic string concatenation in SQL statements is strictly prohibited.
