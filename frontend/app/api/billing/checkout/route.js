import { NextResponse } from "next/server";
import { requireOrgRole, ROLES } from "@/lib/auth/guard";
import { billingService } from "@/lib/billing/billingService";

export async function POST(request) {
  try {
    const auth = await requireOrgRole(request, [ROLES.ORG_OWNER, ROLES.ORG_ADMIN]);
    if (!auth.ok) return auth.response;

    const { principal } = auth;
    const body = await request.json().catch(() => ({}));
    const { planId = "GROWTH" } = body;

    const checkout = await billingService.createSubscriptionCheckout({
      organizationId: principal.organizationId,
      planId,
      customerEmail: principal.email,
    });

    return NextResponse.json({
      success: true,
      checkout,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
