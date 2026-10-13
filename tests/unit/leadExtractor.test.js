import test from "node:test";
import assert from "node:assert/strict";
import { extractLeadDetails } from "../../frontend/lib/ai/leadExtractor.js";

test("LeadExtractor - extracts Indian 10-digit mobile and name", () => {
  const result = extractLeadDetails("My name is Rahul Sharma and my number is 9876543210");
  assert.equal(result.hasLeadData, true);
  assert.equal(result.name, "Rahul Sharma");
  assert.equal(result.phone, "+91 98765 43210");
  assert.equal(result.score, "High");
});

test("LeadExtractor - extracts multi-turn dialogue with email and phone", () => {
  const history = [
    { role: "user", content: "I want to build a mobile Flutter app" },
    { role: "assistant", content: "I would be happy to help. May I know your name and contact?" },
    { role: "user", content: "I am Rohan Patel" },
  ];
  const currentMsg = "6359120081, email is rohan@corp.in";
  const result = extractLeadDetails(currentMsg, history);

  assert.equal(result.hasLeadData, true);
  assert.equal(result.name, "Rohan Patel");
  assert.equal(result.email, "rohan@corp.in");
  assert.equal(result.phone, "+91 63591 20081");
  assert.equal(result.score, "Hot");
  assert.ok(result.inquiry.includes("Mobile App Development"));
});

test("LeadExtractor - ignores generic conversation without lead info", () => {
  const result = extractLeadDetails("Where is your office located?");
  assert.equal(result.hasLeadData, false);
  assert.equal(result.phone, "");
  assert.equal(result.email, "");
});

test("LeadExtractor - extracts name and phone from 'Aviral 9876543210'", () => {
  const result = extractLeadDetails("Aviral 9876543210");
  assert.equal(result.hasLeadData, true);
  assert.equal(result.name, "Aviral");
  assert.equal(result.phone, "+91 98765 43210");
});

test("LeadExtractor - extracts standalone name when assistant previously asked for name", () => {
  const history = [
    { role: "assistant", content: "Hello! May I know your name and contact number so I can assist you better?" }
  ];
  const result = extractLeadDetails("Aviral Shukla", history);
  assert.equal(result.hasLeadData, true);
  assert.equal(result.name, "Aviral Shukla");
});

test("LeadExtractor - extracts single-word name 'aviral' when assistant previously asked for name", () => {
  const history = [
    { role: "assistant", content: "Hello! Welcome to Emperor Smart Solutions. May I know your name so I can assist you better and personalize our conversation?" }
  ];
  const result = extractLeadDetails("aviral", history);
  assert.equal(result.hasLeadData, true);
  assert.equal(result.name, "Aviral");
});

test("LeadExtractor - extracts name and typo phone from 'sure here it is my name karan &nunmber is 66666666666'", () => {
  const result = extractLeadDetails("sure here it is my name karan &nunmber is 66666666666");
  assert.equal(result.hasLeadData, true);
  assert.equal(result.name, "Karan");
  assert.equal(result.phone, "66666666666");
});

test("LeadExtractor - does not extract lead from 'note my name and number'", () => {
  const result = extractLeadDetails("note my name and number");
  assert.equal(result.hasLeadData, false);
});

test("LeadExtractor - does not extract 'Enterprise ERP' as a person's name", () => {
  const history = [
    { role: "user", content: "Ram" },
    { role: "assistant", content: "Nice to meet you, Ram! Welcome to Emperor Smart Solutions. Which solution are you planning to build?" },
    { role: "user", content: "Custom Software" },
    { role: "assistant", content: "Is this for enterprise ERP, CRM & sales, operations, or a custom portal?" }
  ];
  const result = extractLeadDetails("Enterprise ERP", history);
  assert.notEqual(result.name, "Enterprise Erp");
  assert.equal(result.name, "Ram");
});

test("LeadExtractor - does not extract 'CRM & Sales' as a person's name", () => {
  const result = extractLeadDetails("CRM & Sales");
  assert.equal(result.name, "");
});

