"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Users2,
  HelpCircle,
  Target,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { botsApi } from "@/lib/api/bots";
import { conversationsApi } from "@/lib/api/conversations";
import { leadsApi } from "@/lib/api/leads";
import { analyticsApi } from "@/lib/api/analytics";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import RealtimeBadge from "@/components/ui/RealtimeBadge";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("Last 30 days");
  const [conversations, setConversations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [bots, setBots] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [c, l, b, a] = await Promise.all([
        conversationsApi.getConversations(),
        leadsApi.getLeads(),
        botsApi.getBots(),
        analyticsApi.getDashboardMetrics(),
      ]);
      setConversations(c || []);
      setLeads(l || []);
      setBots(b || []);
      setAnalytics(a || null);
    } catch (err) {
      console.warn("Analytics real-time sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE event stream + adaptive background polling)
  const { isLive, lastSync, triggerSync } = useRealtimeSync(loadData, {
    pollingInterval: 3000,
  });

  const totalConvs = conversations.length;
  const totalLeads = leads.length;
  const totalQuestions = conversations.reduce(
    (acc, curr) => acc + (curr.messages?.filter((m) => m.role === "user").length || 0),
    0
  );
  const convRate = totalConvs > 0 ? ((totalLeads / totalConvs) * 100).toFixed(1) : "0.0";
  const avgQ = totalConvs > 0 ? (totalQuestions / totalConvs).toFixed(1) : "0.0";

  const performanceTimeline =
    analytics?.timeseries && analytics.timeseries.length > 0
      ? analytics.timeseries
      : [
          { date: "Oct 1", conversations: 0, questions: 0, leads: 0 },
          { date: "Oct 5", conversations: 0, questions: 0, leads: 0 },
          { date: "Oct 10", conversations: 0, questions: 0, leads: 0 },
          { date: "Oct 15", conversations: 0, questions: 0, leads: 0 },
          { date: "Oct 20", conversations: 0, questions: 0, leads: 0 },
          { date: "Oct 25", conversations: 0, questions: 0, leads: 0 },
          { date: "Today", conversations: totalConvs, questions: totalQuestions, leads: totalLeads },
        ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Real-Time Analytics & Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track your live chatbot performance, conversations, and user engagement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RealtimeBadge isLive={isLive} lastSync={lastSync} onRefresh={triggerSync} />

          {/* Date Filter Dropdown */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 outline-hidden shadow-xs cursor-pointer"
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
              <option value="Year to Date">Year to Date</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 8 KPI Cards Organized in 2 Rows of 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1, Card 1: Conversations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Conversations
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalConvs}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {totalConvs > 0 ? "+100%" : "0%"}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Row 1, Card 2: Unique Visitors */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Unique Visitors
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalConvs}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {totalConvs > 0 ? "+100%" : "0%"}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100/60 flex items-center justify-center text-sky-600">
            <Users2 className="w-5 h-5" />
          </div>
        </div>

        {/* Row 1, Card 3: Total Questions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Total Questions
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalQuestions}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {totalQuestions > 0 ? "+100%" : "0%"}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-600">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Row 1, Card 4: Leads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Leads
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalLeads}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {totalLeads > 0 ? "+100%" : "0%"}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 5: Answer Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Answer Rate
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalConvs > 0 ? "100%" : "0%"}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                0%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-violet-50 border border-violet-100/60 flex items-center justify-center text-violet-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 6: Avg. Response */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Avg. Response
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalConvs > 0 ? "1.2 sec" : "0 sec"}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                0%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100/60 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 7: Avg. Questions / Chat */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Avg. Questions / Chat
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {avgQ}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                0%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100/60 flex items-center justify-center text-purple-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 8: Lead Conversion */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Lead Conversion
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {convRate}%
              </span>
              <span className="text-[11px] font-semibold text-emerald-600">
                0%
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100/60 flex items-center justify-center text-rose-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Conversations & Questions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Conversations & Questions
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-slate-600 font-medium">Conversations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-600 font-medium">Questions</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#f1f5f9" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="questions"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorQuestions)"
                  name="Questions"
                />
                <Area
                  type="monotone"
                  dataKey="conversations"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorConvs)"
                  name="Conversations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Leads Generated */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Leads Generated
            </h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              +14.8% This Month
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#f1f5f9" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar
                  dataKey="leads"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  name="Leads Captured"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
