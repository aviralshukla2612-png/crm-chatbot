"use client";

import React from "react";
import { Activity, Server, Database, Cpu, Webhook, CheckCircle2, RefreshCw } from "lucide-react";
import { mockSystemHealth } from "@/lib/mock/data";

export default function AdminSystemPage() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Infrastructure & System Health
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Real-time latency, uptime, and cluster status of Ollama, Qdrant, PostgreSQL, n8n, and API gateways.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Run Ping Diagnostics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockSystemHealth.map((item, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{item.service}</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">{item.details}</p>

            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800/80 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Config / Spec:</span>
                <span className="text-neutral-200">{item.model}</span>
              </div>
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Round-Trip Latency:</span>
                <span className="text-emerald-400 font-bold">{item.latency}</span>
              </div>
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Uptime (30d):</span>
                <span className="text-white font-bold">{item.uptime}</span>
              </div>
              <div className="flex justify-between text-neutral-400 text-[11px]">
                <span>Heartbeat:</span>
                <span className="text-neutral-500">{item.lastChecked}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
