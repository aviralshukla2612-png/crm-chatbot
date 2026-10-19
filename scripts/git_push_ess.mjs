import { execSync } from "child_process";

try {
  console.log("Adding files...");
  execSync("git add src/components/attendance/AttendanceAiAssistant.tsx src/lib/attendance/ai/ollamaClient.ts src/lib/attendance/ai/orchestrator.ts src/lib/attendance/ai/tools.ts", { cwd: "d:/ess-os", stdio: "inherit" });

  console.log("Committing changes...");
  execSync('git commit -m "fix(attendance-ai): remove sales suggestion prompt, add department headcount tool, and enrich department attendance summary"', { cwd: "d:/ess-os", stdio: "inherit" });

  console.log("Pushing to origin main...");
  execSync("git push origin main", { cwd: "d:/ess-os", stdio: "inherit" });

  console.log("✅ Successfully committed and pushed to git!");
} catch (e) {
  console.error("Git error:", e.message);
  process.exit(1);
}
