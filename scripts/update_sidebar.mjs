import fs from "fs";

const sidebarPath = "d:/ess-os/src/components/layout/Sidebar.tsx";
let code = fs.readFileSync(sidebarPath, "utf8");

// 1. In ownerItems, add after attendance item
const ownerAttendanceNeedle = '{ id: "attendance", title: "Attendance", href: "/attendance", icon: <Clock className="w-4 h-4" /> },';
const ownerAttendanceReplacement = `{ id: "attendance", title: "Attendance", href: "/attendance", icon: <Clock className="w-4 h-4" /> },
      { id: "attendance-assistant", title: "Attendance AI", href: "/attendance-assistant", icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },`;

if (!code.includes('href: "/attendance-assistant"') && code.includes(ownerAttendanceNeedle)) {
  code = code.replace(ownerAttendanceNeedle, ownerAttendanceReplacement);
}

// 2. In SUB_ADMIN delegatedAdminPerms
const subAdminNeedle = '{ id: "attendance", title: "Team Attendance", href: "/attendance?view=team", icon: <Clock className="w-4 h-4" /> },';
const subAdminReplacement = `{ id: "attendance", title: "Team Attendance", href: "/attendance?view=team", icon: <Clock className="w-4 h-4" /> },
          { id: "attendance-assistant", title: "Attendance AI", href: "/attendance-assistant", icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },`;

if (code.includes(subAdminNeedle)) {
  code = code.replace(subAdminNeedle, subAdminReplacement);
}

// 3. In EMPLOYEE personal tools
const empNeedle = '{ title: "My Work Sessions", href: "/attendance", icon: <Clock className="w-4 h-4" /> },';
const empReplacement = `{ title: "My Work Sessions", href: "/attendance", icon: <Clock className="w-4 h-4" /> },
          { title: "Attendance AI", href: "/attendance-assistant", icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },`;

if (code.includes(empNeedle)) {
  code = code.replace(empNeedle, empReplacement);
}

fs.writeFileSync(sidebarPath, code, "utf8");
console.log("Updated Sidebar.tsx successfully.");
