import fs from "fs";

// 1. AttendanceAiAssistant.tsx
const uiPath = "d:/ess-os/src/components/attendance/AttendanceAiAssistant.tsx";
let ui = fs.readFileSync(uiPath, "utf8");

ui = ui.replace(
  '"Show attendance for Engineering department",',
  '"Show attendance for Sales department",'
);

// Only render department attendance card if todayTotalCount > 0
ui = ui.replace(
  '{msg.data?.type === "department_summary" && msg.data?.employees && (',
  '{msg.data?.type === "department_summary" && msg.data?.employees && (msg.data.todayTotalCount > 0) && ('
);

fs.writeFileSync(uiPath, ui, "utf8");
console.log("✅ Updated AttendanceAiAssistant.tsx: replaced Engineering with Sales");

// 2. page.tsx
const pagePath = "d:/ess-os/src/app/(dashboard)/attendance-assistant/page.tsx";
if (fs.existsSync(pagePath)) {
  let page = fs.readFileSync(pagePath, "utf8");
  page = page.replace(
    '{ text: "Show attendance for Engineering department", short: "Engineering Dept", icon: Building2, tag: "Department" },\n',
    ""
  );
  page = page.replace(
    '{ text: "Show attendance for Engineering department", short: "Engineering Dept", icon: Building2, tag: "Department" },',
    ""
  );
  fs.writeFileSync(pagePath, page, "utf8");
  console.log("✅ Updated page.tsx: removed Engineering department");
}

// 3. orchestrator.ts
const orchPath = "d:/ess-os/src/lib/attendance/ai/orchestrator.ts";
let orch = fs.readFileSync(orchPath, "utf8");

orch = orch.replace(
  '• 🏢 **Departments:** "Show attendance for Engineering department"',
  '• 🏢 **Departments:** "Show attendance for Sales department"'
);

// Clean up any remaining guide mentions
orch = orch.replace(
  '"Show attendance for Engineering department"',
  '"Show attendance for Sales department"'
);

fs.writeFileSync(orchPath, orch, "utf8");
console.log("✅ Updated orchestrator.ts: replaced Engineering with Sales");

// 4. ollamaClient.ts: Improve empty department message
const ollamaPath = "d:/ess-os/src/lib/attendance/ai/ollamaClient.ts";
let ollama = fs.readFileSync(ollamaPath, "utf8");

// When totalStaff === 0 for a department
const oldCheck = "let text = `📊 **${dept} Department Attendance Overview:**\\n\\n`;";
const newCheck = `if (totalStaff === 0) {
            return \`ℹ️ No active employees found for the **\${dept}** department in company records.\`;
          }

          let text = \`📊 **\${dept} Department Attendance Overview:**\\n\\n\`;`;

if (ollama.includes(oldCheck) && !ollama.includes("if (totalStaff === 0)")) {
  ollama = ollama.replace(oldCheck, newCheck);
  fs.writeFileSync(ollamaPath, ollama, "utf8");
  console.log("✅ Updated ollamaClient.ts: improved zero staff department message");
}
