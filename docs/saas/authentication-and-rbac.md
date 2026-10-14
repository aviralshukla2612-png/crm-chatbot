# AUTHENTICATION, SESSIONS & ROLE-BASED ACCESS CONTROL (RBAC)

## 1. Overview
The platform replaces static UI redirects with server-enforced authentication, constant-time password verification, cryptographic session signing, and fine-grained RBAC.

## 2. Password Hashing Architecture (`frontend/lib/auth/password.js`)
- **Algorithm:** Node.js native `crypto.scrypt` with 16-byte cryptographically random salt and 64-byte key length.
- **Format:** `scrypt:<salt_hex>:<hash_hex>`
- **Constant-Time Verification:** Utilizes `crypto.timingSafeEqual` to prevent side-channel timing analysis attacks during authentication.

## 3. Session Security & Cookie Handling (`frontend/lib/auth/session.js`)
- **Token Structure:** JWT-compliant three-part signed token (`header.payload.signature`).
- **Signature:** HMAC-SHA256 computed with server `SESSION_SECRET`.
- **Cookie Security:**
  - `HttpOnly`: Inaccessible via client-side JavaScript (XSS mitigation).
  - `SameSite=Lax`: Defends against Cross-Site Request Forgery (CSRF).
  - `Secure`: Enforced in production environments over HTTPS.
  - Expiration: Configurable sliding window (default: 7 days).

## 4. Role Hierarchy & Permissions

| Role | Scope | Permissions |
|---|---|---|
| **SUPER_ADMIN** | Platform | Unrestricted access across all tenant workspaces, system metrics, global audits, and platform configuration (`/admin/*`). |
| **ORG_OWNER** | Organization | Full administrative control over organization settings, billing, plan upgrades, team invites, and bot management. |
| **ORG_ADMIN** | Organization | Manage chatbots, website knowledge bases, view leads, and review conversation transcripts. Cannot cancel subscription or remove owner. |
| **MEMBER** | Organization | Operational access to review incoming leads and respond to conversations. Read-only on billing and bot deletion. |
| **VIEWER** | Organization | Read-only analytics, lead summaries, and conversation transcripts. |

## 5. Route Protection Middleware (`frontend/middleware.js`)
- Intercepts all requests matching `/dashboard/:path*` and `/admin/:path*`.
- Unauthenticated requests are immediately redirected to `/login?redirect=<path>`.
- Non-superadmin sessions attempting to access `/admin/*` are automatically rejected and redirected to `/dashboard`.
