"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Search, Filter, ExternalLink } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { conversationsApi } from "@/lib/api/conversations";

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await conversationsApi.getConversations();
      setConversations(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Global Platform Conversations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Monitor chat transcripts and question compliance across all client deployments.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="p-4">Visitor / Client</th>
                <th className="p-4">Tenant Bot</th>
                <th className="p-4">Last Message</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Lead Captured</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No conversations yet. When visitors chat with your bots, sessions will appear here live.
                  </td>
                </tr>
              ) : (
                conversations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{c.visitorName || "Website Visitor"}</td>
                    <td className="p-4 text-slate-700 font-medium">{c.botName || "aa"}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{c.lastMessage || "(In progress)"}</td>
                    <td className="p-4 font-mono text-slate-500">{c.duration || "1m"}</td>
                    <td className="p-4">
                      {c.isLead ? (
                        <span className="font-bold text-emerald-700 text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          YES
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No</span>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={c.status || "Active"} size="sm" />
                    </td>
                    <td className="p-4 text-right text-slate-400">{c.startedAt || "Just now"}</td>
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
