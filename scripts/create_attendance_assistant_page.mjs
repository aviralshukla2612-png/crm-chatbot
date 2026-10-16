import fs from "fs";
import path from "path";

const targetDir = "d:/ess-os/src/app/(dashboard)/attendance-assistant";
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const pageCode = `"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Download,
  BarChart3,
  Clock,
  UserCheck,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  RotateCcw,
  ShieldCheck,
  Calendar,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolUsed?: string;
  source?: "ollama" | "fallback";
  metrics?: Array<{ label: string; value: number | string; color?: string }>;
  table?: any[] | null;
  chart?: any[] | null;
  downloadUrl?: string | null;
  isError?: boolean;
}

const SUGGESTED_QUERIES = [
  { text: "How many employees are present today?", short: "Today's Summary", icon: Users, tag: "Summary" },
  { text: "Who arrived late today?", short: "Late Arrivals", icon: Clock, tag: "Punctuality" },
  { text: "Which employees have incomplete check-outs?", short: "Incomplete Shifts", icon: AlertTriangle, tag: "Compliance" },
  { text: "Show attendance for Engineering department", short: "Engineering Dept", icon: Building2, tag: "Department" },
  { text: "Show attendance for Sales department", short: "Sales Dept", icon: Building2, tag: "Department" },
  { text: "Show my attendance for the last 30 days", short: "My 30 Days", icon: UserCheck, tag: "Personal" },
  { text: "Give me this month's attendance summary", short: "Monthly Overview", icon: Calendar, tag: "Monthly" },
  { text: "Generate a monthly attendance report PDF", short: "Monthly PDF", icon: FileText, tag: "PDF Report" },
];

export default function AttendanceAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/crmtesting/api/attendance/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Attendance AI failed to process query.");
      }

      const botMsg: Message = {
        role: "assistant",
        content: data.explanation || data.message || "Query processed successfully.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        toolUsed: data.toolUsed,
        source: data.source,
        metrics: data.metrics,
        table: data.table,
        chart: data.chart,
        downloadUrl: data.downloadUrl || data.data?.downloadUrl,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Error: " + (err.message || "An unexpected error occurred"),
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
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Header */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-indigo-400 dark:text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                ESS Attendance AI Assistant
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                LIVE DATABASE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Natural-language attendance intelligence powered by Prisma & SQLite • Asia/Kolkata IST
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            title="Start New Conversation"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto py-3">
            {/* Welcome Hero Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
                    Welcome to ESS Attendance Analytics
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mb-2.5">
                    Ask any operational question regarding employee attendance, late punch-ins, unclosed shifts, department rankings, or generate verified vector PDF reports. All answers are queried directly from the verified SQLite database with zero hallucination.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Role-Based Access Enforced
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" /> Indian Standard Time (IST)
                    </span>
                    <span>•</span>
                    <span>Deterministic Math</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Suggested Queries Grid */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
                Suggested Attendance Inquiries
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTED_QUERIES.map((sq, i) => {
                  const Icon = sq.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(sq.text)}
                      className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-lg transition-all text-left group shadow-2xs cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-950 dark:group-hover:text-white truncate">
                            {sq.text}
                          </p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                            {sq.tag}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
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
                className={"flex flex-col " + (msg.role === "user" ? "items-end" : "items-start")}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    {msg.role === "user" ? "You" : "Attendance AI"}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">• {msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={
                    "rounded-2xl p-5 max-w-3xl text-sm leading-relaxed " +
                    (msg.role === "user"
                      ? "bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-xs shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-xs shadow-xs w-full")
                  }
                >
                  <div className="whitespace-pre-wrap font-normal leading-relaxed">
                    {msg.content}
                  </div>

                  {/* KPI Metric Cards */}
                  {msg.metrics && msg.metrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      {msg.metrics.map((m, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate mb-0.5">
                            {m.label}
                          </p>
                          <p className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chart Distribution */}
                  {msg.chart && msg.chart.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Workforce Breakdown
                        </h4>
                        <span className="text-[10px] text-slate-400">Verified Database Records</span>
                      </div>
                      <div className="h-48 w-full bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={msg.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px", border: "none" }}
                            />
                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Headcount" />
                            {msg.chart[0]?.shifts !== undefined && (
                              <Bar dataKey="shifts" fill="#10b981" radius={[4, 4, 0, 0]} name="Shifts" />
                            )}
                            {msg.chart[0]?.hours !== undefined && (
                              <Bar dataKey="hours" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Hours" />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Detailed Table */}
                  {msg.table && msg.table.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Detailed Attendance Records
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="p-2.5">Employee</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Punch In</th>
                              <th className="p-2.5">Punch Out</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5">Work Hours</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {msg.table.slice(0, 10).map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                                  {row.employeeName || row.name || row.employeeCode || "Employee"}
                                  {row.department && (
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                      {row.department}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                  {row.date ? String(row.date).slice(0, 10) : "Today"}
                                </td>
                                <td className="p-2.5 text-slate-700 dark:text-slate-300 font-mono">
                                  {row.punchIn ? String(row.punchIn).slice(11, 16) : "--:--"}
                                </td>
                                <td className="p-2.5 text-slate-700 dark:text-slate-300 font-mono">
                                  {row.punchOut ? String(row.punchOut).slice(11, 16) : "--:--"}
                                </td>
                                <td className="p-2.5">
                                  {row.status === "PRESENT" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">PRESENT</span>
                                  ) : row.status === "LATE" || row.isLate ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">LATE</span>
                                  ) : row.status === "ON_LEAVE" ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">ON LEAVE</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">{row.status || "ABSENT"}</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">
                                  {row.workHours || (row.totalMinutes ? (Math.round((row.totalMinutes / 60) * 10) / 10 + " hrs") : "--")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Download PDF Card */}
                  {msg.downloadUrl && (
                    <div className="mt-4 p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            Attendance Vector PDF Report
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Authorized multi-page document with summary KPIs & verified shift records
                          </p>
                        </div>
                      </div>
                      <a
                        href={msg.downloadUrl}
                        download
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  )}

                  {/* Follow-up Options Pills (Small Size under Assistant Answers) */}
                  {msg.role === "assistant" && !msg.isError && !loading && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
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
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md shadow-xs">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Querying SQLite database & verifying attendance rules...
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 shadow-xs">
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
            placeholder="Ask about today's attendance, late arrivals, incomplete shifts, department summaries, or request a PDF..."
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(targetDir, "page.tsx"), pageCode, "utf8");
console.log("Created page.tsx in attendance-assistant successfully.");
