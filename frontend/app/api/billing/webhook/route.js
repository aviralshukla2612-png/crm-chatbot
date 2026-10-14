import { NextResponse } from "next/server";
import { billingService } from "@/lib/billing/billingService";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    // 1. Verify HMAC SHA-256 signature against raw unparsed body
    const isValid = billingService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[BILLING_WEBHOOK_REJECTED] Invalid signature received.");
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // 2. Parse JSON payload safely
    const event = JSON.parse(rawBody);

    // 3. Process subscription event idempotently
    const result = await billingService.processWebhookEvent(event);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error("[BILLING_WEBHOOK_ERR]", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
