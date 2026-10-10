"use client";

import React, { useState } from "react";
import {
  Building2,
  Users,
  Bot,
  MessageSquare,
  HelpCircle,
  Target,
  CheckCircle2,
  CreditCard,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import { analyticsApi } from "@/lib/api/analytics";
import { botsApi } from "@/lib/api/bots";
import RealtimeBadge from "@/components/ui/RealtimeBadge";

const platformGrowthData = [
  { date: "Oct 1", orgs: 800, users: 2200, bots: 1400 },
  { date: "Oct 5", orgs: 1100, users: 3400, bots: 1900 },
  { date: "Oct 10", orgs: 1450, users: 4900, bots: 2400 },
  { date: "Oct 15", orgs: 1750, users: 6100, bots: 2900 },
  { date: "Oct 20", orgs: 2100, users: 7200, bots: 3400 },
  { date: "Oct 25", orgs: 2320, users: 8100, bots: 3850 },
  { date: "Oct 30", orgs: 2481, users: 8932, bots: 4182 },
];

const topOrganizations = [
  {
    name: "Acme Healthcare",
    bots: 12,
    conversations: "48,392",
    users: "1,284",
  },
  {
    name: "ABC Technologies",
    bots: 8,
    conversations: "32,110",
    users: "942",
  },
  {
    name: "XYZ Ltd",
    bots: 6,
    conversations: "18,450",
    users: "612",
  },
  {
    name: "DEF Limited",
    bots: 4,
    conversations: "12,211",
    users: "395",
  },
  {
    name: "GHI Private Ltd",
    bots: 3,
    conversations: "8,940",
    users: "248",
  },
];

export default function AdminOverviewPage() {
  const [timeRange, setTimeRange] = useState("Last 30 days");
  const [metrics, setMetrics] = useState(null);

  const loadData = async () => {
    try {
      const data = await analyticsApi.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.warn("Admin real-time sync error:", err);
    }
  };

  const { isLive, lastSync, triggerSync } = useRealtimeSync(loadData, {
    pollingInterval: 4000,
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Overview & Global Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time multi-tenant platform health and analytics.
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
              <option value="All Time">All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 8 Platform KPI Cards (2 Rows of 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1, Card 1: Organizations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              2,481
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Organizations
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Row 1, Card 2: Users */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              8,932
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Users
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100/60 flex items-center justify-center text-sky-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Row 1, Card 3: Bots */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              4,182
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Bots
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100/60 flex items-center justify-center text-teal-600">
            <Bot className="w-5 h-5" />
          </div>
        </div>

        {/* Row 1, Card 4: Conversations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              1.2M
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Conversations
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 5: Questions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              4.8M
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Questions
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-violet-50 border border-violet-100/60 flex items-center justify-center text-violet-600">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 6: Leads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              182K
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Leads
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100/60 flex items-center justify-center text-amber-600">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 7: Platform Uptime */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              98.4%
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Platform Uptime
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-100/60 flex items-center justify-center text-cyan-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Row 2, Card 8: Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ₹12.4L
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Monthly Revenue
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100/60 flex items-center justify-center text-rose-500">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bottom Grid: Platform Growth & Top Organizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Platform Growth (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Platform Growth
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-slate-600 font-medium">Organizations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-slate-600 font-medium">Users</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span className="text-slate-600 font-medium">Bots</span>
              </div>
            </div>
          </div>

          <div className="h-68 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorBots" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
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
                  dataKey="users"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  name="Users"
                />
                <Area
                  type="monotone"
                  dataKey="bots"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorBots)"
                  name="Bots"
                />
                <Area
                  type="monotone"
                  dataKey="orgs"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorOrgs)"
                  name="Organizations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Top Organizations (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Top Organizations
              </h3>
              <Link
                href="/admin/organizations"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold text-[11px] border-b border-slate-100">
                    <th className="py-2.5 pr-2">Organization</th>
                    <th className="py-2.5 px-2 text-center">Bots</th>
                    <th className="py-2.5 px-2 text-center">Conversations</th>
                    <th className="py-2.5 pl-2 text-right">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topOrganizations.map((org) => (
                    <tr key={org.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pr-2 font-semibold text-slate-800">
                        {org.name}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-600 font-medium">
                        {org.bots}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-600 font-medium">
                        {org.conversations}
                      </td>
                      <td className="py-3 pl-2 text-right font-medium text-slate-700">
                        {org.users}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
