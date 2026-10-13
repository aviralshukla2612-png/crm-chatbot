/**
 * Test for User-Reported Flow:
 * 1. Bot takes name and provides options
 * 2. Visitor selects Website
 * 3. Visitor answers Yes/No
 * 4. All Yes/No answers saved on Lead so company knows customer details
 */

import { handleSalesFlowTurn, formatQualificationInquiry, recoverQualificationFromHistory } from "../frontend/lib/ai/salesFlowManager.js";
import { conversationsStore } from "../frontend/lib/db/conversationsStore.js";
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
console.log("🎯 TESTING USER REPORTED SALES & LEAD PERSISTENCE FLOW");
console.log("======================================================================\n");

const sessionId = `flow_test_${Date.now()}`;

// Step 1: User introduces their name
console.log("Step 1: Visitor introduces name 'Aviral'");
const visitorName = "Aviral";
const lead1 = leadsStore.createLead({
  sessionId,
  name: visitorName,
  inquiry: "Visitor introduced themselves. Offered services options.",
});
assert(lead1 && lead1.name === "Aviral", "Lead created with visitor name");

// Step 2: Visitor selects "Website Development"
console.log("\nStep 2: Visitor selects 'Website Development'");
const turn1 = handleSalesFlowTurn({
  message: "Website Development",
  visitorName,
  sessionHistory: [],
});
assert(turn1.shouldHandle === true, "Sales flow handled service selection");
assert(turn1.reply.includes("Is this website for your business?"), "Asked first question: 'Is this website for your business?'");
assert(turn1.quickReplies.includes("Yes") && turn1.quickReplies.includes("No"), "Provided Yes/No quick replies");

// Save conversation turn and update lead
conversationsStore.createConversation({
  id: sessionId,
  visitorName,
  qualification: turn1.updatedQualification,
  messages: [
    { role: "user", content: "Website Development" },
    { role: "assistant", content: turn1.reply, quickReplies: turn1.quickReplies },
  ],
});

// Step 3: Visitor answers "Yes"
console.log("\nStep 3: Visitor answers 'Yes'");
const convAfterStep2 = conversationsStore.getConversation(sessionId);
assert(convAfterStep2 && convAfterStep2.qualification, "Conversation retained qualification state");

const turn2 = handleSalesFlowTurn({
  message: "Yes",
  existingQualification: convAfterStep2.qualification,
  sessionHistory: convAfterStep2.messages,
  visitorName,
});

assert(turn2.shouldHandle === true, "Turn 2 handled by sales flow (not falling through to LLM)");
assert(turn2.reply.includes("new website or a redesign"), "Bot asked next question: 'Do you need a new website or a redesign?'");
assert(turn2.quickReplies.includes("New website") && turn2.quickReplies.includes("Redesign"), "Provided New website/Redesign quick replies");
assert(turn2.updatedQualification.answers.is_business === true, "Recorded answer is_business=true");

// Save turn 2 qualification & update lead
conversationsStore.updateConversation(sessionId, {
  qualification: turn2.updatedQualification,
});
const leadAfterTurn2 = leadsStore.createLead({
  sessionId,
  name: visitorName,
  inquiry: formatQualificationInquiry(turn2.updatedQualification),
  answers: turn2.updatedQualification.answers,
  qualification: turn2.updatedQualification,
});

assert(leadAfterTurn2.answers.is_business === true, "Lead saved answer is_business: true");
assert(leadAfterTurn2.inquiry.includes("Business: Yes"), "Lead inquiry formatted with Business: Yes");

// Step 4: Visitor answers "New website"
console.log("\nStep 4: Visitor answers 'New website'");
const convAfterStep3 = conversationsStore.getConversation(sessionId);
const turn3 = handleSalesFlowTurn({
  message: "New website",
  existingQualification: convAfterStep3.qualification,
  sessionHistory: convAfterStep3.messages,
  visitorName,
});

assert(turn3.shouldHandle === true, "Turn 3 handled by sales flow");
assert(turn3.reply.includes("business website, e-commerce store"), "Bot asked website type question");
assert(turn3.updatedQualification.answers.is_redesign === "New website", "Recorded answer is_redesign='New website'");

// Update lead with turn 3 answers
const leadAfterTurn3 = leadsStore.createLead({
  sessionId,
  name: visitorName,
  inquiry: formatQualificationInquiry(turn3.updatedQualification),
  answers: turn3.updatedQualification.answers,
  qualification: turn3.updatedQualification,
});

assert(leadAfterTurn3.answers.is_redesign === "New website", "Lead saved answer is_redesign: 'New website'");
assert(leadAfterTurn3.inquiry.includes("Project: New website"), "Lead inquiry includes 'Project: New website'");

// Step 5: Test recovering qualification from history even if existingQualification was lost
console.log("\nStep 5: State self-healing from session history");
const recovered = recoverQualificationFromHistory([
  { role: "user", content: "Website Development" },
  { role: "assistant", content: "Is this website for your business?" },
  { role: "user", content: "Yes" },
]);
assert(recovered && recovered.service === "website", "Recovered service 'website' from history");
assert(recovered.answers.is_business === true, "Recovered answer is_business: true from history");

// Step 6: Verify Lead in leadsStore.getLeads()
console.log("\nStep 6: Verify lead visibility in leadsStore.getLeads()");
const allLeads = leadsStore.getLeads();
const foundLead = allLeads.find((l) => l.sessionId === sessionId);
assert(foundLead !== undefined, "Lead with qualification answers is visible in CRM leads list");
assert(foundLead.answers.is_business === true, "CRM lead retains is_business answer");
assert(foundLead.answers.is_redesign === "New website", "CRM lead retains is_redesign answer");

// Step 7: Verify 'No' response branches to non-business options (skips redesign, admin, payment)
console.log("\nStep 7: Verify 'No' response branches to non-business options");
const noTurn1 = handleSalesFlowTurn({ message: "Website Development" });
const noTurn2 = handleSalesFlowTurn({
  message: "No",
  existingQualification: noTurn1.updatedQualification,
});
assert(noTurn2.shouldHandle === true, "Flow handled 'No' response");
assert(noTurn2.reply.includes("personal portfolio, blog, non-profit"), "Bot asked non-business question instead of redesign");
assert(noTurn2.quickReplies.includes("Personal portfolio"), "Quick replies include 'Personal portfolio'");
assert(!noTurn2.reply.includes("redesign"), "Bot did NOT ask about redesign when marked 'No'");

const noTurn3 = handleSalesFlowTurn({
  message: "Personal portfolio",
  existingQualification: noTurn2.updatedQualification,
});
assert(noTurn3.reply.includes("approximate budget"), "Directly asked budget (skipping admin panel and payments)");
assert(noTurn3.updatedQualification.answers.non_business_type === "Personal portfolio", "Recorded non_business_type: Personal portfolio");

console.log("\n======================================================================");
console.log("🎉 ALL TESTS PASSED: User-reported flow and lead saving verified!");
console.log("======================================================================\n");
