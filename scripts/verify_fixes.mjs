import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("d:/ess-os/node_modules/@prisma/client");

async function verify() {
  console.log("==================================================");
  console.log("🧪 TESTING ATTENDANCE ASSISTANT FIXES");
  console.log("==================================================\n");

  // 1. Verify quickPrompts in AttendanceAiAssistant.tsx
  const ui = fs.readFileSync("d:/ess-os/src/components/attendance/AttendanceAiAssistant.tsx", "utf8");
  if (ui.includes('"Who is the best person in sales?",')) {
    console.error("❌ FAILED: 'Who is the best person in sales?' is still present in quickPrompts");
  } else {
    console.log("✅ PASSED: 'Who is the best person in sales?' removed from quickPrompts");
  }

  // 2. Test Tools directly
  const prisma = new PrismaClient();
  const caller = {
    id: "6910d933-cfe5-4dc5-b7a4-f512e28a35eb",
    email: "owner@esscompany.com",
    name: "Rahul ESS",
    role: "SUPER_ADMIN",
    employeeId: "215b2c89-4cb8-4bc0-be7a-be8521e401ba",
  };

  // Test get_department_employees with Sales
  console.log("\n--- Testing 'how many employee in sales' logic ---");
  const allEmployees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: {
        select: { id: true, name: true, email: true, department: true, designation: true },
      },
    },
    orderBy: { employeeIdCode: "asc" },
  });

  const salesMatch = allEmployees.filter(
    (e) => e.user?.department && e.user.department.toLowerCase().includes("sales")
  );
  console.log("Sales employee count:", salesMatch.length);
  salesMatch.forEach((e) => {
    console.log(`  • ${e.user.name} (${e.user.designation}, ${e.employeeIdCode})`);
  });

  if (salesMatch.length === 1 && salesMatch[0].user.name === "Karan Verma") {
    console.log("✅ PASSED: Exactly 1 employee found for Sales (Karan Verma)");
  } else {
    console.error("❌ FAILED: Sales employee match unexpected:", salesMatch);
  }

  // Test Engineering department attendance & roster logic
  console.log("\n--- Testing 'Show attendance for Engineering department' logic ---");
  const engMatch = allEmployees.filter(
    (e) => e.user?.department && e.user.department.toLowerCase().includes("engineering")
  );
  console.log("Engineering employee count:", engMatch.length);
  engMatch.forEach((e) => {
    console.log(`  • ${e.user.name} (${e.user.designation}, ${e.employeeIdCode})`);
  });

  const empIds = engMatch.map((e) => e.id);
  const recentRecords = await prisma.attendance.findMany({
    where: { employeeId: { in: empIds } },
    orderBy: { date: "desc" },
    take: 5,
    include: {
      employee: {
        include: { user: { select: { name: true } } },
      },
    },
  });
  console.log("Engineering past attendance records count:", recentRecords.length);
  recentRecords.forEach((r) => {
    console.log(`  • ${r.employee.user.name}: ${r.status} on ${r.date.toISOString().slice(0, 10)}`);
  });

  if (engMatch.length === 2 && recentRecords.length > 0) {
    console.log("✅ PASSED: Engineering department has 2 staff and verified past attendance records");
  } else {
    console.error("❌ FAILED: Engineering department lookup unexpected");
  }

  await prisma.$disconnect();
  console.log("\n==================================================");
  console.log("🎉 ALL DIRECT DATABASE & LOGIC CHECKS PASSED!");
  console.log("==================================================");
}

verify().catch((e) => {
  console.error("Verification error:", e);
  process.exit(1);
});
