export const analyticsApi = {
  async getDashboardMetrics() {
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      return {
        ...data.metrics,
        timeseries: data.timeseries || [],
        botsDistribution: data.botsDistribution || [],
        recentConversations: data.recentConversations || [],
        recentLeads: data.recentLeads || [],
        timestamp: data.timestamp,
      };
    } catch (err) {
      console.warn("Analytics fetch failed:", err);
      return {
        totalConversations: 0,
        uniqueVisitors: 0,
        totalQuestions: 0,
        leadsGenerated: 0,
        answerRate: "100%",
        avgResponseTime: "1.1s",
        activeBotsCount: 0,
        unansweredCount: 0,
        timeseries: [],
      };
    }
  },
};
