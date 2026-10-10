export const conversationsApi = {
  async getConversations(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "All") params.set("status", filters.status);
      if (filters.onlyLeads) params.set("onlyLeads", "true");
      if (filters.search) params.set("search", filters.search);
      if (filters.botId && filters.botId !== "All") params.set("botId", filters.botId);

      const res = await fetch(`/api/conversations?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      return data.conversations || [];
    } catch (err) {
      console.warn("Falling back to local cache for conversations:", err);
      return [];
    }
  },

  async getConversationById(id) {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.conversation || null;
    } catch (err) {
      return null;
    }
  },

  async createConversation(data) {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      return resData.conversation;
    } catch (err) {
      console.error("Failed to create conversation via API:", err);
      return null;
    }
  },

  async addMessage(conversationId, message) {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
      const data = await res.json();
      return data.message;
    } catch (err) {
      console.error("Failed to add message via API:", err);
      return null;
    }
  },

  async markResolved(conversationId) {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" }),
      });
      const data = await res.json();
      return data.conversation;
    } catch (err) {
      return null;
    }
  },

  async deleteConversation(conversationId) {
    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (err) {
      return false;
    }
  },
};
