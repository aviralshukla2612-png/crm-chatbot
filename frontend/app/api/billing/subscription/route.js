import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { billingService } from "@/lib/billing/billingService";
import { quotaGuard, getCurrentPeriodKey } from "@/lib/billing/quotaGuard";
import { getPlan, PLANS } from "@/lib/billing/plans";

export async function GET(request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { principal } = auth;
    const subscription = await billingService.getSubscription(principal.organizationId);
    const plan = getPlan(subscription?.planId);
    const periodKey = getCurrentPeriodKey();

    const messagesUsed = await quotaGuard.getOrganizationUsage(principal.organizationId, "message", periodKey);
    const pagesCrawled = await quotaGuard.getOrganizationUsage(principal.organizationId, "crawl_page", periodKey);

    return NextResponse.json({
      success: true,
      subscription: {
        ...subscription,
        plan,
      },
      usage: {
        periodKey,
        messages: {
          used: messagesUsed,
          limit: plan.maxMessagesPerMonth,
          percentage: Math.min(100, Math.round((messagesUsed / plan.maxMessagesPerMonth) * 100)),
        },
        knowledgePages: {
          used: pagesCrawled,
          limit: plan.maxKnowledgePages,
          percentage: Math.min(100, Math.round((pagesCrawled / plan.maxKnowledgePages) * 100)),
        },
      },
      availablePlans: Object.values(PLANS),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
