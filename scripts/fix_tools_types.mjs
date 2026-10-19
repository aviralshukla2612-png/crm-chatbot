import fs from "fs";

const toolsPath = "d:/ess-os/src/lib/attendance/ai/tools.ts";
let tools = fs.readFileSync(toolsPath, "utf8");

// Fix parameter types in get_employee_profile
tools = tools.replace(
  "allUsers.find((u) => u.id === caller.id || u.email === caller.email);",
  "allUsers.find((u: any) => u.id === caller.id || u.email === caller.email);"
);

tools = tools.replace(
  "matchedUser = allUsers.find((u) => {",
  "matchedUser = allUsers.find((u: any) => {"
);

tools = tools.replace(
  "const tokens = searchStr.split(/\\s+/).filter((t) => t.length > 2);",
  "const tokens: string[] = searchStr.split(/\\s+/).filter((t: string) => t.length > 2);"
);

tools = tools.replace(
  "matchedUser = allUsers.find((u) => {",
  "matchedUser = allUsers.find((u: any) => {"
);

tools = tools.replace(
  "return tokens.some((t) => userName.includes(t));",
  "return tokens.some((t: string) => userName.includes(t));"
);

// Also check get_department_employees
tools = tools.replace(
  "allEmployees.filter((e) => e.user?.department",
  "allEmployees.filter((e: any) => e.user?.department"
);

tools = tools.replace(
  "deptEmployees = allEmployees.filter((e) =>",
  "deptEmployees = allEmployees.filter((e: any) =>"
);

fs.writeFileSync(toolsPath, tools, "utf8");
console.log("✅ Fixed TypeScript types in tools.ts");
