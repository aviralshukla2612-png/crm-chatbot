"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sun,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Calendar,
  MessageSquare,
  Users,
  HelpCircle,
  Users2,
  CheckCircle,
  Clock,
  Bot,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { botsApi } from "@/lib/api/bots";
import { conversationsApi } from "@/lib/api/conversations";
import { leadsApi } from "@/lib/api/leads";
import { analyticsApi } from "@/lib/api/analytics";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import RealtimeBadge from "@/components/ui/RealtimeBadge";

export default function DashboardPage() {
  const [timeView, setTimeView] = useState("daily");
  const [bots, setBots] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [botsData, convsData, leadsData, analyticsData] = await Promise.all([
        botsApi.getBots(),
        conversationsApi.getConversations(),
        leadsApi.getLeads(),
        analyticsApi.getDashboardMetrics(),
      ]);
      setBots(botsData || []);
      setConversations(convsData || []);
      setLeads(leadsData || []);
      setAnalytics(analyticsData || null);
    } catch (err) {
      console.warn("Real-time load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE event stream + background polling)
  const { isLive, lastSync, triggerSync } = useRealtimeSync(loadData, {
    pollingInterval: 3000,
  });

  const activeBotsCount = bots.filter((b) => b.status === "Active").length;
  const totalConvs = conversations.length;
  const totalLeads = leads.length;
  const totalQuestions = conversations.reduce(
    (sum, c) => sum + (c.messages?.filter((m) => m.role === "user").length || 0),
    0
  );

  const answeredQuestions = conversations.reduce(
    (sum, c) => sum + (c.messages?.filter((m) => m.role === "assistant").length || 0),
    0
  );

  const answerRate =
    totalQuestions > 0
      ? Math.min(100, Math.round((answeredQuestions / totalQuestions) * 100 * 10) / 10)
      : 100;

  const kpis = [
    { title: "Total Conversations", value: totalConvs.toString(), change: totalConvs > 0 ? "+100%" : "0%", pos: true },
    { title: "Unique Visitors", value: totalConvs.toString(), change: totalConvs > 0 ? "+100%" : "0%", pos: true },
    { title: "Total Questions", value: totalQuestions.toString(), change: totalQuestions > 0 ? "+100%" : "0%", pos: true },
    { title: "Leads Generated", value: totalLeads.toString(), change: totalLeads > 0 ? "+100%" : "0%", pos: true },
    { title: "Answer Rate", value: `${answerRate}%`, change: "0%", pos: true },
    { title: "Avg. Response Time", value: totalConvs > 0 ? "1.1 sec" : "0 sec", change: "0%", pos: true },
    { title: "Active Bots", value: activeBotsCount.toString(), change: "0%", pos: true },
    { title: "Unanswered Questions", value: Math.max(0, totalQuestions - answeredQuestions).toString(), change: "0%", pos: true },
  ];

  const timeseriesData =
    analytics?.timeseries && analytics.timeseries.length > 0
      ? analytics.timeseries
      : [
          { date: "Oct 1", conversations: 0 },
          { date: "Oct 5", conversations: 0 },
          { date: "Oct 10", conversations: 0 },
          { date: "Oct 15", conversations: 0 },
          { date: "Oct 20", conversations: 0 },
          { date: "Oct 25", conversations: 0 },
          { date: "Today", conversations: totalConvs },
        ];

  const botDonutData = bots.length > 0
    ? bots.map((b, idx) => ({
        name: b.name,
        value: Math.max(1, conversations.filter((c) => c.botId === b.id || c.botName === b.name).length),
        color: b.primaryColor || ["#4f46e5", "#38bdf8", "#a855f7"][idx % 3],
      }))
    : [{ name: "No Active Bots", value: 100, color: "#cbd5e1" }];

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-800 font-sans">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Good morning, Srajan
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Here&apos;s what&apos;s happening across your live assistants in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Real-time Indicator */}
          <RealtimeBadge isLive={isLive} lastSync={lastSync} onRefresh={triggerSync} />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 shadow-2xs font-medium cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Last 30 days</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <Link
            href="/bots/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create AI Bot</span>
          </Link>
        </div>
      </div>

      {/* 8 Top KPI Cards (Grid of 4 x 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow"
          >
            <span className="text-[11px] font-medium text-slate-500 block truncate">
              {kpi.title}
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold text-slate-900">
                {kpi.value}
              </span>
              <span
                className={`text-[11px] font-semibold flex items-center ${
                  kpi.pos ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {kpi.pos ? (
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                )}
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Conversations Over Time (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Conversations Over Time
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium text-slate-600">
              {["daily", "weekly", "monthly"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeView(t)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-all cursor-pointer ${
                    timeView === t ? "bg-white text-indigo-600 font-bold shadow-2xs" : "hover:text-slate-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg">
                          <p className="font-bold">{payload[0].payload.date}, 2026</p>
                          <p className="text-indigo-300 font-semibold">{payload[0].value} conversations</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="conversations" stroke="#4f46e5" strokeWidth={2.5} fill="url(#chartIndigo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Questions by Bot (1 col) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <h3 className="font-bold text-sm text-slate-900 mb-2">
            Questions by Bot
          </h3>

          <div className="relative h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={botDonutData}
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {botDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-lg font-bold text-slate-900 block leading-tight">
                {totalQuestions}
              </span>
              <span className="text-[10px] text-slate-400">Questions</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {botDonutData.map((b, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="text-slate-600 truncate max-w-[140px]">{b.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{b.value > 0 ? `${Math.round(b.value)}%` : "0%"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Conversations */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900">
              Recent Conversations
            </h3>
            <Link href="/conversations" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1.5">
                <MessageSquare className="w-6 h-6 mx-auto text-slate-300" />
                <p className="font-medium text-slate-600">No conversations yet</p>
                <p className="text-[11px]">When visitors chat with your AI assistant, sessions will appear here.</p>
              </div>
            ) : (
              conversations.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {c.visitorName?.charAt(0) || "U"}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{c.visitorName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{c.lastMessage}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <span className="text-[10px] text-slate-400">{c.startedAt || "Recently"}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900">
              Recent Leads
            </h3>
            <Link href="/leads" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-1.5">
                <Users2 className="w-6 h-6 mx-auto text-slate-300" />
                <p className="font-medium text-slate-600">No leads captured yet</p>
                <p className="text-[11px]">Prospects captured by your chatbot will automatically appear here.</p>
              </div>
            ) : (
              leads.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {l.name?.charAt(0) || "L"}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{l.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{l.email || l.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <span className="text-[10px] text-slate-400">{l.created}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                      {l.score || "High"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
