import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("d:/ess-os/node_modules/@prisma/client");

async function check() {
  const prisma = new PrismaClient();
  const allUsers = await prisma.user.findMany();
  console.log("Users:", allUsers.map(u => ({ id: u.id, name: u.name, email: u.email })));

  const allEmployees = await prisma.employee.findMany({ include: { user: true } });
  console.log("Employees:", allEmployees.map(e => ({ id: e.id, code: e.employeeIdCode, name: e.user?.name })));

  await prisma.$disconnect();
}
check().catch(console.error);
