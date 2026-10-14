import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../../frontend/lib/auth/password.js";
import { signSessionToken, verifySessionToken } from "../../frontend/lib/auth/session.js";
import { authStore } from "../../frontend/lib/db/authStore.js";

describe("SaaS Multi-Tenant Authentication & Session Security", () => {
  beforeEach(() => {
    authStore._resetMemoryStore();
  });

  it("1. Hashes passwords with salt and verifies in constant-time", async () => {
    const rawPassword = "StrongEnterprisePassword!2026";
    const hashed = await hashPassword(rawPassword);

    assert.ok(hashed.startsWith("scrypt:"));
    assert.notEqual(hashed, rawPassword);

    const valid = await verifyPassword(rawPassword, hashed);
    assert.equal(valid, true);

    const invalid = await verifyPassword("WrongPassword123", hashed);
    assert.equal(invalid, false);
  });

  it("2. Registers user and automatically provisions organization workspace", async () => {
    const result = await authStore.register({
      email: "ceo@company-a.com",
      password: "SecurePassword123!",
      name: "Alice Founder",
      organizationName: "Company A Workspace",
    });

    assert.ok(result.user.id.startsWith("usr_"));
    assert.equal(result.user.email, "ceo@company-a.com");
    assert.ok(result.organization.id.startsWith("org_"));
    assert.equal(result.orgRole, "ORG_OWNER");
  });

  it("3. Rejects duplicate user registration with same email", async () => {
    await authStore.register({
      email: "duplicate@example.com",
      password: "Password12345!",
      name: "User 1",
    });

    await assert.rejects(
      async () => {
        await authStore.register({
          email: "duplicate@example.com",
          password: "Password12345!",
          name: "User 2",
        });
      },
      { message: "An account with this email already exists" }
    );
  });

  it("4. Authenticates user and returns organization membership context", async () => {
    await authStore.register({
      email: "cto@company-b.com",
      password: "TargetPassword99!",
      name: "Bob CTO",
      organizationName: "Company B Cloud",
    });

    const loginResult = await authStore.login({
      email: "cto@company-b.com",
      password: "TargetPassword99!",
    });

    assert.equal(loginResult.user.email, "cto@company-b.com");
    assert.ok(loginResult.organizationId.startsWith("org_"));
    assert.equal(loginResult.orgRole, "ORG_OWNER");
  });

  it("5. Rejects login with invalid password using generic error message", async () => {
    await authStore.register({
      email: "security@company.com",
      password: "CorrectPassword123!",
    });

    await assert.rejects(
      async () => {
        await authStore.login({
          email: "security@company.com",
          password: "AttackerIncorrectPassword!",
        });
      },
      { message: "Invalid email or password" }
    );
  });

  it("6. Issues tamper-proof HMAC-SHA256 session tokens and validates expiration", () => {
    const token = signSessionToken({
      userId: "usr_123",
      email: "user@tenant.com",
      role: "MEMBER",
      organizationId: "org_alpha",
      orgRole: "ORG_OWNER",
    });

    const verified = verifySessionToken(token);
    assert.ok(verified);
    assert.equal(verified.userId, "usr_123");
    assert.equal(verified.organizationId, "org_alpha");

    // Tampered token must fail
    const tampered = token.slice(0, -5) + "abcde";
    assert.equal(verifySessionToken(tampered), null);

    // Expired token must fail
    const expiredToken = signSessionToken({ userId: "usr_exp" }, -10);
    assert.equal(verifySessionToken(expiredToken), null);
  });

  it("7. Rejects unauthenticated requests with HTTP 401 in requireAuth", async () => {
    const { requireAuth } = await import("../../frontend/lib/auth/guard.js");
    const fakeRequest = {
      headers: new Headers(),
    };

    const res = await requireAuth(fakeRequest);
    assert.equal(res.ok, false);
    assert.equal(res.response.status, 401);
  });

  it("8. Rejects role escalation when MEMBER attempts ORG_OWNER action", async () => {
    const { requireOrgRole, ROLES } = await import("../../frontend/lib/auth/guard.js");
    const memberToken = signSessionToken({
      userId: "usr_regular",
      email: "member@company.com",
      role: "MEMBER",
      organizationId: "org_test",
      orgRole: ROLES.MEMBER,
    });

    const headers = new Headers();
    headers.set("cookie", `ess_session=${encodeURIComponent(memberToken)}`);
    const fakeRequest = { headers };

    const res = await requireOrgRole(fakeRequest, [ROLES.ORG_OWNER, ROLES.ORG_ADMIN]);
    assert.equal(res.ok, false);
    assert.equal(res.response.status, 403);
  });

  it("9. Rejects unauthorized organization switching via X-Organization-Id header", async () => {
    const { getAuthenticatedPrincipal } = await import("../../frontend/lib/auth/guard.js");
    const userToken = signSessionToken({
      userId: "usr_scoped",
      email: "scoped@company.com",
      role: "MEMBER",
      organizationId: "org_legitimate",
      orgRole: "MEMBER",
    });

    const headers = new Headers();
    headers.set("cookie", `ess_session=${encodeURIComponent(userToken)}`);
    // Attempting to switch to foreign organization without membership
    headers.set("x-organization-id", "org_foreign_target");
    const fakeRequest = { headers };

    const principal = await getAuthenticatedPrincipal(fakeRequest);
    assert.equal(principal.authenticated, true);
    // Must remain locked to legitimate organization!
    assert.equal(principal.organizationId, "org_legitimate");
    assert.notEqual(principal.organizationId, "org_foreign_target");
  });
});
