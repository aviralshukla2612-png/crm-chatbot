export const leadsApi = {
  async getLeads(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "All" && filters.status !== "All Status") {
        params.set("status", filters.status);
      }
      if (filters.score && filters.score !== "All") {
        params.set("score", filters.score);
      }
      if (filters.bot && filters.bot !== "All Bots") {
        params.set("bot", filters.bot);
      }
      if (filters.search) {
        params.set("search", filters.search);
      }

      const res = await fetch(`/api/leads?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      return data.leads || [];
    } catch (err) {
      console.warn("Falling back to local cache for leads:", err);
      return [];
    }
  },

  async createLead(leadData) {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
      const data = await res.json();
      return data.lead;
    } catch (err) {
      console.error("Failed to create lead via API:", err);
      return null;
    }
  },

  async updateLeadStatus(id, newStatus) {
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      return data.lead;
    } catch (err) {
      console.error("Failed to update lead status via API:", err);
      return null;
    }
  },

  async deleteLead(id) {
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  },
};
