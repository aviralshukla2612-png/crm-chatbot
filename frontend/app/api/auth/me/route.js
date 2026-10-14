import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { authStore } from "@/lib/db/authStore";

export async function GET(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { principal } = auth;
  const user = await authStore.getUserById(principal.userId);
  const memberships = await authStore.getUserMemberships(principal.userId);

  return NextResponse.json({
    success: true,
    user: {
      id: principal.userId,
      email: principal.email,
      name: user?.name || principal.email.split("@")[0],
      role: principal.platformRole,
    },
    activeOrganizationId: principal.organizationId,
    activeOrgRole: principal.orgRole,
    memberships,
  });
}
