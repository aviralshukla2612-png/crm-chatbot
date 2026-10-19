import fs from "fs";

// ==========================================
// 1. UPDATE tools.ts
// ==========================================
const toolsPath = "d:/ess-os/src/lib/attendance/ai/tools.ts";
let tools = fs.readFileSync(toolsPath, "utf8");

// Replace get_department_attendance_summary
const oldDeptSummaryStart = tools.indexOf("get_department_attendance_summary: {");
const nextToolStart = tools.indexOf("get_late_arrivals_summary: {", oldDeptSummaryStart);

if (oldDeptSummaryStart !== -1 && nextToolStart !== -1) {
  const newDeptSummary = `get_department_attendance_summary: {
    name: "get_department_attendance_summary",
    description: "Get attendance statistics, today's punch status, and active roster broken down by department.",
    parameters: z.object({
      departmentId: z.string().optional().describe("Specific department name to query (or all departments if omitted)"),
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().min(2020).max(2030).optional(),
    }),
    requiresAdmin: true,
    execute: async (args, caller) => {
      if (!hasAdminAttendanceAccess(caller)) {
        throw new AttendanceServiceError("Forbidden: Department summaries require admin access", 403);
      }
      const now = new Date();
      const month = args.month || (now.getMonth() + 1);
      const year = args.year || now.getFullYear();
      const targetDept = args.departmentId;

      // 1. Fetch monthly report
      const report = await AttendanceService.getMonthlyReport(
        {
          month,
          year,
          departmentId: targetDept,
          status: "ALL",
        },
        caller
      );

      // 2. Fetch department roster and today's status
      let deptEmployees: any[] = [];
      let todayRecords: any[] = [];
      let recentRecords: any[] = [];
      let todayPresentCount = 0;

      if (targetDept) {
        const allEmployees = await prisma.employee.findMany({
          where: { status: "ACTIVE" },
          include: {
            user: {
              select: { id: true, name: true, email: true, department: true, designation: true },
            },
          },
          orderBy: { employeeIdCode: "asc" },
        });

        deptEmployees = allEmployees.filter((e) =>
          e.user?.department && e.user.department.toLowerCase().includes(targetDept.toLowerCase())
        );

        const empIds = deptEmployees.map((e) => e.id);

        if (empIds.length > 0) {
          const todayDate = getISTDateString();
          const { startOfDay, endOfDay } = getISTDayRange(todayDate);

          todayRecords = await prisma.attendance.findMany({
            where: {
              employeeId: { in: empIds },
              date: { gte: startOfDay, lte: endOfDay },
            },
          });

          const todayMap = new Map<string, any>();
          for (const tr of todayRecords) {
            todayMap.set(tr.employeeId, tr);
            if (tr.status === "PRESENT" || tr.punchIn) {
              todayPresentCount++;
            }
          }

          deptEmployees = deptEmployees.map((e) => {
            const tr = todayMap.get(e.id);
            return {
              id: e.id,
              code: e.employeeIdCode,
              name: e.user.name,
              department: e.user.department,
              designation: e.user.designation || "Staff",
              todayStatus: tr ? tr.status : "NOT_CHECKED_IN",
              todayPunchIn: tr?.punchIn ? formatTimeIST(tr.punchIn) : null,
              todayPunchOut: tr?.punchOut ? formatTimeIST(tr.punchOut) : null,
            };
          });

          recentRecords = await prisma.attendance.findMany({
            where: { employeeId: { in: empIds } },
            orderBy: { date: "desc" },
            take: 5,
            include: {
              employee: {
                include: { user: { select: { name: true } } },
              },
            },
          });
        }
      }

      return {
        type: "department_summary",
        department: targetDept,
        month,
        year,
        todayPresentCount,
        todayTotalCount: deptEmployees.length,
        employees: deptEmployees,
        departments: report.departmentBreakdown,
        recentRecords: recentRecords.map((r) => ({
          name: r.employee?.user?.name || "Employee",
          date: r.date.toISOString().slice(0, 10),
          status: r.status,
          punchIn: r.punchIn ? formatTimeIST(r.punchIn) : "--:--",
          punchOut: r.punchOut ? formatTimeIST(r.punchOut) : "--:--",
        })),
      };
    },
  },

  `;

  tools = tools.slice(0, oldDeptSummaryStart) + newDeptSummary + tools.slice(nextToolStart);
}

// Ensure get_department_employees is cleanly placed
if (!tools.includes("get_department_employees: {")) {
  const toolEntry = `  get_department_employees: {
    name: "get_department_employees",
    description: "Get employee count, headcount, and active staff directory by department or entire company.",
    parameters: z.object({
      department: z.string().optional().describe("Department name (e.g. Sales, Engineering, Design)"),
    }),
    requiresAdmin: false,
    execute: async (args, caller) => {
      const allEmployees = await prisma.employee.findMany({
        where: { status: "ACTIVE" },
        include: {
          user: {
            select: { id: true, name: true, email: true, department: true, designation: true },
          },
        },
        orderBy: { employeeIdCode: "asc" },
      });

      const filterDept = args.department ? args.department.trim() : null;
      const matched = filterDept
        ? allEmployees.filter((e) => e.user?.department && e.user.department.toLowerCase().includes(filterDept.toLowerCase()))
        : allEmployees;

      return {
        type: "department_employees",
        department: filterDept || "All Departments",
        totalEmployees: matched.length,
        employees: matched.map((e) => ({
          id: e.id,
          code: e.employeeIdCode,
          name: e.user.name,
          email: e.user.email,
          department: e.user.department,
          designation: e.user.designation || "Staff",
        })),
      };
    },
  },
};
`;
  tools = tools.trimEnd();
  if (tools.endsWith("};")) {
    tools = tools.slice(0, -2) + toolEntry;
  }
}

fs.writeFileSync(toolsPath, tools, "utf8");
console.log("✅ tools.ts updated successfully");

// ==========================================
// 2. UPDATE ollamaClient.ts
// ==========================================
const ollamaPath = "d:/ess-os/src/lib/attendance/ai/ollamaClient.ts";
let ollama = fs.readFileSync(ollamaPath, "utf8");

// Fix fallbackDeterministicClassify
const fallbackStart = ollama.indexOf("fallbackDeterministicClassify(prompt: string):");
if (fallbackStart !== -1) {
  const pConstIdx = ollama.indexOf("const p = prompt.toLowerCase().trim();", fallbackStart);
  const nextSectionIdx = ollama.indexOf("// 1. Incomplete checkout", pConstIdx);

  if (pConstIdx !== -1 && nextSectionIdx !== -1) {
    const newRouting = `const p = prompt.toLowerCase().trim();

    // 0a. Department employees / Headcount / Roster (e.g. "how many employee in sales", "who works in engineering", "list sales employees")
    // NOTE: If the query explicitly asks for attendance status (present / absent / late / punch), route to attendance tools instead!
    const isAttendanceStatusQuery = p.includes("present") || p.includes("absent") || p.includes("late") || p.includes("punch") || p.includes("clock");

    const isEmployeeCountOrRosterQuery = !isAttendanceStatusQuery && (
      p.includes("how many employee") ||
      p.includes("how many employees") ||
      p.includes("how many staff") ||
      p.includes("how many people") ||
      p.includes("how many person") ||
      p.includes("employee count") ||
      p.includes("headcount") ||
      p.includes("who is in") ||
      p.includes("who works in") ||
      p.includes("list employee") ||
      p.includes("list employees") ||
      p.includes("team members") ||
      p.includes("department members") ||
      ((p.includes("employee") || p.includes("employees") || p.includes("staff")) &&
       (p.includes("sales") || p.includes("engineering") || p.includes("design") || p.includes("quality") || p.includes("management")))
    );

    if (isEmployeeCountOrRosterQuery) {
      let dept: string | undefined;
      if (p.includes("sales")) dept = "Sales";
      else if (p.includes("engineering") || p.includes("tech")) dept = "Engineering";
      else if (p.includes("design") || p.includes("ui/ux")) dept = "Design";
      else if (p.includes("management") || p.includes("exec")) dept = "Management";
      else if (p.includes("quality") || p.includes("qa")) dept = "Quality Assurance";

      return {
        toolName: "get_department_employees",
        arguments: dept ? { department: dept } : {},
        reasoning: \`Matched department employee count query\${dept ? \` for \${dept}\` : ""}\`,
      };
    }

    // 0b. Sales & CRM Performance (ONLY when explicitly querying performance, deals, pipeline, or top rankings)
    if (
      p.includes("sales performance") ||
      p.includes("top salesperson") ||
      p.includes("top sales performer") ||
      p.includes("best in sales") ||
      p.includes("best person in sales") ||
      p.includes("who is the best in sales") ||
      p.includes("top sales") ||
      p.includes("highest sales") ||
      p.includes("sales revenue") ||
      p.includes("deals won") ||
      p.includes("sales pipeline") ||
      p.includes("sales leaderboard") ||
      p.includes("sales ranking")
    ) {
      return {
        toolName: "get_sales_performance",
        arguments: {},
        reasoning: "Matched query for sales performance and top salesperson",
      };
    }

    // 0c. PDF / Report generation
    if (p.includes("pdf") || p.includes("generate report") || p.includes("download report") || p.includes("export report") || p.includes("attendance report") || p.includes("attendance pdf")) {
      return {
        toolName: "generate_attendance_report",
        arguments: {},
        reasoning: "Matched query for generating attendance PDF report",
      };
    }

    `;

    ollama = ollama.slice(0, pConstIdx) + newRouting + ollama.slice(nextSectionIdx);
  }
}

// Update department attendance matching
const deptBlockIdx = ollama.indexOf('// 3. Department attendance');
if (deptBlockIdx !== -1) {
  const deptIfIdx = ollama.indexOf('if (', deptBlockIdx);
  const myAttIdx = ollama.indexOf('// 4. Personal attendance', deptIfIdx);
  if (deptIfIdx !== -1 && myAttIdx !== -1) {
    const newDeptBlock = `if (
      p.includes("department") ||
      p.includes("sales dept") ||
      p.includes("engineering dept") ||
      p.includes("design dept") ||
      (p.includes("attendance") && (p.includes("engineering") || p.includes("sales") || p.includes("design") || p.includes("management") || p.includes("quality")))
    ) {
      let dept: string | undefined;
      if (p.includes("sales")) dept = "Sales";
      else if (p.includes("engineering") || p.includes("tech")) dept = "Engineering";
      else if (p.includes("design") || p.includes("ui/ux")) dept = "Design";
      else if (p.includes("management") || p.includes("exec")) dept = "Management";
      else if (p.includes("quality") || p.includes("qa")) dept = "Quality Assurance";

      return {
        toolName: "get_department_attendance_summary",
        arguments: dept ? { departmentId: dept } : {},
        reasoning: \`Matched department summary query\${dept ? \` for \${dept}\` : ""}\`,
      };
    }

    `;
    ollama = ollama.slice(0, deptIfIdx) + newDeptBlock + ollama.slice(myAttIdx);
  }
}

fs.writeFileSync(ollamaPath, ollama, "utf8");
console.log("✅ ollamaClient.ts refined successfully");
