"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Bot,
  Building2,
  Trash2,
  Search,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { botsApi } from "@/lib/api/bots";

export default function AdminBotsPage() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  const loadBots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await botsApi.getBots();
      setBots(data || []);
    } catch (err) {
      console.error("Failed to load bots:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const handleDeleteBot = async (botId) => {
    if (!confirm(`Are you sure you want to permanently delete bot "${botId}"?`)) return;
    try {
      await fetch(`/api/bots/${botId}`, { method: "DELETE" });
      setBots((prev) => prev.filter((b) => b.id !== botId));
    } catch (err) {
      alert("Failed to delete bot: " + err.message);
    }
  };

  const handlePurgeTestData = async () => {
    if (!confirm("This will permanently remove all test/dummy bots created during development. Proceed?")) return;
    setPurging(true);
    try {
      const res = await fetch("/api/admin/clean-dummy", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await loadBots();
      } else {
        alert("Failed to purge test data: " + data.error);
      }
    } catch (err) {
      alert("Error purging test data: " + err.message);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Global Bot Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Inspect, evaluate performance, and audit every AI assistant created across all tenants.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadBots}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handlePurgeTestData}
            disabled={purging}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Purge all legacy test bots"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{purging ? "Purging..." : "Purge Dummy Bots"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
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
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Loading registry...</span>
                    </div>
                  </td>
                </tr>
              ) : bots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <p className="font-semibold text-sm">No bots registered yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Real bots will appear here when created by workspace administrators.
                    </p>
                  </td>
                </tr>
              ) : (
                bots.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{b.avatar || "🤖"}</span>
                        <div>
                          <p className="font-bold text-slate-900">{b.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{b.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {b.organizationName || b.company || b.organizationId || "Emperor Smart Solutions"}
                    </td>
                    <td className="p-4 text-slate-500">{b.personality || "Professional"}</td>
                    <td className="p-4 font-mono font-bold text-slate-800">
                      {b.questionsCount || 0}
                    </td>
                    <td className="p-4 font-mono text-slate-600">{b.conversationsCount || 0}</td>
                    <td className="p-4 font-mono text-emerald-600 font-bold">{b.leadsCount || 0}</td>
                    <td className="p-4">
                      <StatusBadge status={b.status || "Active"} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/bots/${b.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Inspect Bot"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteBot(b.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Delete Bot"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
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
