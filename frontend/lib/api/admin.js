import {
  mockPlatformUsage,
  mockSystemHealth,
  mockOrganizations,
  mockBots,
  mockConversations,
  mockLeads,
} from "@/lib/mock/data";

let orgsStore = [...mockOrganizations];

export const adminApi = {
  async getPlatformOverview() {
    return {
      usage: mockPlatformUsage,
      systemHealth: mockSystemHealth,
      organizations: orgsStore,
      bots: mockBots,
      conversations: mockConversations,
      leads: mockLeads,
    };
  },

  async toggleOrgStatus(orgId) {
    const org = orgsStore.find((o) => o.id === orgId);
    if (org) {
      org.status = org.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    }
    return org;
  },
};
