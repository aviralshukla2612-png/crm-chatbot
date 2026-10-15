"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Users,
  Bot,
  MessageSquare,
  Users2,
  Power,
  PowerOff,
  UserCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminApi } from "@/lib/api/admin";

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    suspendedOrganizations: 0,
    totalBots: 0,
    totalCapturedLeads: 0,
  });

  const loadData = useCallback(async (targetPage = page, search = searchTerm, status = statusFilter, limit = pageSize) => {
    setLoading(true);
    try {
      const res = await adminApi.getOrganizations({
        page: targetPage,
        limit,
        search,
        status,
      });

      if (res && res.success) {
        setOrganizations(res.data || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    loadData(page, searchTerm, statusFilter, pageSize);
  }, [page, statusFilter, pageSize, loadData]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadData(1, searchTerm, statusFilter, pageSize);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, statusFilter, pageSize, loadData]);

  const handleToggleStatus = async (org) => {
    setUpdatingId(org.id);
    try {
      const updated = await adminApi.toggleOrgStatus(org.id, org.status);
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, status: updated.status } : o))
      );
    } catch (err) {
      console.error("Status toggle failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleImpersonate = async (orgId) => {
    try {
      await fetch("/api/auth/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      window.location.href = "/dashboard";
    } catch {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Tenant Organizations & Admins
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage thousands of client workspaces, audit active bots, and impersonate any workspace securely.
          </p>
        </div>

        <button
          onClick={() => loadData(page, searchTerm, statusFilter, pageSize)}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium">Total Workspaces</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats.totalOrganizations.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {stats.activeOrganizations.toLocaleString()} active tenants
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Bot className="w-4 h-4 text-sky-500" />
            <span className="text-xs font-medium">Deployed AI Bots</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats.totalBots.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400">Across all tenant domains</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium">Total Leads Captured</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats.totalCapturedLeads.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">High commercial intent</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <XCircle className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-medium">Suspended</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {stats.suspendedOrganizations.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400">Access revoked</span>
        </div>
      </div>

      {/* Control Bar: Search & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search 1,000s of workspaces by company, admin name, email, or ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <button
              onClick={() => { setStatusFilter("ALL"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setStatusFilter("ACTIVE"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "ACTIVE" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => { setStatusFilter("DISABLED"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === "DISABLED" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Suspended
            </button>
          </div>

          {/* Page Size selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-hidden cursor-pointer"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="p-4">Organization & Domain</th>
                <th className="p-4">Workspace Admin</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Bots</th>
                <th className="p-4">Chats</th>
                <th className="p-4">Leads</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Loading workspaces...</span>
                    </div>
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <p className="font-semibold text-sm">No organizations found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No matching records found for "{searchTerm}". Try clearing your filter.
                    </p>
                    <button
                      onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }}
                      className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{org.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{org.id} • {org.slug}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{org.owner}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{org.ownerEmail}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {org.plan}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-indigo-600 font-bold">{org.botsCount || 0}</td>
                    <td className="p-4 font-mono text-slate-600">{(org.conversationsCount || 0).toLocaleString()}</td>
                    <td className="p-4 font-mono text-emerald-600 font-bold">{(org.leadsCount || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <StatusBadge status={org.status} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleImpersonate(org.id)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Impersonate Workspace (Enter as Admin)"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(org)}
                          disabled={updatingId === org.id}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                          title={org.status === "ACTIVE" ? "Suspend Workspace Access" : "Activate Workspace"}
                        >
                          {org.status === "ACTIVE" ? (
                            <PowerOff className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Power className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="p-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {pagination.totalCount === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {pagination.totalCount.toLocaleString()}
            </span>{" "}
            workspaces
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-semibold text-slate-700 bg-slate-100 rounded-lg">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
