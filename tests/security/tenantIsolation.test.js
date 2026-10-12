import test from "node:test";
import assert from "node:assert/strict";
import { checkDomainAuthorization } from "../../frontend/lib/security/domainGuard.js";

test("Tenant Security - Authorizes exact allowed domain", () => {
  const allowed = ["visionexims.com"];
  const res = checkDomainAuthorization("https://visionexims.com", allowed);
  assert.equal(res.allowed, true);
  assert.equal(res.host, "visionexims.com");
});

test("Tenant Security - Authorizes subdomains of allowed domain", () => {
  const allowed = ["visionexims.com"];
  const res = checkDomainAuthorization("https://shop.visionexims.com/products", allowed);
  assert.equal(res.allowed, true);
  assert.equal(res.host, "shop.visionexims.com");
});

test("Tenant Security - Rejects suffix confusion and domain spoofing attacks", () => {
  const allowed = ["visionexims.com"];
  
  // Attacker domain prefix/suffix
  const res1 = checkDomainAuthorization("https://fake-visionexims.com", allowed);
  assert.equal(res1.allowed, false, "Should reject fake-visionexims.com");

  // Attacker using victim as subdomain of attacker's domain
  const res2 = checkDomainAuthorization("https://visionexims.com.evil-corp.com", allowed);
  assert.equal(res2.allowed, false, "Should reject visionexims.com.evil-corp.com");

  // Completely unrelated domain
  const res3 = checkDomainAuthorization("https://phishing.net", allowed);
  assert.equal(res3.allowed, false, "Should reject phishing.net");
});

test("Tenant Security - Wildcard allows all origins", () => {
  const allowed = ["*"];
  const res = checkDomainAuthorization("https://random-tenant.com", allowed);
  assert.equal(res.allowed, true);
});

test("Tenant Security - Multi-tenant scoping filters", () => {
  const mockTenantDatabase = [
    { id: "bot-1", orgId: "org-alpha", name: "Alpha Sales Bot" },
    { id: "bot-2", orgId: "org-beta", name: "Beta Support Bot" },
  ];

  // Simulating tenant authorization check: requester org must match bot org
  function getBotForOrg(botId, requesterOrgId) {
    const bot = mockTenantDatabase.find((b) => b.id === botId && b.orgId === requesterOrgId);
    if (!bot) throw new Error("Unauthorized or Bot not found for this tenant.");
    return bot;
  }

  // Alpha requesting Alpha bot -> OK
  const alphaBot = getBotForOrg("bot-1", "org-alpha");
  assert.equal(alphaBot.id, "bot-1");

  // Beta attempting to read Alpha bot -> Throws unauthorized
  assert.throws(() => {
    getBotForOrg("bot-1", "org-beta");
  }, /Unauthorized/);
});
