import fs from "fs";

function checkAttendance(dir) {
  const p1 = dir + "/src/components/attendance/AttendanceAiAssistant.tsx";
  const p2 = dir + "/src/lib/attendance/ai/tools.ts";
  console.log("Checking in:", dir);
  console.log("AttendanceAiAssistant.tsx exists?", fs.existsSync(p1));
  console.log("tools.ts exists?", fs.existsSync(p2));
}

checkAttendance("c:/Users/Aviral Shukla/OneDrive/Desktop/mdz-crm");
