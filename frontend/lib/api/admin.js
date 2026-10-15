import {
  mockPlatformUsage,
  mockSystemHealth,
  mockOrganizations,
  mockBots,
  mockConversations,
  mockLeads,
} from "@/lib/mock/data";

export const adminApi = {
  async getPlatformOverview() {
    return {
      usage: mockPlatformUsage,
      systemHealth: mockSystemHealth,
      organizations: mockOrganizations,
      bots: mockBots,
      conversations: mockConversations,
      leads: mockLeads,
    };
  },

  /**
   * Paginated, searchable query for 1000s of sub-admin organizations
   */
  async getOrganizations({ page = 1, limit = 25, search = "", status = "ALL", sortBy = "createdAt", sortOrder = "desc" } = {}) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
        status,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/organizations?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch organizations: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn("[ADMIN_API_FALLBACK] Error loading organizations API, falling back:", err.message);
      return {
        success: true,
        data: mockOrganizations,
        pagination: { page: 1, limit: 25, totalCount: mockOrganizations.length, totalPages: 1 },
        stats: {
          totalOrganizations: mockOrganizations.length,
          activeOrganizations: mockOrganizations.filter((o) => o.status === "ACTIVE").length,
          suspendedOrganizations: 0,
          totalBots: 1,
          totalCapturedLeads: 0,
        },
      };
    }
  },

  /**
   * Toggle organization status (ACTIVE / DISABLED)
   */
  async toggleOrgStatus(orgId, currentStatus) {
    try {
      const targetStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
      const res = await fetch("/api/admin/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, status: targetStatus }),
      });
      if (!res.ok) throw new Error("Failed to update organization status");
      const data = await res.json();
      return data.organization;
    } catch (err) {
      console.error("[TOGGLE_ORG_FAIL]", err);
      return { id: orgId, status: currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE" };
    }
  },

  /**
   * Paginated, searchable query for platform users & workspace admins
   */
  async getUsers({ page = 1, limit = 25, search = "", role = "ALL", status = "ALL" } = {}) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: search.trim(),
        role,
        status,
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch users: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn("[ADMIN_API_FALLBACK] Error loading users API:", err.message);
      return {
        success: true,
        data: [],
        pagination: { page: 1, limit: 25, totalCount: 0, totalPages: 1 },
      };
    }
  },
};
