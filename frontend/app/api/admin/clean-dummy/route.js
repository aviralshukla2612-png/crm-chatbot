import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { queryDb } from "@/lib/db/dbPool";
import fs from "fs";
import path from "path";

export async function POST(request) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    // 1. Clean PostgreSQL database
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

      UPDATE "User" 
      SET "name" = 'Emperor Smart Solution', "role" = 'SUPER_ADMIN' 
      WHERE "email" = 'admin@emperorsmartsolutions.com';
    `);

    // 2. Clean JSON file on disk
    const dataPath = path.join(process.cwd(), "frontend", "data", "bots.json");
    const directPath = path.join(process.cwd(), "data", "bots.json");
    const targetFile = fs.existsSync(dataPath) ? dataPath : directPath;

    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, "utf8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const cleaned = list.filter((b) => b.id === "bot_aa" || !b.name?.toLowerCase().includes("assistant"));
          fs.writeFileSync(targetFile, JSON.stringify(cleaned, null, 2), "utf8");
        }
      } catch (e) {
        console.warn("Could not clean bots.json:", e.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully purged all legacy dummy test bots and test organizations.",
      dbResult: dbRes.rowCount,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
