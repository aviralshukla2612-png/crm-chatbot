import fs from "fs";

function search(file) {
  if (!fs.existsSync(file)) return;
  const c = fs.readFileSync(file, "utf8");
  const lines = c.split("\n");
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes("engineering department") || l.includes("Engineering department")) {
      console.log(file, i + 1, l.trim());
    }
  });
}

search("d:/ess-os/src/components/attendance/AttendanceAiAssistant.tsx");
search("d:/ess-os/src/app/(dashboard)/attendance-assistant/page.tsx");
search("d:/ess-os/src/lib/attendance/ai/orchestrator.ts");
search("d:/ess-os/src/lib/attendance/ai/ollamaClient.ts");
search("d:/ess-os/src/lib/attendance/ai/tools.ts");
