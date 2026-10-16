/**
 * Role-Based Access Control (RBAC) & Authorization Policies for Analytics AI
 * Enforces strict enterprise permission boundaries on analytics tools, reports, and data.
 */

export const ANALYTICS_PERMISSIONS = {
  SALES_READ: "analytics:sales_read",
  INVENTORY_READ: "analytics:inventory_read",
  SALESPERSON_READ: "analytics:salesperson_read",
  FINANCIAL_READ: "analytics:financial_read",
  EXPENSES_READ: "analytics:expenses_read",
  REPORT_EXPORT: "analytics:report_export",
};

const ROLE_PERMISSIONS_MAP = {
  SUPER_ADMIN: [
    ANALYTICS_PERMISSIONS.SALES_READ,
    ANALYTICS_PERMISSIONS.INVENTORY_READ,
    ANALYTICS_PERMISSIONS.SALESPERSON_READ,
    ANALYTICS_PERMISSIONS.FINANCIAL_READ,
    ANALYTICS_PERMISSIONS.EXPENSES_READ,
    ANALYTICS_PERMISSIONS.REPORT_EXPORT,
  ],
  ORG_OWNER: [
    ANALYTICS_PERMISSIONS.SALES_READ,
    ANALYTICS_PERMISSIONS.INVENTORY_READ,
    ANALYTICS_PERMISSIONS.SALESPERSON_READ,
    ANALYTICS_PERMISSIONS.FINANCIAL_READ,
    ANALYTICS_PERMISSIONS.EXPENSES_READ,
    ANALYTICS_PERMISSIONS.REPORT_EXPORT,
  ],
  ORG_ADMIN: [
    ANALYTICS_PERMISSIONS.SALES_READ,
    ANALYTICS_PERMISSIONS.INVENTORY_READ,
    ANALYTICS_PERMISSIONS.SALESPERSON_READ,
    ANALYTICS_PERMISSIONS.FINANCIAL_READ,
    ANALYTICS_PERMISSIONS.EXPENSES_READ,
    ANALYTICS_PERMISSIONS.REPORT_EXPORT,
  ],
  MEMBER: [
    ANALYTICS_PERMISSIONS.SALES_READ,
    ANALYTICS_PERMISSIONS.INVENTORY_READ,
    ANALYTICS_PERMISSIONS.SALESPERSON_READ,
    ANALYTICS_PERMISSIONS.REPORT_EXPORT,
  ],
  VIEWER: [
    ANALYTICS_PERMISSIONS.SALES_READ,
    ANALYTICS_PERMISSIONS.INVENTORY_READ,
  ],
};

/**
 * Checks if a given principal has the required permission for an analytics tool or action.
 */
export function hasAnalyticsPermission(principal, requiredPermission) {
  if (!principal || !principal.authenticated) {
    return false;
  }

  // Super admins have universal access across the platform
  if (principal.platformRole === "SUPER_ADMIN") {
    return true;
  }

  const role = principal.orgRole || principal.platformRole || "VIEWER";
  const granted = ROLE_PERMISSIONS_MAP[role] || [];
  return granted.includes(requiredPermission);
}

/**
 * Verifies that a principal is authorized to execute a specific analytics tool.
 */
export function assertToolAuthorization(principal, tool) {
  if (!principal || !principal.authenticated) {
    throw new Error("UNAUTHENTICATED: Analytics access requires a verified session.");
  }

  if (!tool) {
    throw new Error("INVALID_TOOL: Requested analytics tool does not exist.");
  }

  if (tool.requiredPermission && !hasAnalyticsPermission(principal, tool.requiredPermission)) {
    throw new Error(
      `FORBIDDEN: Role '${principal.orgRole || principal.platformRole}' lacks permission '${tool.requiredPermission}' to execute '${tool.name}'.`
    );
  }

  return true;
}
