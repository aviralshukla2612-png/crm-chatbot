"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  Trash2,
  Power,
  PowerOff,
  Search,
  ExternalLink,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { botsApi } from "@/lib/api/bots";

export default function AdminBotsPage() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await botsApi.getBots();
      setBots(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Global Bot Registry
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Inspect, evaluate performance, and audit every AI assistant created across all tenants.
        </p>
      </div>

      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-900 text-neutral-400 font-medium uppercase text-[10px] border-b border-neutral-800">
              <tr>
                <th className="p-4">Bot Assistant</th>
                <th className="p-4">Tenant Org</th>
                <th className="p-4">Style</th>
                <th className="p-4">Questions</th>
                <th className="p-4">Chats</th>
                <th className="p-4">Leads</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {bots.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{b.avatar}</span>
                      <div>
                        <p className="font-bold text-white">{b.name}</p>
                        <p className="text-[10px] font-mono text-neutral-500">{b.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-neutral-300">Emperor Smart Solutions</td>
                  <td className="p-4 text-neutral-400">{b.personality}</td>
                  <td className="p-4 font-mono font-bold text-neutral-300">
                    {b.questionsCount}
                  </td>
                  <td className="p-4 font-mono text-neutral-300">{b.conversationsCount}</td>
                  <td className="p-4 font-mono text-emerald-400 font-bold">{b.leadsCount}</td>
                  <td className="p-4">
                    <StatusBadge status={b.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    <a
                      href={`/bots/${b.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
                    >
                      Inspect <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
