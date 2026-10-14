import { NextResponse } from "next/server";
import { botsStore } from "@/lib/db/botsStore";
import { requireAuth, requireOrgRole, ROLES } from "@/lib/auth/guard";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { principal } = auth;
    const { searchParams } = new URL(request.url);
    const requestedOrg = searchParams.get("organizationId");

    const isSuperAdmin = principal.platformRole === ROLES.SUPER_ADMIN || principal.orgRole === ROLES.SUPER_ADMIN;
    const targetOrgId = isSuperAdmin ? (requestedOrg || null) : principal.organizationId;

    const bots = await botsStore.getBotsAsync(targetOrgId);

    return NextResponse.json({ success: true, bots });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireOrgRole(request, [ROLES.ORG_OWNER, ROLES.ORG_ADMIN]);
    if (!auth.ok) return auth.response;

    const { principal } = auth;
    const body = await request.json();

    // Enforce tenant boundary: bot belongs to caller's organizationId
    body.organizationId = principal.organizationId;
    const bot = botsStore.upsertBot(body, principal.organizationId);

    return NextResponse.json({ success: true, bot });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
