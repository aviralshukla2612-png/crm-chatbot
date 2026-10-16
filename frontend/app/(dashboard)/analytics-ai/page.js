"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Download,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileText,
  DollarSign,
  Package,
  Users,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Clock,
  Layers,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const SUGGESTED_QUERIES = [
  { text: "What were our total sales this month?", short: "Total Sales", icon: DollarSign, tag: "Sales" },
  { text: "Compare sales for current month with previous month.", short: "Compare MoM", icon: TrendingUp, tag: "Comparison" },
  { text: "Who was our best-performing salesperson this financial year?", short: "Top Salesperson", icon: Users, tag: "Salespeople" },
  { text: "Which products are running low in stock?", short: "Low Stock Alert", icon: AlertTriangle, tag: "Inventory" },
  { text: "Show the top 10 products by revenue.", short: "Top 10 Products", icon: BarChart3, tag: "Products" },
  { text: "What is our total outstanding customer payment?", short: "Outstanding Receivables", icon: Clock, tag: "Receivables" },
  { text: "Generate a PDF report of our annual sales.", short: "Annual Sales PDF", icon: FileText, tag: "PDF Report" },
  { text: "Show difference between sales revenue, collections, and receivables.", short: "P&L & Cash Flow", icon: Layers, tag: "P&L" },
];

export default function AnalyticsAiPage() {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'reports'
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/analytics-ai/reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error("Failed loading reports:", e);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleSend = async (queryText = null, clarificationSelection = null) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() && !clarificationSelection) return;

    const userMsg = {
      role: "user",
      content: clarificationSelection ? `Selected: ${clarificationSelection}` : textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText && !clarificationSelection) setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/analytics-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim() || clarificationSelection || "Proceed",
          clarificationSelection,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Analytics AI failed to process query.");
      }

      const botMsg = {
        role: "assistant",
        content: data.message,
        payload: data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Refresh reports list if a report was generated
      if (data.reportId) {
        loadReports();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${err.message}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 font-sans">
      {/* Top Header / Context Banner */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Emperor Analytics AI
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full">
                STANDALONE ERP/CRM
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic Business Intelligence • Real Transactional Data • Vector PDF Reports
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "chat" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Assistant Workspace
            </button>
            <button
              onClick={() => {
                setActiveTab("reports");
                loadReports();
              }}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === "reports" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Generated Reports ({reports.length})
            </button>
          </div>

          <button
            onClick={handleResetChat}
            title="Start New Conversation"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      {activeTab === "chat" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-4xl mx-auto py-3">
                {/* Hero Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 mb-0.5">
                        Welcome to Emperor Operational Analytics
                      </h2>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mb-2.5">
                        Ask any operational question in plain English. Emperor Analytics AI queries real, verified ERP & CRM transactional tables, computes deterministic math with zero hallucinations, and renders charts, KPI cards, and downloadable PDF reports.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Role-Based Access Enforced
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Indian FY (Apr-Mar) Aware
                        </span>
                        <span>•</span>
                        <span>Multi-Tenant Isolated</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggested Queries Grid */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    Suggested Executive Inquiries
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {SUGGESTED_QUERIES.map((sq, i) => {
                      const Icon = sq.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSend(sq.text)}
                          className="flex items-center justify-between py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all text-left group shadow-2xs cursor-pointer active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-indigo-50 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 group-hover:text-indigo-950 truncate">
                                {sq.text}
                              </p>
                              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                                {sq.tag}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Role Header */}
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                        {msg.role === "user" ? "You" : "Emperor Analytics AI"}
                      </span>
                      <span className="text-[10px] text-slate-400">• {msg.timestamp}</span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl p-5 max-w-3xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white rounded-tr-xs shadow-sm"
                          : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs w-full"
                      }`}
                    >
                      {/* Text Content */}
                      <div className="whitespace-pre-wrap font-normal leading-relaxed">
                        {msg.content}
                      </div>

                      {/* Clarification Chips */}
                      {msg.payload?.clarification && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-700 mb-2">
                            Select an option to proceed:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {msg.payload.clarification.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                onClick={() => handleSend(null, opt)}
                                className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                <span>{opt}</span>
                                <ArrowRight className="w-3 h-3 text-indigo-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* KPI Metric Cards */}
                      {msg.payload?.metrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                          {Object.entries(msg.payload.metrics)
                            .slice(0, 4)
                            .map(([k, v], mIdx) => (
                              <div
                                key={mIdx}
                                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl"
                              >
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate mb-1">
                                  {k.replace(/([A-Z])/g, " $1")}
                                </p>
                                <p className="text-base font-extrabold text-slate-900 tracking-tight">
                                  {typeof v === "number" && !k.toLowerCase().includes("count") && !k.toLowerCase().includes("rate") && !k.toLowerCase().includes("pct")
                                    ? `₹${v.toLocaleString("en-IN")}`
                                    : String(v)}
                                </p>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Visual Chart */}
                      {msg.payload?.chart && msg.payload.chart.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Visual Distribution
                            </h4>
                            <span className="text-[10px] font-medium text-slate-400">
                              Verified Database Records
                            </span>
                          </div>
                          <div className="h-64 w-full bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={msg.payload.chart} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                                <Tooltip
                                  formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
                                  contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px", border: "none" }}
                                />
                                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Revenue" />
                                {msg.payload.chart[0]?.collections !== undefined && (
                                  <Bar dataKey="collections" fill="#10b981" radius={[4, 4, 0, 0]} name="Collections" />
                                )}
                                {msg.payload.chart[0]?.profit !== undefined && (
                                  <Bar dataKey="profit" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Gross Profit" />
                                )}
                                {msg.payload.chart[0]?.sales !== undefined && (
                                  <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sales" />
                                )}
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Detailed Table */}
                      {msg.payload?.table && msg.payload.table.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-slate-100">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Breakdown & Line Items
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                  {Object.keys(msg.payload.table[0]).map((col, cIdx) => (
                                    <th key={cIdx} className="p-2.5 capitalize">
                                      {col.replace(/([A-Z])/g, " $1")}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {msg.payload.table.slice(0, 8).map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                                    {Object.values(row).map((val, vIdx) => (
                                      <td key={vIdx} className="p-2.5 text-slate-700 font-medium">
                                        {val === "PAID" ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">PAID</span>
                                        ) : val === "UNPAID" ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">UNPAID</span>
                                        ) : val === "PARTIALLY_PAID" ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">PARTIAL</span>
                                        ) : val === "LOW STOCK ALERT" ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">LOW STOCK</span>
                                        ) : val === "HEALTHY" ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">HEALTHY</span>
                                        ) : (
                                          String(val)
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Download PDF Button */}
                      {msg.payload?.downloadUrl && (
                        <div className="mt-5 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {msg.payload.reportTitle || "Analytics Report PDF"}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Verified multi-page document with executive branding & financial tables
                              </p>
                            </div>
                          </div>
                          <a
                            href={msg.payload.downloadUrl}
                            download
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download PDF</span>
                          </a>
                        </div>
                      )}

                      {/* Assumptions & Audit Metadata */}
                      {msg.payload?.assumptions && (
                        <p className="mt-4 text-[10px] text-slate-400 italic pt-2 border-t border-slate-100">
                          {msg.payload.assumptions}
                        </p>
                      )}

                      {/* Follow-up / Next Inquiries (Small Options) - Only on Assistant Messages */}
                      {msg.role === "assistant" && !msg.isError && !loading && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            Next Suggested Inquiries:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {SUGGESTED_QUERIES.map((sq, sIdx) => {
                              const SIcon = sq.icon;
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => handleSend(sq.text)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                                >
                                  <SIcon className="w-3 h-3 text-indigo-500" />
                                  <span>{sq.short || sq.text}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl max-w-md shadow-xs">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <p className="text-xs text-slate-600 font-medium">
                      Querying PostgreSQL & validating business formulas...
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Sticky Input Bar */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-xs">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="max-w-4xl mx-auto flex items-center gap-2"
            >
              <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask about sales, top products, low stock, salesperson rankings, or request a PDF report..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim()}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
                >
                  <span>Ask</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
          </div>
        </div>
      ) : (
        /* Reports Repository Tab */
        <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Generated Executive PDF Reports
              </h2>
              <p className="text-xs text-slate-500">
                Authorized vector PDF documents compiled from real business data
              </p>
            </div>
            <button
              onClick={() => handleSend("Generate a PDF report of our annual sales.")}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Annual Sales PDF</span>
            </button>
          </div>

          {reportsLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Loading reports catalog...
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                No Reports Generated Yet
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Ask the Analytics AI to generate any report, e.g. "Generate an annual sales report PDF" or "Export inventory PDF".
              </p>
              <button
                onClick={() => {
                  setActiveTab("chat");
                  handleSend("Generate an annual sales report PDF");
                }}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Generate First Report
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {rep.reportType.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {rep.createdAt?.slice(0, 10)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      {rep.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Period: {rep.period} • Size: {Math.round((rep.fileSizeBytes || 4000) / 1024)} KB
                    </p>
                  </div>
                  <a
                    href={`/api/analytics-ai/reports/${rep.id}/download`}
                    download
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Report</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
