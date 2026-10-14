"use client";

import React, { useEffect, useState, useMemo } from "react";
import { MessageSquare, Search, Filter, ExternalLink, Bot, CheckCircle2, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { conversationsApi } from "@/lib/api/conversations";

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await conversationsApi.getConversations();
        setConversations(data || []);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.visitorName && c.visitorName.toLowerCase().includes(q)) ||
        (c.botName && c.botName.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  return (
    <div className="space-y-6 animate-fade-in pb-16 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <MessageSquare className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Global Platform Conversations
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live transcripts and compliance across all tenant customer chat sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations by visitor, bot, or message..."
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
        <div className="text-xs font-semibold text-slate-500">
          Total: <span className="text-slate-900 font-bold">{conversations.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="p-4">Visitor / Client</th>
                <th className="p-4">Assisting Bot</th>
                <th className="p-4">Last Message</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Lead Captured</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading conversations...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No conversations found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      When visitors chat with your bots, sessions will appear here live.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{c.visitorName || "Website Visitor"}</p>
                      {c.visitorPhone && (
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{c.visitorPhone}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-xs border border-slate-200/60">
                        <Bot className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{c.botName || "aa"}</span>
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-sm truncate">
                      {c.lastMessage || "(Active Session)"}
                    </td>
                    <td className="p-4 font-mono text-slate-500">{c.duration || "1m"}</td>
                    <td className="p-4">
                      {c.isLead ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          LEAD
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={c.status || "Active"} size="sm" />
                    </td>
                    <td className="p-4 text-right text-slate-500 whitespace-nowrap text-[11px] font-mono">
                      {c.startedAt || "Just now"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
