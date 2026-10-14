"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users2,
  Mail,
  Phone,
  Building,
  Sparkles,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  X,
  Copy,
  Check,
  MessageSquare,
  Bot,
  Globe,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { leadsApi } from "@/lib/api/leads";

function stripMarkdown(text) {
  if (!text) return "";
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").trim();
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedLead, setSelectedLead] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await leadsApi.getLeads();
        setLeads(data || []);
      } catch (err) {
        console.error("Failed to load leads:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = leads.length;
    const hotOrHigh = leads.filter(
      (l) => ["HOT", "HIGH"].includes((l.score || "").toUpperCase())
    ).length;
    const qualified = leads.filter(
      (l) => ["QUALIFIED", "CONVERTED"].includes((l.status || "").toUpperCase())
    ).length;
    const newLeads = leads.filter(
      (l) => (l.status || "").toUpperCase() === "NEW"
    ).length;
    return { total, hotOrHigh, qualified, newLeads };
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.inquiry && l.inquiry.toLowerCase().includes(q));

      const matchesScore =
        scoreFilter === "All" ||
        (l.score || "Medium").toLowerCase() === scoreFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All" ||
        (l.status || "New").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesScore && matchesStatus;
    });
  }, [leads, search, scoreFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Global Generated Leads
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                High-commercial-intent leads captured by all customer assistants across all tenants.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Leads
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
            <span className="text-[11px] text-slate-400 font-medium">All-time</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hot / High Intent
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">{stats.hotOrHigh}</span>
            <span className="text-[11px] text-slate-400 font-medium">Priority</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Qualified
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">{stats.qualified}</span>
            <span className="text-[11px] text-slate-400 font-medium">Verified intent</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              New Leads
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-700">{stats.newLeads}</span>
            <span className="text-[11px] text-slate-400 font-medium">Needs action</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, phone, email, or inquiry..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Score Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500">Score:</span>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="text-xs bg-transparent border-0 outline-hidden font-medium text-slate-800 cursor-pointer"
            >
              <option value="All">All Scores</option>
              <option value="Hot">Hot</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent border-0 outline-hidden font-medium text-slate-800 cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="p-4 min-w-[220px]">Lead Contact</th>
                <th className="p-4 min-w-[140px]">Customer / Tenant</th>
                <th className="p-4 min-w-[110px]">Assisting Bot</th>
                <th className="p-4 min-w-[120px]">Commercial Score</th>
                <th className="p-4 min-w-[110px]">Channel</th>
                <th className="p-4 min-w-[110px]">Pipeline Status</th>
                <th className="p-4 text-right min-w-[100px]">Created</th>
                <th className="p-4 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading platform leads...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Users2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No matching leads found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {leads.length === 0
                        ? "Leads captured by customer chatbots will appear here in real time."
                        : "Try adjusting your search query or filters."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => {
                  const cleanedInquiry = stripMarkdown(l.inquiry);
                  const isRealInquiry =
                    cleanedInquiry &&
                    cleanedInquiry !== "Inquired via live chat widget" &&
                    !cleanedInquiry.startsWith("Visitor introduced");

                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLead(l)}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                    >
                      {/* Lead Contact */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {l.name || "Website Prospect"}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {l.phone ? (
                            <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {l.phone}
                            </span>
                          ) : l.email ? (
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {l.email}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No contact shared yet</span>
                          )}
                        </div>
                        {isRealInquiry && (
                          <p
                            className="text-[11px] text-indigo-700 font-medium truncate max-w-sm mt-1 bg-indigo-50/60 border border-indigo-100/80 px-2 py-0.5 rounded-md"
                            title={cleanedInquiry}
                          >
                            {cleanedInquiry}
                          </p>
                        )}
                      </td>

                      {/* Customer / Tenant */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{l.company || "Direct Inbound"}</span>
                        </div>
                        {l.organizationId && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate max-w-[130px]">
                            {l.organizationId}
                          </span>
                        )}
                      </td>

                      {/* Assisting Bot */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-xs border border-slate-200/60">
                          <Bot className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{l.bot || l.botName || "aa"}</span>
                        </span>
                      </td>

                      {/* Commercial Score */}
                      <td className="p-4">
                        <StatusBadge status={l.score || "Medium"} size="sm" />
                      </td>

                      {/* Channel */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60 whitespace-nowrap">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>{l.source || "Web Widget"}</span>
                        </span>
                      </td>

                      {/* Pipeline Status */}
                      <td className="p-4">
                        <StatusBadge status={l.status || "New"} size="sm" />
                      </td>

                      {/* Created */}
                      <td className="p-4 text-right text-slate-500 whitespace-nowrap text-[11px] font-mono">
                        {l.created || (l.createdAt ? l.createdAt.split("T")[0] : "Just now")}
                      </td>

                      {/* Action Chevron */}
                      <td className="p-4 text-center">
                        <span className="p-1 rounded-lg text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors inline-block">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Slide-over Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-5 animate-scale-up">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedLead.name || "Website Prospect"}
                  </h3>
                  <StatusBadge status={selectedLead.score || "Medium"} size="sm" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Captured on {selectedLead.created || selectedLead.createdAt || "Recent session"}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contact details */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                </span>
                <div className="flex items-center gap-2 font-mono font-semibold text-slate-800">
                  <span>{selectedLead.phone || "Not provided"}</span>
                  {selectedLead.phone && (
                    <button
                      onClick={() => copyToClipboard(selectedLead.phone, "phone")}
                      className="text-slate-400 hover:text-indigo-600"
                      title="Copy phone"
                    >
                      {copiedField === "phone" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email:
                </span>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span>{selectedLead.email || "Not provided"}</span>
                  {selectedLead.email && (
                    <button
                      onClick={() => copyToClipboard(selectedLead.email, "email")}
                      className="text-slate-400 hover:text-indigo-600"
                      title="Copy email"
                    >
                      {copiedField === "email" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> Company / Tenant:
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedLead.company || "Direct Inbound"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-slate-400" /> Assisting Bot:
                </span>
                <span className="font-semibold text-indigo-600">
                  {selectedLead.bot || selectedLead.botName || "aa"}
                </span>
              </div>
            </div>

            {/* Requirement / Inquiry */}
            {selectedLead.inquiry && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Lead Requirement & Inquiry
                </label>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-slate-800 leading-relaxed">
                  {stripMarkdown(selectedLead.inquiry)}
                </div>
              </div>
            )}

            {/* Answers Breakdown if present */}
            {selectedLead.answers && Object.keys(selectedLead.answers).length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Qualification Answers
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {Object.entries(selectedLead.answers).map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 text-xs"
                    >
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium text-slate-800">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
