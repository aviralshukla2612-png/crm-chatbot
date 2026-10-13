#!/usr/bin/env node

/**
 * ESS AI Training & Intelligence Continuous Evaluation Runner
 *
 * Runs repeatable benchmarks against the reviewed ground-truth dataset,
 * evaluating:
 * - Intent classification accuracy
 * - Out-of-scope refusal precision & recall
 * - Business & technical query acceptance
 * - False-positive avoidance on security/technical terms
 * - Prompt injection resistance
 * - Cross-tenant protection
 * - Latency & memory consistency
 */

import fs from "fs";
import path from "path";
import { classifyMessageIntent } from "../frontend/lib/ai/intentClassifier.js";
import { detectLanguage } from "../frontend/lib/ai/masterPrompt.js";

const DATASET_PATH = path.join(
  process.cwd(),
  "frontend",
  "data",
  "training",
  "reviewed_evaluation_dataset_v1.json"
);

const REPORT_PATH = path.join(
  process.cwd(),
  "frontend",
  "data",
  "training",
  "latest_evaluation_report.json"
);

async function runEvaluation() {
  console.log("===============================================================");
  console.log("🧪 STARTING ESS AI INTELLIGENCE CONTINUOUS EVALUATION BENCHMARK");
  console.log("===============================================================");

  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`Dataset not found at ${DATASET_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATASET_PATH, "utf8");
  const dataset = JSON.parse(rawData);

  console.log(`📋 Benchmark: ${dataset.name}`);
  console.log(`📦 Dataset Version: ${dataset.version} | Total Scenarios: ${dataset.scenarios.length}`);
  console.log("---------------------------------------------------------------");

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  let totalOutOfScope = 0;
  let trueOutOfScopeRefused = 0;
  let falseOutOfScopeAccepted = 0;

  let totalTechnical = 0;
  let technicalProceeded = 0;
  let technicalFalseBlocked = 0;

  let totalUnsafe = 0;
  let unsafeBlocked = 0;

  const startTime = Date.now();

  for (const tc of dataset.scenarios) {
    const caseStart = Date.now();
    const lang = detectLanguage(tc.userMessage);
    const intentResult = classifyMessageIntent({
      message: tc.userMessage,
      bot: { company: "Emperor Smart Solutions", name: "Emperor AI" },
      lang,
    });

    const elapsedMs = Date.now() - caseStart;
    let passed = true;
    const failures = [];

    // 1. Verify Expected Action
    if (intentResult.action !== tc.expectedAction) {
      // Allow BUSINESS_RELEVANT vs BUSINESS_TECHNICAL overlap if both PROCEED
      const isBothProceed =
        (tc.expectedAction === "PROCEED" && intentResult.action === "PROCEED");
      if (!isBothProceed) {
        passed = false;
        failures.push(`Action mismatch: expected ${tc.expectedAction}, got ${intentResult.action}`);
      }
    }

    // 2. Verify Refusal / Reply text when refusal occurred
    const replyText = intentResult.refusalReply || intentResult.clarificationPrompt || "";
    if (tc.expectedAction === "REFUSE" || tc.expectedAction === "RESTRICT") {
      if (tc.mustNotContain && Array.isArray(tc.mustNotContain)) {
        for (const forbidden of tc.mustNotContain) {
          if (new RegExp(forbidden, "i").test(replyText)) {
            passed = false;
            failures.push(`Forbidden term leaked in refusal: "${forbidden}"`);
          }
        }
      }
    }

    // Metric categorization
    if (tc.category === "OUT_OF_SCOPE") {
      totalOutOfScope++;
      if (intentResult.action === "REFUSE") trueOutOfScopeRefused++;
      else falseOutOfScopeAccepted++;
    }

    if (tc.category === "BUSINESS_TECHNICAL") {
      totalTechnical++;
      if (intentResult.action === "PROCEED") technicalProceeded++;
      else technicalFalseBlocked++;
    }

    if (tc.category === "UNSAFE_OR_UNAUTHORIZED") {
      totalUnsafe++;
      if (intentResult.action === "RESTRICT") unsafeBlocked++;
    }

    if (passed) passedCount++;
    else failedCount++;

    results.push({
      id: tc.id,
      category: tc.category,
      userMessage: tc.userMessage,
      classifiedIntent: intentResult.intent,
      action: intentResult.action,
      expectedAction: tc.expectedAction,
      confidence: intentResult.confidence,
      latencyMs: elapsedMs,
      status: passed ? "PASS" : "FAIL",
      failures,
    });

    const icon = passed ? "✅" : "❌";
    console.log(`${icon} [${tc.id}] ${tc.category.padEnd(22)} | Action: ${intentResult.action.padEnd(8)} | ${tc.userMessage.slice(0, 45)}...`);
  }

  const totalElapsed = Date.now() - startTime;
  const avgLatency = (totalElapsed / dataset.scenarios.length).toFixed(2);
  const accuracy = ((passedCount / dataset.scenarios.length) * 100).toFixed(1);
  const outOfScopeRecall = totalOutOfScope > 0 ? ((trueOutOfScopeRefused / totalOutOfScope) * 100).toFixed(1) : 100;
  const promptInjectionResistance = totalUnsafe > 0 ? ((unsafeBlocked / totalUnsafe) * 100).toFixed(1) : 100;
  const falsePositiveTechnicalBlockRate = totalTechnical > 0 ? ((technicalFalseBlocked / totalTechnical) * 100).toFixed(1) : 0;

  console.log("===============================================================");
  console.log("📊 CONTINUOUS EVALUATION BENCHMARK RESULTS SUMMARY");
  console.log("===============================================================");
  console.log(`Total Test Scenarios:                ${dataset.scenarios.length}`);
  console.log(`Passed:                              ${passedCount}`);
  console.log(`Failed:                              ${failedCount}`);
  console.log(`Overall Benchmark Accuracy:          ${accuracy}%`);
  console.log(`Out-of-Scope Refusal Recall:         ${outOfScopeRecall}%`);
  console.log(`Prompt Injection Resistance:         ${promptInjectionResistance}%`);
  console.log(`Technical False-Positive Block Rate: ${falsePositiveTechnicalBlockRate}%`);
  console.log(`Average Classifier Latency:          ${avgLatency} ms`);
  console.log("===============================================================");

  const report = {
    benchmarkName: dataset.name,
    datasetVersion: dataset.version,
    timestamp: new Date().toISOString(),
    metrics: {
      totalScenarios: dataset.scenarios.length,
      passedCount,
      failedCount,
      accuracyPercent: Number(accuracy),
      outOfScopeRecallPercent: Number(outOfScopeRecall),
      promptInjectionResistancePercent: Number(promptInjectionResistance),
      falsePositiveTechnicalBlockRatePercent: Number(falsePositiveTechnicalBlockRate),
      averageLatencyMs: Number(avgLatency),
    },
    results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`📁 Detailed JSON report saved to ${REPORT_PATH}`);

  if (failedCount > 0) {
    console.error(`❌ Benchmark failed: ${failedCount} test scenarios did not pass!`);
    process.exit(1);
  } else {
    console.log("🎉 All benchmark scenarios verified successfully!");
    process.exit(0);
  }
}

runEvaluation();
