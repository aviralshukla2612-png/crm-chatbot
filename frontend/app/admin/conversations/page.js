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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Global Platform Conversations
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Monitor chat transcripts and question compliance across all client deployments.
        </p>
      </div>

      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-900 text-neutral-400 font-medium uppercase text-[10px] border-b border-neutral-800">
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
            <tbody className="divide-y divide-neutral-800/80">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="p-4 font-bold text-white">{c.visitorName}</td>
                  <td className="p-4 text-neutral-300">{c.botName}</td>
                  <td className="p-4 text-neutral-400 max-w-xs truncate">{c.lastMessage}</td>
                  <td className="p-4 font-mono text-neutral-400">{c.duration}</td>
                  <td className="p-4">
                    {c.isLead ? (
                      <span className="font-bold text-emerald-400 text-[10px] bg-emerald-950 px-2 py-0.5 rounded-full">
                        YES
                      </span>
                    ) : (
                      <span className="text-neutral-500 text-[10px]">No</span>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="p-4 text-right text-neutral-400">{c.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
