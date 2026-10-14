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

test("Tenant Security - Cross-tenant isolation in botsStore", async () => {
  const { botsStore } = await import("../../frontend/lib/db/botsStore.js");

  const orgA = "org_test_company_a";
  const orgB = "org_test_company_b";

  // Org A creates a bot
  const botA = botsStore.upsertBot({
    id: "bot_a_secret",
    name: "Company A Internal Bot",
    organizationId: orgA,
  }, orgA);

  // Org B queries bots -> Org A's bot must NOT be visible
  const orgBBots = botsStore.getBots(orgB);
  assert.equal(orgBBots.some((b) => b.id === "bot_a_secret"), false, "Org B should not see Org A bot in list");

  // Org B attempts to directly query Org A's bot by ID
  const directFetch = botsStore.getBot("bot_a_secret", orgB);
  assert.equal(directFetch, null, "Org B direct bot fetch must return null");

  // Clean up
  botsStore.deleteBot("bot_a_secret", orgA);
});

test("Tenant Security - Cross-tenant isolation in leadsStore", async () => {
  const { leadsStore } = await import("../../frontend/lib/db/leadsStore.js");

  const orgAlpha = "org_tenant_alpha";
  const orgBeta = "org_tenant_beta";

  // Capture lead under Alpha
  const leadAlpha = leadsStore.createLead({
    id: "lead_alpha_confidential",
    name: "VIP Buyer",
    email: "vip@buyer.com",
    organizationId: orgAlpha,
  });

  // Beta lists leads -> Must NOT include Alpha's lead
  const betaLeads = leadsStore.getLeads({ organizationId: orgBeta });
  assert.equal(betaLeads.some((l) => l.email === "vip@buyer.com"), false, "Org Beta cannot view Alpha leads");

  // Beta attempts to fetch lead by ID -> Must return null
  const directLead = leadsStore.getLead("lead_alpha_confidential", orgBeta);
  assert.equal(directLead, null, "Org Beta direct lead fetch must return null");
});

test("Tenant Security - Cross-tenant isolation in conversationsStore", async () => {
  const { conversationsStore } = await import("../../frontend/lib/db/conversationsStore.js");

  const org1 = "org_medical_clinic";
  const org2 = "org_law_firm";

  // Clinic creates conversation
  conversationsStore.createConversation({
    id: "conv_medical_secret",
    organizationId: org1,
    visitorName: "Patient John Doe",
    visitorPhone: "+919876543210",
  });

  // Law firm queries conversations -> Must NOT include clinic conversation
  const lawFirmConvs = conversationsStore.getConversations({ organizationId: org2 });
  assert.equal(lawFirmConvs.some((c) => c.id === "conv_medical_secret"), false, "Law firm cannot see clinic conversation");

  const directConv = conversationsStore.getConversation("conv_medical_secret", org2);
  assert.equal(directConv, null, "Law firm direct fetch must return null");
});

test("Regression - Bot Resolution Security Suite", async (t) => {
  const { botsStore } = await import("../../frontend/lib/db/botsStore.js");

  const tenantAlpha = "org_reg_alpha_111";
  const tenantBeta = "org_reg_beta_222";
  const tenantEmpty = "org_reg_empty_333";

  // Seed isolated bots for testing
  botsStore.upsertBot({
    id: "bot_alpha_valid",
    name: "Alpha Customer Service",
    organizationId: tenantAlpha,
    status: "Active",
  }, tenantAlpha);

  botsStore.upsertBot({
    id: "bot_beta_valid",
    name: "Beta Tech Support",
    organizationId: tenantBeta,
    status: "Active",
  }, tenantBeta);

  await t.test("1. Valid public bot lookup returns exact matching bot", () => {
    const bot = botsStore.getBot("bot_alpha_valid");
    assert.ok(bot, "Should find bot by valid ID");
    assert.equal(bot.id, "bot_alpha_valid");
    assert.equal(bot.organizationId, tenantAlpha);
  });

  await t.test("2. Unknown bot ID returns null and NEVER falls back to first bot", () => {
    const unknownBot = botsStore.getBot("bot_nonexistent_random_id_9999");
    assert.equal(unknownBot, null, "Unknown bot ID must resolve to null, never fall back");
  });

  await t.test("3. Missing bot ID (null, undefined, empty string) returns null", () => {
    assert.equal(botsStore.getBot(null), null);
    assert.equal(botsStore.getBot(undefined), null);
    assert.equal(botsStore.getBot(""), null);
    assert.equal(botsStore.getBot("   "), null);
  });

  await t.test("4. Cross-tenant bot lookup returns null", () => {
    // Attempt to access tenant Alpha's bot with tenant Beta's organization scope
    const crossFetch = botsStore.getBot("bot_alpha_valid", tenantBeta);
    assert.equal(crossFetch, null, "Cross-tenant bot lookup must be rejected");
  });

  await t.test("5. Private bot access with mismatched org returns null", () => {
    const result = botsStore.getBot("bot_beta_valid", tenantAlpha);
    assert.equal(result, null, "Bot belonging to Beta must return null for Alpha");
  });

  await t.test("6. Malformed and malicious identifiers return null", () => {
    assert.equal(botsStore.getBot("'; DROP TABLE \"Bot\"; --"), null);
    assert.equal(botsStore.getBot("../../../etc/passwd"), null);
    assert.equal(botsStore.getBot("<script>alert(1)</script>"), null);
  });

  await t.test("7. Tenant with no bots returns an empty array", () => {
    const emptyList = botsStore.getBots(tenantEmpty);
    assert.ok(Array.isArray(emptyList));
    assert.equal(emptyList.length, 0, "Empty tenant should return 0 bots");
  });

  await t.test("8. Distinct tenants have strictly isolated bot lists", () => {
    const alphaList = botsStore.getBots(tenantAlpha);
    const betaList = botsStore.getBots(tenantBeta);

    assert.ok(alphaList.some((b) => b.id === "bot_alpha_valid"));
    assert.equal(alphaList.some((b) => b.id === "bot_beta_valid"), false);

    assert.ok(betaList.some((b) => b.id === "bot_beta_valid"));
    assert.equal(betaList.some((b) => b.id === "bot_alpha_valid"), false);
  });

  // Cleanup
  botsStore.deleteBot("bot_alpha_valid", tenantAlpha);
  botsStore.deleteBot("bot_beta_valid", tenantBeta);
});

