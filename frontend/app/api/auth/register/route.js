import { NextResponse } from "next/server";
import { authStore } from "@/lib/db/authStore";
import { signSessionToken, createSessionCookie } from "@/lib/auth/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, organizationName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { user, organization, orgRole } = await authStore.register({
      email,
      password,
      name,
      organizationName,
    });

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: organization.id,
      orgRole,
    });

    const response = NextResponse.json({
      success: true,
      user,
      organization,
      orgRole,
    });

    response.headers.set("Set-Cookie", createSessionCookie(token));
    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
