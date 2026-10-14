import { NextResponse } from "next/server";

function decodeEdgeSession(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let rawPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (rawPayload.length % 4) {
      rawPayload += "=";
    }
    const jsonStr = atob(rawPayload);
    const payload = JSON.parse(jsonStr);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Skip public assets and public endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/widget.js") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/api/billing/webhook") ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/preview")
  ) {
    return NextResponse.next();
  }

  // 2. Extract and decode session cookie (Edge-compatible)
  const sessionCookie = request.cookies.get("ess_session")?.value;
  const session = sessionCookie ? decodeEdgeSession(sessionCookie) : null;

  // 3. Protect /dashboard and /dashboard/*
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 4. Protect /admin and /admin/* (Super Admin Only)
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "SUPER_ADMIN") {
      // Forbidden: redirect regular tenant to dashboard
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "unauthorized_admin");
      return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
