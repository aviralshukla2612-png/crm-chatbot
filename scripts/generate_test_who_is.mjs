import fs from "fs";

const testCode = `
import { AttendanceAnalyticsOrchestrator } from "../src/lib/attendance/ai/orchestrator";
import { CurrentUserSession } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

async function main() {
  const caller: CurrentUserSession = {
    id: "6910d933-cfe5-4dc5-b7a4-f512e28a35eb",
    email: "owner@esscompany.com",
    name: "Aviral Shukla",
    role: "OWNER",
    activeRole: "OWNER",
    employeeId: "215b2c89-4cb8-4bc0-be7a-be8521e401ba",
  };

  const queries = [
    "who is aviral shukla",
    "who is dev patel",
    "who is karan verma",
    "who is unknown person",
  ];

  for (const q of queries) {
    console.log("==================================================");
    console.log("QUERY:", q);
    console.log("--------------------------------------------------");
    const res = await AttendanceAnalyticsOrchestrator.processQuestion(q, caller);
    console.log("Tool Used:", res.toolUsed);
    console.log("Explanation:\\n" + res.explanation);
    console.log("Structured Type:", res.data?.type);
    console.log("==================================================\\n");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
`;

fs.writeFileSync("d:/ess-os/scripts/test_who_is.ts", testCode, "utf8");
console.log("Wrote test script");
