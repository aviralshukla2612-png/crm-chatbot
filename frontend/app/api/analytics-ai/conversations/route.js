import { NextResponse } from "next/server";
import { getAuthenticatedPrincipal } from "@/lib/auth/guard";
import { analyticsStore } from "@/lib/db/analyticsStore";

export async function GET(request) {
  try {
    const principal = await getAuthenticatedPrincipal(request);
    if (!principal || !principal.authenticated) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const conversations = await analyticsStore.getConversations(principal.organizationId, principal.userId);
    return NextResponse.json({ success: true, conversations });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
