"use client";

import React, { useEffect, useState } from "react";
import {
  Users2,
  Flame,
  PhoneCall,
  CheckCircle2,
  Search,
  Download,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  Calendar,
  Bot,
  Sparkles,
  X,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { leadsApi } from "@/lib/api/leads";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import RealtimeBadge from "@/components/ui/RealtimeBadge";

const ANSWER_LABELS = {
  is_business: "For Business",
  is_redesign: "Build Type",
  website_type: "Website Type",
  budget: "Project Budget",
  timeline: "Target Timeline",
  non_business_type: "Project Purpose",
  needs_admin: "Admin Panel",
  needs_payment: "Online Payments",
  platform: "Target Platform",
  is_new_app: "App Category",
  needs_backend: "Custom Backend",
  needs_integrations: "Third-party Integrations",
  channel: "Chatbot Channel",
  purpose: "Bot Purpose",
  needs_docs: "Document Training (RAG)",
  needs_crm: "CRM Sync",
  system_type: "System Type",
  has_existing_data: "Data Migration",
  needs_role_access: "Role-Based Access",
  design_target: "Design Scope",
  prototype_depth: "Prototypes Required",
  brand_identity: "Brand Guidelines",
  cloud_platform: "Cloud Infrastructure",
  needs_cicd: "Automated CI/CD",
  needs_db_ha: "High Availability DB",
  website_status: "Current Website",
  target_market: "Target Market",
  scope_focus: "SEO Scope",
};

function formatAnswerValue(val) {
  if (val === true || val === "true") return { text: "Yes", type: "yes" };
  if (val === false || val === "false") return { text: "No", type: "no" };
  if (!val) return { text: "Not specified", type: "neutral" };
  return { text: String(val), type: "value" };
}

function getLeadEffectiveAnswers(lead) {
  if (!lead) return {};
  const directAnswers = lead.answers && Object.keys(lead.answers).length > 0 ? lead.answers : null;
  const qualAnswers = lead.qualification?.answers && Object.keys(lead.qualification.answers).length > 0 ? lead.qualification.answers : null;
  if (directAnswers || qualAnswers) {
    return { ...(qualAnswers || {}), ...(directAnswers || {}) };
  }
  // Fallback: parse from inquiry string if present
  if (lead.inquiry && lead.inquiry.includes(":")) {
    const parsed = {};
    const parts = lead.inquiry.split("|").map((p) => p.trim());
    parts.forEach((p) => {
      const idx = p.indexOf(":");
      if (idx > -1) {
        const k = p.slice(0, idx).trim();
        const v = p.slice(idx + 1).trim();
        if (k && v && !k.toLowerCase().includes("inquiry")) {
          parsed[k] = v;
        }
      }
    });
    if (Object.keys(parsed).length > 0) return parsed;
  }
  return {};
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [botFilter, setBotFilter] = useState("All Bots");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadLeads = async () => {
    try {
      const data = await leadsApi.getLeads();
      setLeads(data || []);
    } catch (err) {
      console.warn("Leads real-time sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE event stream + background polling)
  const { isLive, lastSync, triggerSync } = useRealtimeSync(loadLeads, {
    pollingInterval: 3000,
  });

  const filteredLeads = leads.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.email?.toLowerCase().includes(search.toLowerCase()) ||
      item.company?.toLowerCase().includes(search.toLowerCase());
    const matchesBot =
      botFilter === "All Bots" || item.bot === botFilter;
    const matchesStatus =
      statusFilter === "All Status" || item.status === statusFilter;
    return matchesSearch && matchesBot && matchesStatus;
  });

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "New").length;
  const contactedLeads = leads.filter((l) => l.status === "Contacted").length;
  const convertedLeads = leads.filter((l) => l.status === "Converted").length;

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map((l) => l.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const updateStatus = async (id, newStatus) => {
    await leadsApi.updateLeadStatus(id, newStatus);
    loadLeads();
    if (selectedLead?.id === id) {
      setSelectedLead((prev) => ({ ...prev, status: newStatus }));
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Leads & Pipeline CRM
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time inbound lead capture generated automatically by your live chatbots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RealtimeBadge isLive={isLive} lastSync={lastSync} onRefresh={triggerSync} />
          {leads.length > 0 && (
            <button
              onClick={async () => {
                await leadsApi.clearAll();
                setSelectedLead(null);
                setSelectedIds([]);
                loadLeads();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <span>Clear All</span>
            </button>
          )}
          <button
            onClick={() => {
              if (leads.length === 0) {
                alert("No leads captured yet to export.");
                return;
              }
              alert("Exporting leads to CSV...");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer w-fit"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalLeads}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Total Leads
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
            <Users2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: New Leads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {newLeads}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              New Leads
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/60 flex items-center justify-center text-rose-500">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Contacted */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {contactedLeads}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Contacted
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100/60 flex items-center justify-center text-amber-600">
            <PhoneCall className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Converted */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {convertedLeads}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              Converted
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/70 rounded-xl outline-hidden focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 transition-colors"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end overflow-x-auto text-xs">
          <div className="relative">
            <select
              value={botFilter}
              onChange={(e) => setBotFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="All Bots">All Bots</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="All Status">All Status</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Converted">Converted</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {!loading && filteredLeads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Users2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800">
              No leads captured yet
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When visitors interact with your chatbots and show purchase or booking intent, their details will automatically be qualified and saved here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500 font-semibold text-[11px]">
                  <th className="py-3.5 pl-5 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredLeads.length > 0 &&
                        selectedIds.length === filteredLeads.length
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Email / Phone</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Bot</th>
                  <th className="py-3.5 px-4">Score</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 pr-5 pl-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLeads.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedLead(item)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isSelected ? "bg-indigo-50/30" : ""
                      }`}
                    >
                      <td
                        className="py-4 pl-5 pr-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        {item.inquiry && item.inquiry !== "Inquired via live chat widget" && !item.inquiry.startsWith("Visitor introduced") && (
                          <p className="text-[11px] text-indigo-600 font-medium truncate max-w-xs mt-0.5">
                            {item.inquiry}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {item.email || item.phone}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {item.company}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {item.bot}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/50">
                          {item.score || "High"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {item.created}
                      </td>
                      <td
                        className="py-4 pr-5 pl-2 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedLead(item)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Profile Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto animate-slide-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {selectedLead.name?.charAt(0) || "P"}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedLead.name}
                    </h2>
                    <p className="text-xs text-slate-500">{selectedLead.company}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Update Lead Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["New", "Contacted", "Converted"].map((st) => (
                    <button
                      key={st}
                      onClick={() => updateStatus(selectedLead.id, st)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedLead.status === st
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium">{selectedLead.email || "No email"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium">{selectedLead.phone || "No phone"}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium">{selectedLead.company}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <Bot className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium">Origin: {selectedLead.bot}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium">Created: {selectedLead.created}</span>
                </div>
              </div>

              {/* Project Requirements & Scoping Answers Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Project Scope & Answers
                  </label>
                  {selectedLead.budget && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80">
                      Budget: {selectedLead.budget}
                    </span>
                  )}
                </div>

                {selectedLead.inquiry && (
                  <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100/80 space-y-1">
                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      Requirements Summary
                    </p>
                    <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                      {selectedLead.inquiry}
                    </p>
                  </div>
                )}

                {(() => {
                  const effectiveAnswers = getLeadEffectiveAnswers(selectedLead);
                  const entries = Object.entries(effectiveAnswers);
                  if (entries.length === 0) {
                    return (
                      <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
                        No scoping questions answered yet.
                      </div>
                    );
                  }
                  return (
                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Customer Answers Breakdown
                      </p>
                      {entries.map(([k, rawVal]) => {
                        const label = ANSWER_LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                        const { text, type } = formatAnswerValue(rawVal);
                        return (
                          <div
                            key={k}
                            className="flex items-center justify-between py-1.5 border-b border-slate-200/50 last:border-0 text-xs"
                          >
                            <span className="text-slate-600 font-medium">{label}</span>
                            <span
                              className={`font-semibold px-2.5 py-0.5 rounded-md text-[11px] ${
                                type === "yes"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : type === "no"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              }`}
                            >
                              {text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
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
