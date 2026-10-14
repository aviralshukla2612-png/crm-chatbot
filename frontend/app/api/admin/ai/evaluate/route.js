import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { classifyMessageIntent } from "@/lib/ai/intentClassifier";
import { detectLanguage, SYSTEM_PROMPT_VERSION } from "@/lib/ai/masterPrompt";

const REPORT_PATH = path.join(
  process.cwd(),
  "frontend",
  "data",
  "training",
  "latest_evaluation_report.json"
);

const DATASET_PATH = path.join(
  process.cwd(),
  "frontend",
  "data",
  "training",
  "reviewed_evaluation_dataset_v1.json"
);

function runLiveEvaluation() {
  if (!fs.existsSync(DATASET_PATH)) {
    return { error: "Dataset file not found" };
  }

  const rawData = fs.readFileSync(DATASET_PATH, "utf8");
  const dataset = JSON.parse(rawData);

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

    // Verify Expected Action
    if (intentResult.action !== tc.expectedAction) {
      const isBothProceed =
        tc.expectedAction === "PROCEED" && intentResult.action === "PROCEED";
      if (!isBothProceed) {
        passed = false;
        failures.push(`Expected ${tc.expectedAction}, got ${intentResult.action}`);
      }
    }

    // Verify Refusal Text
    const replyText = intentResult.refusalReply || intentResult.clarificationPrompt || "";
    if (tc.expectedAction === "REFUSE" || tc.expectedAction === "RESTRICT") {
      if (tc.mustNotContain && Array.isArray(tc.mustNotContain)) {
        for (const forbidden of tc.mustNotContain) {
          if (new RegExp(forbidden, "i").test(replyText)) {
            passed = false;
            failures.push(`Forbidden term leaked: "${forbidden}"`);
          }
        }
      }
    }

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
  }

  const totalElapsed = Date.now() - startTime;
  const avgLatency = (totalElapsed / dataset.scenarios.length).toFixed(2);
  const accuracy = ((passedCount / dataset.scenarios.length) * 100).toFixed(1);
  const outOfScopeRecall = totalOutOfScope > 0 ? ((trueOutOfScopeRefused / totalOutOfScope) * 100).toFixed(1) : 100;
  const promptInjectionResistance = totalUnsafe > 0 ? ((unsafeBlocked / totalUnsafe) * 100).toFixed(1) : 100;
  const falsePositiveTechnicalBlockRate = totalTechnical > 0 ? ((technicalFalseBlocked / totalTechnical) * 100).toFixed(1) : 0;

  const report = {
    benchmarkName: dataset.name,
    datasetVersion: dataset.version,
    systemPromptVersion: SYSTEM_PROMPT_VERSION,
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

  try {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  } catch (err) {}

  return report;
}

export async function GET(request) {
  try {
    const { requireSuperAdmin } = await import("@/lib/auth/guard");
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    if (fs.existsSync(REPORT_PATH)) {
      const raw = fs.readFileSync(REPORT_PATH, "utf8");
      return NextResponse.json(JSON.parse(raw));
    }
    const live = runLiveEvaluation();
    return NextResponse.json(live);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { requireSuperAdmin } = await import("@/lib/auth/guard");
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) return auth.response;

    const report = runLiveEvaluation();
    return NextResponse.json({ success: true, report });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
