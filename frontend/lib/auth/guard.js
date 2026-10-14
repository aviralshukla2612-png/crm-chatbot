/**
 * Centralized API Authentication & Tenant Authorization Guard
 * Enforces authenticated identity, session tokens, API keys, and RBAC on every private endpoint.
 */

import { NextResponse } from "next/server.js";
import { parseCookies, verifySessionToken } from "./session.js";
import { authStore } from "../db/authStore.js";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_OWNER: "ORG_OWNER",
  ORG_ADMIN: "ORG_ADMIN",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
};

/**
 * Extract authenticated session or API key from Next.js Request.
 */
export async function getAuthenticatedPrincipal(request) {
  // 1. Check Cookie: ess_session
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies.ess_session;

  if (sessionToken) {
    const session = verifySessionToken(sessionToken);
    if (session) {
      // Allow caller to switch active organization via X-Organization-Id header if they are a member
      const requestedOrgId = request.headers.get("x-organization-id");
      let activeOrgId = session.organizationId;
      let activeOrgRole = session.orgRole;

      if (requestedOrgId && requestedOrgId !== activeOrgId) {
        const membership = await authStore.verifyOrgMembership(session.userId, requestedOrgId);
        if (membership) {
          activeOrgId = requestedOrgId;
          activeOrgRole = membership.role;
        }
      }

      return {
        authenticated: true,
        type: "session",
        userId: session.userId,
        email: session.email,
        platformRole: session.role,
        organizationId: activeOrgId,
        orgRole: activeOrgRole,
      };
    }
  }

  // 2. Check Bearer Authorization Header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();

    // Check if it's an API Key
    if (bearer.startsWith("ess_live_")) {
      const apiKey = await authStore.verifyApiKey(bearer);
      if (apiKey) {
        return {
          authenticated: true,
          type: "apiKey",
          userId: `apikey_${apiKey.id}`,
          email: "service-account@api",
          platformRole: "MEMBER",
          organizationId: apiKey.organizationId,
          orgRole: apiKey.role || "MEMBER",
        };
      }
    }

    // Otherwise test if bearer is a session token
    const session = verifySessionToken(bearer);
    if (session) {
      return {
        authenticated: true,
        type: "session",
        userId: session.userId,
        email: session.email,
        platformRole: session.role,
        organizationId: session.organizationId,
        orgRole: session.orgRole,
      };
    }
  }

  // 3. Check X-API-Key Header
  const rawApiKey = request.headers.get("x-api-key");
  if (rawApiKey && rawApiKey.startsWith("ess_live_")) {
    const apiKey = await authStore.verifyApiKey(rawApiKey);
    if (apiKey) {
      return {
        authenticated: true,
        type: "apiKey",
        userId: `apikey_${apiKey.id}`,
        email: "service-account@api",
        platformRole: "MEMBER",
        organizationId: apiKey.organizationId,
        orgRole: apiKey.role || "MEMBER",
      };
    }
  }

  return { authenticated: false };
}

/**
 * Guard: Requires any valid authenticated session or API key.
 * Returns { ok: true, principal } OR { ok: false, response: NextResponse }
 */
export async function requireAuth(request) {
  const principal = await getAuthenticatedPrincipal(request);
  if (!principal.authenticated) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Valid session cookie or Bearer token is required.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }
  return { ok: true, principal };
}

/**
 * Guard: Requires organization membership with specific role(s).
 */
export async function requireOrgRole(request, allowedRoles = [ROLES.ORG_OWNER, ROLES.ORG_ADMIN]) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  const { principal } = auth;
  // Super Admins always pass
  if (principal.platformRole === ROLES.SUPER_ADMIN || principal.orgRole === ROLES.SUPER_ADMIN) {
    return { ok: true, principal };
  }

  if (!allowedRoles.includes(principal.orgRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: `Forbidden. This operation requires one of: ${allowedRoles.join(", ")}. Current role: ${principal.orgRole}`,
          code: "FORBIDDEN_INSUFFICIENT_ROLE",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, principal };
}

/**
 * Guard: Requires platform SUPER_ADMIN role.
 */
export async function requireSuperAdmin(request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  const { principal } = auth;
  if (principal.platformRole !== ROLES.SUPER_ADMIN && principal.orgRole !== ROLES.SUPER_ADMIN) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden. This administrative operation requires platform SUPER_ADMIN privileges.",
          code: "FORBIDDEN_SUPER_ADMIN_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, principal };
}
