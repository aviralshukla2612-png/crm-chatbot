/**
 * Test for All 7 Services of Emperor Smart Solutions (ESS)
 */

import { handleSalesFlowTurn, formatQualificationInquiry, ALL_ESS_SERVICES } from "../frontend/lib/ai/salesFlowManager.js";
import { leadsStore } from "../frontend/lib/db/leadsStore.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
}

console.log("======================================================================");
console.log("🎯 TESTING ALL 7 SERVICES QUALIFICATION FLOWS & QUICK REPLIES");
console.log("======================================================================\n");

assert(ALL_ESS_SERVICES.length === 7, "ALL_ESS_SERVICES contains exactly 7 core services");

// Test 1: Website Development
console.log("Service 1: Website Development");
const r1 = handleSalesFlowTurn({ message: "Website Development" });
assert(r1.shouldHandle === true, "Flow handled Website Development");
assert(r1.reply.includes("Is this website for your business?"), "Asked: Is this website for your business?");
assert(r1.quickReplies.includes("Yes") && r1.quickReplies.includes("No"), "Quick replies: Yes / No");

// Test 2: Mobile Application
console.log("\nService 2: Mobile Application");
const r2 = handleSalesFlowTurn({ message: "Mobile Application" });
assert(r2.shouldHandle === true, "Flow handled Mobile Application");
assert(r2.reply.includes("Android app, iOS app, or both"), "Asked: Android app, iOS app, or both?");
assert(r2.quickReplies.includes("Android") && r2.quickReplies.includes("Both"), "Quick replies: Android / iOS / Both");

// Test 3: AI Chatbot
console.log("\nService 3: AI Chatbot");
const r3 = handleSalesFlowTurn({ message: "AI Chatbot" });
assert(r3.shouldHandle === true, "Flow handled AI Chatbot");
assert(r3.reply.includes("website, WhatsApp, or both"), "Asked: website, WhatsApp, or both?");
assert(r3.quickReplies.includes("Website") && r3.quickReplies.includes("WhatsApp"), "Quick replies: Website / WhatsApp / Both");

// Test 4: Custom Software
console.log("\nService 4: Custom Software");
const r4 = handleSalesFlowTurn({ message: "Custom Software" });
assert(r4.shouldHandle === true, "Flow handled Custom Software");
assert(r4.reply.includes("enterprise ERP, CRM & sales"), "Asked: enterprise ERP, CRM & sales, operations, or a custom portal?");
assert(r4.quickReplies.includes("Enterprise ERP") && r4.quickReplies.includes("CRM & Sales"), "Quick replies for system types");

// Test 4 Turn 2: User answers "Enterprise ERP"
const r4Turn2 = handleSalesFlowTurn({
  message: "Enterprise ERP",
  existingQualification: r4.updatedQualification,
});
assert(r4Turn2.reply.includes("existing databases or spreadsheets"), "Asked about databases migration");
assert(r4Turn2.updatedQualification.answers.system_type === "Enterprise ERP", "Recorded answer: Enterprise ERP");

// Test 5: UI/UX Design
console.log("\nService 5: UI/UX Design");
const r5 = handleSalesFlowTurn({ message: "UI/UX Design" });
assert(r5.shouldHandle === true, "Flow handled UI/UX Design");
assert(r5.reply.includes("mobile app, website, or enterprise dashboard"), "Asked target design platform");
assert(r5.quickReplies.includes("Mobile App") && r5.quickReplies.includes("Website"), "Quick replies for UI/UX targets");

// Test 6: Cloud & DevOps
console.log("\nService 6: Cloud & DevOps");
const r6 = handleSalesFlowTurn({ message: "Cloud & DevOps" });
assert(r6.shouldHandle === true, "Flow handled Cloud & DevOps");
assert(r6.reply.includes("Which cloud platform do you prefer"), "Asked cloud platform preference");
assert(r6.quickReplies.includes("AWS") && r6.quickReplies.includes("Google Cloud"), "Quick replies: AWS / Google Cloud");

// Test 7: SEO & Marketing
console.log("\nService 7: SEO & Marketing");
const r7 = handleSalesFlowTurn({ message: "SEO & Marketing" });
assert(r7.shouldHandle === true, "Flow handled SEO & Marketing");
assert(r7.reply.includes("existing website or a brand new business launch"), "Asked website status for SEO");
assert(r7.quickReplies.includes("Existing website") && r7.quickReplies.includes("New business launch"), "Quick replies for SEO launch");

// Test 8: Lead formatting for custom software
console.log("\nTest 8: Lead formatting across new services");
const customInquiry = formatQualificationInquiry(r4Turn2.updatedQualification);
assert(customInquiry.includes("Custom Software & ERP: System: Enterprise ERP"), "Lead formatted inquiry correctly for Custom Software");

console.log("\n======================================================================");
console.log("🎉 ALL 7 SERVICES QUALIFICATION FLOWS VERIFIED SUCCESSFULLY!");
console.log("======================================================================\n");
