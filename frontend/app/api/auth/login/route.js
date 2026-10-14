import { NextResponse } from "next/server";
import { authStore } from "@/lib/db/authStore";
import { signSessionToken, createSessionCookie } from "@/lib/auth/session";

// Sliding window login attempt rate limiter
const loginAttempts = new Map();

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    const retrySec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retrySec };
  }

  entry.count++;
  loginAttempts.set(ip, entry);
  return { allowed: true };
}

export async function POST(request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${rateCheck.retrySec} seconds.`,
        },
        { status: 429, headers: { "Retry-After": String(rateCheck.retrySec) } }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const authResult = await authStore.login({ email, password });
    const { user, organizationId, orgRole, memberships } = authResult;

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId,
      orgRole,
    });

    const response = NextResponse.json({
      success: true,
      user,
      organizationId,
      orgRole,
      memberships,
    });

    response.headers.set("Set-Cookie", createSessionCookie(token));
    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || "Invalid email or password" },
      { status: 401 }
    );
  }
}
