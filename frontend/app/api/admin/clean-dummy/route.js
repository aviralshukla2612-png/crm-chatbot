import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { queryDb } from "@/lib/db/dbPool";
import { leadsStore } from "@/lib/db/leadsStore";
import { conversationsStore } from "@/lib/db/conversationsStore";
import fs from "fs";
import path from "path";

export async function POST(request) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    // 1. Clean PostgreSQL database (Bots, Organizations, Leads, Conversations)
    const dbRes = await queryDb(`
      DELETE FROM "Bot" 
      WHERE ("name" ILIKE '%Assistant%' AND "id" != 'bot_aa')
         OR ("name" ILIKE '%Sub Admin%')
         OR ("name" ILIKE '%Super Admin%')
         OR ("name" ILIKE '%Workspace Administrator%')
         OR ("organizationId" NOT IN ('org_ess_01', 'org_ess_default') AND "name" LIKE '%Assistant%');

      DELETE FROM "Organization" 
      WHERE "id" NOT IN ('org_ess_01', 'org_ess_default')
        AND ("name" ILIKE '%Sub Admin%' OR "name" ILIKE '%Super Admin%' OR "name" ILIKE '%Workspace Administrator%');

      DELETE FROM "Lead"
      WHERE "name" IN ('VIP Buyer', 'Dr. Ramesh', 'Principal Sharma', 'Siddharth Mehta', 'Rohan Patel')
         OR "email" LIKE '%@eval.test%'
         OR "email" LIKE '%@example.com%'
         OR "email" LIKE '%@corp.in%';

      DELETE FROM "Conversation"
      WHERE "id" LIKE 'sim_%'
         OR "id" LIKE 'test_%'
         OR "id" LIKE 'c_eval_%'
         OR "id" LIKE 'conv_medical_%'
         OR "visitorName" IN ('Patient John Doe', 'Test Prospect');

      UPDATE "User" 
      SET "name" = 'Emperor Smart Solution', "role" = 'SUPER_ADMIN' 
      WHERE "email" = 'admin@emperorsmartsolutions.com';
    `);

    // 2. Clean JSON file: bots.json
    const cleanJsonFile = (filename, filterFn) => {
      const p1 = path.join(process.cwd(), "frontend", "data", filename);
      const p2 = path.join(process.cwd(), "data", filename);
      const target = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
      if (target) {
        try {
          const raw = fs.readFileSync(target, "utf8");
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const cleaned = list.filter(filterFn);
            fs.writeFileSync(target, JSON.stringify(cleaned, null, 2), "utf8");
          }
        } catch (e) {
          console.warn(`Could not clean ${filename}:`, e.message);
        }
      }
    };

    cleanJsonFile("bots.json", (b) => b.id === "bot_aa" || !b.name?.toLowerCase().includes("assistant"));
    
    cleanJsonFile("leads.json", (l) => {
      const dummyNames = ["VIP Buyer", "Dr. Ramesh", "Principal Sharma", "Siddharth Mehta", "Rohan Patel"];
      const isDummyEmail = l.email?.includes("@eval.test") || l.email?.includes("@example.com") || l.email?.includes("@corp.in");
      return !dummyNames.includes(l.name) && !isDummyEmail;
    });

    cleanJsonFile("conversations.json", (c) => {
      const isTestId = c.id?.startsWith("sim_") || c.id?.startsWith("test_") || c.id?.startsWith("c_eval_") || c.id?.startsWith("conv_medical_");
      const isDummyVisitor = c.visitorName === "Patient John Doe" || c.visitorName === "Test Prospect";
      return !isTestId && !isDummyVisitor;
    });

    return NextResponse.json({
      success: true,
      message: "Successfully purged all legacy dummy test bots, organizations, test leads, and test conversations.",
      dbResult: dbRes.rowCount,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
