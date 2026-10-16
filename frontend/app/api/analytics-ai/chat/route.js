import { NextResponse } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/auth/guard";
import { AnalyticsChatRequestSchema } from "@/lib/analytics/schemas";
import { AnalyticsOrchestrator } from "@/lib/analytics/orchestrator";

export async function POST(request) {
  try {
    // 1. Session Authentication & Tenant Scope
    const principal = await getAuthenticatedPrincipal(request);
    if (!principal || !principal.authenticated) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED: Access requires an active user session." },
        { status: 401 }
      );
    }

    // 2. Request Payload Validation
    const body = await request.json().catch(() => ({}));
    const parseResult = AnalyticsChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_FAILED",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { message, conversationId, clarificationSelection } = parseResult.data;
    const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";

    // 3. Execute Orchestrator Pipeline
    const result = await AnalyticsOrchestrator.processQuery({
      principal,
      message,
      conversationId,
      clarificationSelection,
      clientIp,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("[ANALYTICS_AI_CHAT_ERROR]", err);
    const status = err.message.startsWith("FORBIDDEN") ? 403 : 500;
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An unexpected error occurred during analytics processing.",
      },
      { status }
    );
  }
}
