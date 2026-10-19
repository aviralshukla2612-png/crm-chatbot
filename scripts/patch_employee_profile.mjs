import fs from "fs";

// ==========================================
// 1. UPDATE tools.ts to add get_employee_profile
// ==========================================
const toolsPath = "d:/ess-os/src/lib/attendance/ai/tools.ts";
let tools = fs.readFileSync(toolsPath, "utf8");

if (!tools.includes("get_employee_profile: {")) {
  const profileTool = `  get_employee_profile: {
    name: "get_employee_profile",
    description: "Look up an employee or team member profile by name, email, or employee code (e.g. who is Dev Patel, who is Aviral Shukla).",
    parameters: z.object({
      name: z.string().optional().describe("Employee name or query string"),
      employeeId: z.string().optional().describe("Employee code or ID"),
    }),
    requiresAdmin: false,
    execute: async (args, caller) => {
      const searchStr = (args.name || args.employeeId || "").trim().toLowerCase();

      // Check if querying self
      const isSelf =
        searchStr === "me" ||
        searchStr === "my" ||
        searchStr === "myself" ||
        (caller.name && searchStr.includes(caller.name.toLowerCase())) ||
        (caller.email && searchStr.includes(caller.email.toLowerCase()));

      const allUsers = await prisma.user.findMany({
        include: {
          employeeProfile: true,
        },
      });

      let matchedUser = null;

      if (isSelf) {
        matchedUser = allUsers.find((u) => u.id === caller.id || u.email === caller.email);
      }

      if (!matchedUser && searchStr) {
        // Try exact/partial match on user name or email or employee code
        matchedUser = allUsers.find((u) => {
          const userName = (u.name || "").toLowerCase();
          const userEmail = (u.email || "").toLowerCase();
          const empCode = (u.employeeProfile?.employeeIdCode || "").toLowerCase();
          return (
            userName.includes(searchStr) ||
            searchStr.includes(userName) ||
            userEmail.includes(searchStr) ||
            (empCode && (empCode.includes(searchStr) || searchStr.includes(empCode)))
          );
        });
      }

      // If still not found, check partial name token matches (e.g. "aviral" in "Aviral Shukla")
      if (!matchedUser && searchStr) {
        const tokens = searchStr.split(/\\s+/).filter((t) => t.length > 2);
        matchedUser = allUsers.find((u) => {
          const userName = (u.name || "").toLowerCase();
          return tokens.some((t) => userName.includes(t));
        });
      }

      if (!matchedUser) {
        return {
          type: "employee_profile",
          found: false,
          searchTerm: args.name || args.employeeId,
          callerName: caller.name,
        };
      }

      // Found user! Check today's attendance if they have employee profile
      let todayRecord = null;
      if (matchedUser.employeeProfile?.id) {
        const todayDate = getISTDateString();
        const { startOfDay, endOfDay } = getISTDayRange(todayDate);
        todayRecord = await prisma.attendance.findFirst({
          where: {
            employeeId: matchedUser.employeeProfile.id,
            date: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { date: "desc" },
        });
      }

      return {
        type: "employee_profile",
        found: true,
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          email: matchedUser.email,
          department: matchedUser.department,
          designation: matchedUser.designation,
          role: matchedUser.activeRole,
          employeeCode: matchedUser.employeeProfile?.employeeIdCode || "N/A",
          todayStatus: todayRecord ? todayRecord.status : "NOT_CHECKED_IN",
          punchIn: todayRecord?.punchIn ? formatTimeIST(todayRecord.punchIn) : null,
          punchOut: todayRecord?.punchOut ? formatTimeIST(todayRecord.punchOut) : null,
        },
        isSelf: matchedUser.id === caller.id,
      };
    },
  },
};
`;

  tools = tools.trimEnd();
  if (tools.endsWith("};")) {
    tools = tools.slice(0, -2) + profileTool;
    fs.writeFileSync(toolsPath, tools, "utf8");
    console.log("✅ Added get_employee_profile to tools.ts");
  }
} else {
  console.log("get_employee_profile already present in tools.ts");
}

// ==========================================
// 2. UPDATE ollamaClient.ts to route "who is [name]"
// ==========================================
const ollamaPath = "d:/ess-os/src/lib/attendance/ai/ollamaClient.ts";
let ollama = fs.readFileSync(ollamaPath, "utf8");

// Add who-is router rule before employee code rule
if (!ollama.includes('toolName: "get_employee_profile"')) {
  const whoIsBlock = `    // Specific employee query: "who is [name]", "profile of [name]", "tell me about [name]"
    const isWhoIsQuery =
      p.startsWith("who is ") ||
      p.startsWith("who's ") ||
      p.startsWith("who are ") ||
      p.startsWith("tell me about ") ||
      p.startsWith("profile of ");

    if (isWhoIsQuery) {
      const targetName = p
        .replace(/^(who is|who's|who are|tell me about|profile of)\\s+/i, "")
        .replace(/[?.,!]/g, "")
        .trim();

      if (
        !targetName.includes("in sales") &&
        !targetName.includes("best in sales") &&
        !targetName.includes("the best") &&
        !targetName.includes("in engineering") &&
        !targetName.includes("in design") &&
        targetName.length > 0
      ) {
        return {
          toolName: "get_employee_profile",
          arguments: { name: targetName },
          reasoning: \`Matched employee profile lookup for \${targetName}\`,
        };
      }
    }

`;

  const empCodeTarget = "// 6. Specific employee query (e.g. \"EMP-002\" or employee name)";
  ollama = ollama.replace(empCodeTarget, whoIsBlock + empCodeTarget);
}

// Add get_employee_profile explanation to synthesizeDeterministicExplanation
if (!ollama.includes('case "get_employee_profile":')) {
  const synthTarget = "switch (toolName) {";
  const profileCase = `switch (toolName) {
      case "get_employee_profile": {
        if (!result.found) {
          return \`ℹ️ No employee or team member matching "**\${result.searchTerm}**" was found in the company database.\`;
        }
        const u = result.user;
        const prefix = result.isSelf ? \`👤 **You (\${u.name}):**\` : \`👤 **\${u.name}:**\`;
        let text = \`\${prefix}\\n\\n\`;
        text += \`• **Designation:** \${u.designation || "Staff"}\\n\`;
        text += \`• **Department:** \${u.department || "General"}\\n\`;
        text += \`• **Employee Code:** \${u.employeeCode}\\n\`;
        text += \`• **Email:** \${u.email}\\n\`;
        if (u.todayStatus === "PRESENT") {
          text += \`• **Today's Status:** ✅ Present (Punched in at \${u.punchIn || "Morning"})\`;
        } else {
          text += \`• **Today's Status:** ⏳ Not checked in today\`;
        }
        return text;
      }
`;
  ollama = ollama.replace(synthTarget, profileCase);
}

fs.writeFileSync(ollamaPath, ollama, "utf8");
console.log("✅ Updated ollamaClient.ts with employee profile lookup");

// ==========================================
// 3. UPDATE orchestrator.ts
// ==========================================
const orchPath = "d:/ess-os/src/lib/attendance/ai/orchestrator.ts";
let orch = fs.readFileSync(orchPath, "utf8");

if (!orch.includes('rawResult.type === "employee_profile"')) {
  const profileMetricBlock = `} else if (rawResult.type === "employee_profile" && rawResult.found && rawResult.user) {
      const u = rawResult.user;
      metrics = [
        { label: "Designation", value: u.designation || "Staff", color: "indigo" },
        { label: "Department", value: u.department || "General", color: "blue" },
        { label: "Today's Status", value: u.todayStatus === "PRESENT" ? "Present" : "Not Checked In", color: u.todayStatus === "PRESENT" ? "emerald" : "amber" },
      ];
      table = [
        {
          Name: u.name,
          Role: u.designation,
          Department: u.department,
          Code: u.employeeCode,
          Email: u.email,
          Today: u.todayStatus === "PRESENT" ? \`In: \${u.punchIn}\` : "Not Checked In",
        },
      ];
    `;

  const targetInsertion = '} else if (rawResult.type === "department_employees") {';
  orch = orch.replace(targetInsertion, profileMetricBlock + targetInsertion);
  fs.writeFileSync(orchPath, orch, "utf8");
  console.log("✅ Updated orchestrator.ts with employee profile structured data");
}

// ==========================================
// 4. UPDATE AttendanceAiAssistant.tsx
// ==========================================
const uiPath = "d:/ess-os/src/components/attendance/AttendanceAiAssistant.tsx";
let ui = fs.readFileSync(uiPath, "utf8");

if (!ui.includes('msg.data?.type === "employee_profile"')) {
  const profileCard = `{/* PREMIUM STRUCTURED UI: Employee Profile Card */}
                  {msg.data?.type === "employee_profile" && msg.data?.found && msg.data?.user && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3 font-sans">
                      <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-indigo-800/50 pb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/30">
                            {msg.data.user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{msg.data.user.name}</span>
                              {msg.data.isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">You</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {msg.data.user.designation} • {msg.data.user.department}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {msg.data.user.employeeCode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={\`w-2 h-2 rounded-full \${
                              msg.data.user.todayStatus === "PRESENT" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }\`}
                          />
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {msg.data.user.todayStatus === "PRESENT" ? \`Present (In: \${msg.data.user.punchIn})\` : "Not checked in today"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                          {msg.data.user.email}
                        </span>
                      </div>
                    </div>
                  )}

                  `;

  const targetUiInsert = '{/* PREMIUM STRUCTURED UI: Department Roster / Employee Count */}';
  ui = ui.replace(targetUiInsert, profileCard + targetUiInsert);
  fs.writeFileSync(uiPath, ui, "utf8");
  console.log("✅ Updated AttendanceAiAssistant.tsx with profile card");
}
