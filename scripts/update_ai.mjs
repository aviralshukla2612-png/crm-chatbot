import fs from "fs";

// 1. Update tools.ts
const toolsPath = "d:/ess-os/src/lib/attendance/ai/tools.ts";
let toolsCode = fs.readFileSync(toolsPath, "utf8");

if (!toolsCode.includes("generate_attendance_report")) {
  const toolH = `  generate_attendance_report: {
    name: "generate_attendance_report",
    description: "Generate an authorized vector PDF attendance report for a specified period or department.",
    parameters: z.object({
      startDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Format: YYYY-MM-DD").optional().describe("Start date YYYY-MM-DD"),
      endDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Format: YYYY-MM-DD").optional().describe("End date YYYY-MM-DD"),
      departmentId: z.string().optional().describe("Department filter (e.g. Engineering, Sales)"),
      employeeId: z.string().optional().describe("Employee code or ID"),
    }),
    requiresAdmin: false,
    execute: async (args, caller) => {
      const today = getISTDateString();
      const startDate = args.startDate || (today.slice(0, 7) + "-01");
      const endDate = args.endDate || today;
      const dept = args.departmentId;
      const empId = !hasAdminAttendanceAccess(caller) ? caller.employeeId : args.employeeId;

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (dept) params.set("departmentId", dept);
      if (empId) params.set("employeeId", empId);

      const downloadUrl = "/crmtesting/api/attendance/reports/pdf?" + params.toString();

      return {
        type: "pdf_report",
        title: dept ? (dept + " Department Attendance Report") : "Workforce Attendance and Hours Report",
        startDate,
        endDate,
        department: dept || "Entire Company",
        downloadUrl,
      };
    },
  },
};
`;

  toolsCode = toolsCode.trimEnd();
  if (toolsCode.endsWith("};")) {
    toolsCode = toolsCode.slice(0, -2) + toolH;
    fs.writeFileSync(toolsPath, toolsCode, "utf8");
    console.log("Step 1: Added generate_attendance_report to tools.ts");
  }
} else {
  console.log("Step 1: generate_attendance_report already present");
}

// 2. Update ollamaClient.ts
const ollamaPath = "d:/ess-os/src/lib/attendance/ai/ollamaClient.ts";
let ollamaCode = fs.readFileSync(ollamaPath, "utf8");

if (!ollamaCode.includes("generate_attendance_report")) {
  const needle = "const p = prompt.toLowerCase().trim();";
  const replacement = `const p = prompt.toLowerCase().trim();

    // 0. PDF / Report generation
    if (p.includes("pdf") || p.includes("generate report") || p.includes("download report") || p.includes("export report") || p.includes("attendance report") || p.includes("attendance pdf")) {
      return {
        toolName: "generate_attendance_report",
        arguments: {},
        reasoning: "Matched query for generating attendance PDF report",
      };
    }`;

  ollamaCode = ollamaCode.replace(needle, replacement);
  fs.writeFileSync(ollamaPath, ollamaCode, "utf8");
  console.log("Step 2: Added report classifier to ollamaClient.ts");
} else {
  console.log("Step 2: report classifier already present");
}
