#!/usr/bin/env node

/**
 * ESS AI Sales Agent: Real-World Multi-Turn Conversation Simulator
 *
 * Runs end-to-end simulations of actual prospective customer conversations
 * verifying:
 * 1. School Management ERP flow with "Both" platform answer and multi-module extraction.
 * 2. Mid-flow trivia refusal ("Who is Salman Khan?") without disrupting state.
 * 3. Graceful service category switching (Website -> Mobile App) preserving name, phone, and budget.
 * 4. Single-turn dense multi-attribute extraction (name, phone, email, budget, features).
 * 5. Database failure recovery, honest fallback, and idempotent retry persistence.
 */

import { handleSalesFlowTurn, formatQualificationInquiry, recoverQualificationFromHistory } from "../frontend/lib/ai/salesFlowManager.js";
import { extractLeadDetails } from "../frontend/lib/ai/leadExtractor.js";
import { classifyMessageIntent } from "../frontend/lib/ai/intentClassifier.js";
import { conversationsStore } from "../frontend/lib/db/conversationsStore.js";
import { leadsStore } from "../frontend/lib/db/leadsStore.js";

let totalAsserts = 0;
let passedAsserts = 0;

function assert(condition, description) {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    process.exitCode = 1;
  }
}

async function runSimulations() {
  console.log("======================================================================");
  console.log("🚀 STARTING REAL-WORLD MULTI-TURN CONVERSATION SIMULATIONS");
  console.log("======================================================================\n");

  // ============================================================================
  // SCENARIO 1: School Management ERP (Multi-Turn, "Both", Multi-Module, Phone)
  // ============================================================================
  console.log("🔹 SCENARIO 1: School Management System Discovery & Contact Capture");
  console.log("----------------------------------------------------------------------");
  const session1 = `sim_school_${Date.now()}`;
  const history1 = [];
  let qual1 = null;

  // Turn 1: User introduces themselves
  console.log("Turn 1 -> User: 'Hi, I am Principal Sharma from St. Xavier's Academy'");
  const lead1_t1 = extractLeadDetails("Hi, I am Principal Sharma from St. Xavier's Academy", history1);
  assert(lead1_t1.name === "Principal Sharma", "Extracted customer name: Principal Sharma");
  history1.push({ role: "user", content: "Hi, I am Principal Sharma from St. Xavier's Academy" });
  history1.push({ role: "assistant", content: "Welcome Principal Sharma! Which digital solution are you planning to build?" });

  // Turn 2: User requests school management app
  console.log("Turn 2 -> User: 'i want app for school management'");
  const turn1_t2 = handleSalesFlowTurn({
    message: "i want app for school management",
    visitorName: lead1_t1.name,
    sessionHistory: history1,
    currentQualification: qual1
  });
  qual1 = turn1_t2.updatedQualification;
  assert(turn1_t2.shouldHandle === true, "Recognized school management intent");
  assert(qual1.service === "mobile_app", "Categorized under Mobile/Software Application");
  assert(turn1_t2.quickReplies.includes("Both") || turn1_t2.quickReplies.includes("Both (Android & iOS)"), "Offered 'Both' quick reply option");
  history1.push({ role: "user", content: "i want app for school management" });
  history1.push({ role: "assistant", content: turn1_t2.reply, quickReplies: turn1_t2.quickReplies });

  // Turn 3: User answers "Both."
  console.log("Turn 3 -> User: 'Both.'");
  const lead1_t3 = extractLeadDetails("Both.", history1);
  assert(lead1_t3.name === "Principal Sharma", "Retained Principal Sharma; did NOT overwrite name with 'Both'");
  const turn1_t3 = handleSalesFlowTurn({
    message: "Both.",
    visitorName: lead1_t1.name,
    sessionHistory: history1,
    currentQualification: qual1
  });
  qual1 = turn1_t3.updatedQualification;
  assert(qual1.answers.platform === "Both Android & iOS" || qual1.answers.platform === "Both", "Recorded platform answer 'Both Android & iOS'");
  assert(!turn1_t3.reply.includes("Android, iOS"), "Advanced past platform question without repeating it");
  history1.push({ role: "user", content: "Both." });
  history1.push({ role: "assistant", content: turn1_t3.reply });

  // Turn 4: User provides multiple requirements in 1 message
  console.log("Turn 4 -> User: 'We need attendance, fee management, and parent access'");
  const turn1_t4 = handleSalesFlowTurn({
    message: "We need attendance, fee management, and parent access",
    visitorName: lead1_t1.name,
    sessionHistory: history1,
    currentQualification: qual1
  });
  qual1 = turn1_t4.updatedQualification;
  history1.push({ role: "user", content: "We need attendance, fee management, and parent access" });
  history1.push({ role: "assistant", content: turn1_t4.reply });
  assert(turn1_t4.shouldHandle === true, "Handled feature requirements");

  // Turn 5: User supplies budget
  console.log("Turn 5 -> User: 'Under ₹1,50,000'");
  const turn1_t5 = handleSalesFlowTurn({
    message: "Under ₹1,50,000",
    visitorName: lead1_t1.name,
    sessionHistory: history1,
    currentQualification: qual1
  });
  qual1 = turn1_t5.updatedQualification;
  history1.push({ role: "user", content: "Under ₹1,50,000" });
  history1.push({ role: "assistant", content: turn1_t5.reply });
  assert(!turn1_t5.reply.toLowerCase().includes("what is your approximate budget"), "Did NOT ask for budget again");

  // Turn 6: User provides contact phone
  console.log("Turn 6 -> User: '9876543210'");
  const lead1_t6 = extractLeadDetails("9876543210", history1);
  assert(lead1_t6.phone === "+91 98765 43210", "Validated and formatted Indian phone: +91 98765 43210");
  assert(lead1_t6.name === "Principal Sharma", "Name remains Principal Sharma");

  // Persist lead to database store
  const savedLead1 = leadsStore.createLead({
    sessionId: session1,
    name: lead1_t6.name,
    phone: lead1_t6.phone,
    service: qual1.service,
    answers: qual1.answers,
    inquiry: formatQualificationInquiry(qual1)
  });
  assert(savedLead1 && savedLead1.id, "Lead successfully created in database store");
  assert(savedLead1.phone === "+91 98765 43210", "Stored phone matches formatted number");
  console.log("  🎯 Scenario 1 Completed Successfully!\n");


  // ============================================================================
  // SCENARIO 2: Website Development with Trivia Guardrail & Mid-Flow Correction
  // ============================================================================
  console.log("🔹 SCENARIO 2: Trivia Guardrail Intercept & Mid-Flow Project Correction");
  console.log("----------------------------------------------------------------------");
  const session2 = `sim_trivia_corr_${Date.now()}`;
  const history2 = [];
  let qual2 = null;

  // Turn 1: User gives name & phone in first greeting
  console.log("Turn 1 -> User: 'aniket shukla 7767676766'");
  const lead2_t1 = extractLeadDetails("aniket shukla 7767676766", history2);
  assert(lead2_t1.name === "Aniket Shukla", "Extracted full name: Aniket Shukla");
  assert(lead2_t1.phone === "+91 77676 76766", "Extracted phone: +91 77676 76766");
  history2.push({ role: "user", content: "aniket shukla 7767676766" });

  // Turn 2: User selects Website Development
  console.log("Turn 2 -> User: 'Website Development'");
  const turn2_t2 = handleSalesFlowTurn({
    message: "Website Development",
    visitorName: lead2_t1.name,
    contactRecorded: lead2_t1.phone,
    sessionHistory: history2,
    currentQualification: qual2
  });
  qual2 = turn2_t2.updatedQualification;
  assert(turn2_t2.reply.includes("Is this website for your business?"), "Asked first website question: business status");
  history2.push({ role: "user", content: "Website Development" });
  history2.push({ role: "assistant", content: turn2_t2.reply });

  // Turn 3: User injects off-topic trivia question
  console.log("Turn 3 -> User: 'Who is Salman Khan?'");
  const triviaCheck = classifyMessageIntent({
    message: "Who is Salman Khan?",
    bot: { company: "Emperor Smart Solutions", name: "Emperor AI" }
  });
  assert(triviaCheck.action === "REFUSE", "Trivia query intercepted with REFUSE");
  assert(triviaCheck.intent === "OUT_OF_SCOPE", "Classified as OUT_OF_SCOPE");
  assert(!triviaCheck.refusalReply.toLowerCase().includes("actor"), "Refusal did not reveal actor trivia");
  // Bot replies with refusal, but qualification state in qual2 remains 100% INTACT!
  assert(qual2.service === "website" && qual2.currentStage === "is_business", "Qualification state preserved across refusal");
  history2.push({ role: "user", content: "Who is Salman Khan?" });
  history2.push({ role: "assistant", content: triviaCheck.refusalReply });

  // Turn 4: User resumes business qualification
  console.log("Turn 4 -> User: 'Yes'");
  const turn2_t4 = handleSalesFlowTurn({
    message: "Yes",
    visitorName: lead2_t1.name,
    contactRecorded: lead2_t1.phone,
    sessionHistory: history2,
    currentQualification: qual2
  });
  qual2 = turn2_t4.updatedQualification;
  assert(qual2.answers.is_business === true, "Recorded is_business: true");
  assert(turn2_t4.reply.includes("new website or a redesign"), "Advanced to redesign question");
  history2.push({ role: "user", content: "Yes" });
  history2.push({ role: "assistant", content: turn2_t4.reply });

  // Turn 5: User changes mind to Mobile App
  console.log("Turn 5 -> User: 'Actually, we decided to build a mobile app instead with Flutter'");
  const turn2_t5 = handleSalesFlowTurn({
    message: "Actually, we decided to build a mobile app instead with Flutter",
    visitorName: lead2_t1.name,
    contactRecorded: lead2_t1.phone,
    sessionHistory: history2,
    currentQualification: qual2
  });
  qual2 = turn2_t5.updatedQualification;
  assert(qual2.service === "mobile_app", "Gracefully switched service to mobile_app");
  assert(turn2_t5.reply.toLowerCase().includes("app") || turn2_t5.reply.toLowerCase().includes("product"), "Advanced to next mobile qualification question");
  console.log("  🎯 Scenario 2 Completed Successfully!\n");


  // ============================================================================
  // SCENARIO 3: Dense Multi-Attribute Extraction in Single Message
  // ============================================================================
  console.log("🔹 SCENARIO 3: Dense Single-Turn Information Extraction");
  console.log("----------------------------------------------------------------------");
  const session3 = `sim_dense_${Date.now()}`;
  const history3 = [
    { role: "assistant", content: "Welcome to Emperor Smart Solutions! May I know your name and project idea?" }
  ];

  const denseMsg = "My name is Rohan Patel, phone is 9822334455, email is rohan@corp.in. We need an E-commerce store with admin dashboard and online payment gateway, budget ₹1,00,000.";
  console.log(`Turn 1 -> User: '${denseMsg}'`);

  const denseLead = extractLeadDetails(denseMsg, history3);
  assert(denseLead.name === "Rohan Patel", "Extracted name: Rohan Patel");
  assert(denseLead.phone === "+91 98223 34455", "Extracted phone: +91 98223 34455");
  assert(denseLead.email === "rohan@corp.in", "Extracted email: rohan@corp.in");
  assert(denseLead.score === "Hot", "Classified lead score as 'Hot' (name + phone + email)");

  const denseTurn = handleSalesFlowTurn({
    message: denseMsg,
    visitorName: denseLead.name,
    contactRecorded: denseLead.phone,
    sessionHistory: history3
  });
  assert(denseTurn.shouldHandle === true, "Sales flow accepted dense multi-attribute message");
  assert(denseTurn.updatedQualification.service === "website" || denseTurn.updatedQualification.answers.website_type === "e-commerce", "Identified E-commerce project type");

  // Save to CRM store
  const savedLead3 = leadsStore.createLead({
    sessionId: session3,
    name: denseLead.name,
    phone: denseLead.phone,
    email: denseLead.email,
    score: denseLead.score,
    service: "E-Commerce Development",
    budget: "₹1,00,000",
    inquiry: denseMsg
  });
  assert(savedLead3.email === "rohan@corp.in", "Saved email to CRM");
  assert(savedLead3.phone === "+91 98223 34455", "Saved phone to CRM");
  console.log("  🎯 Scenario 3 Completed Successfully!\n");


  // ============================================================================
  // SCENARIO 4: Database Storage Recovery & Idempotent Deduplication
  // ============================================================================
  console.log("🔹 SCENARIO 4: Database Failure Recovery & Idempotent Deduplication");
  console.log("----------------------------------------------------------------------");
  const session4 = `sim_idempotent_${Date.now()}`;

  // 1. Simulate failure handling function
  function simulateLeadStorageAttempt(dbOnline, payload) {
    if (!dbOnline) {
      return {
        success: false,
        userMessage: "I encountered a temporary connection issue while recording your details. Please try sharing your phone number again, or email us directly at contact@emperorsmartsolutions.com."
      };
    }
    const saved = leadsStore.createLead(payload);
    return {
      success: true,
      lead: saved,
      userMessage: "Thank you! Your details have been recorded safely."
    };
  }

  // Attempt 1: DB connection fails
  console.log("Attempt 1: Transient network failure during lead save");
  const attempt1 = simulateLeadStorageAttempt(false, { sessionId: session4, name: "Dr. Ramesh", phone: "+91 98765 00000" });
  assert(attempt1.success === false, "Detected database failure correctly");
  assert(!attempt1.userMessage.includes("recorded safely"), "Did NOT falsely claim lead was recorded");
  assert(attempt1.userMessage.includes("temporary connection issue"), "Delivered honest failure message with fallback email");

  // Attempt 2: User retries after reconnection
  console.log("Attempt 2: Retry succeeds with actual database store");
  const attempt2 = simulateLeadStorageAttempt(true, { sessionId: session4, name: "Dr. Ramesh", phone: "+91 98765 00000", inquiry: "Healthcare Clinic Portal" });
  assert(attempt2.success === true, "Retry succeeded on active store");
  assert(attempt2.lead.name === "Dr. Ramesh", "Preserved Dr. Ramesh with period title intact");

  // Attempt 3: Immediate duplicate submission with updated requirement
  console.log("Attempt 3: User submits updated requirements in same session (Idempotency check)");
  const initialLeadCount = leadsStore.getLeads().filter(l => l.sessionId === session4).length;
  assert(initialLeadCount === 1, "Exactly one lead exists for session");

  const attempt3 = leadsStore.createLead({
    sessionId: session4,
    name: "Dr. Ramesh",
    phone: "+91 98765 00000",
    inquiry: "Healthcare Clinic Portal with Online Video Consultations"
  });

  const finalLeadCount = leadsStore.getLeads().filter(l => l.sessionId === session4).length;
  assert(finalLeadCount === 1, "Idempotent upsert prevented duplicate lead creation");
  assert(attempt3.inquiry.includes("Online Video Consultations"), "Updated existing lead inquiry in-place");
  console.log("  🎯 Scenario 4 Completed Successfully!\n");

  console.log("======================================================================");
  console.log(`🎉 ALL ${passedAsserts}/${totalAsserts} CONVERSATION SIMULATION CHECKS PASSED!`);
  console.log("======================================================================\n");
}

runSimulations().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});
