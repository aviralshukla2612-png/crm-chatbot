import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { authStore } from "@/lib/db/authStore";
import { signSessionToken, createSessionCookie } from "@/lib/auth/session";

export async function POST(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { principal } = auth;
  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;

  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: "Target organizationId is required" },
      { status: 400 }
    );
  }

  // Verify membership in target organization
  const membership = await authStore.verifyOrgMembership(principal.userId, organizationId);
  if (!membership && principal.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "Access denied. You are not a member of this organization." },
      { status: 403 }
    );
  }

  const newOrgRole = membership?.role || (principal.platformRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "MEMBER");

  const newToken = signSessionToken({
    userId: principal.userId,
    email: principal.email,
    role: principal.platformRole,
    organizationId,
    orgRole: newOrgRole,
  });

  const response = NextResponse.json({
    success: true,
    activeOrganizationId: organizationId,
    activeOrgRole: newOrgRole,
  });

  response.headers.set("Set-Cookie", createSessionCookie(newToken));
  return response;
}
