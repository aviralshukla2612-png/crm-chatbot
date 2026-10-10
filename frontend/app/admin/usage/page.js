"use client";

import React from "react";
import { Cpu, HardDrive, Database, MessageSquare, Bot, Layers } from "lucide-react";
import { mockPlatformUsage, mockOrganizations } from "@/lib/mock/data";

export default function AdminUsagePage() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Platform Compute & Resource Usage
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Monitor LLM inference tokens, vector database memory, and per-tenant resource consumption.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-teal-950 text-teal-400 border border-teal-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">LLM Inference Tokens</h3>
              <p className="text-xs text-neutral-400">Monthly token consumption</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{mockPlatformUsage.llmTokens}</div>
          <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full w-[48%]" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Vector Storage & Chunks</h3>
              <p className="text-xs text-neutral-400">pgvector & Qdrant collections</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{mockPlatformUsage.storageUsed}</div>
          <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-[25%]" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Documents Processed</h3>
              <p className="text-xs text-neutral-400">PDFs, Docs, and web crawls</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {mockPlatformUsage.documentsProcessed} files
          </div>
          <p className="text-xs text-emerald-400">12,480 vector embeddings generated</p>
        </div>
      </div>

      {/* Tenant Breakdown Table */}
      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="font-bold text-sm text-white">Tenant Usage Quotas</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-900 text-neutral-400 font-medium uppercase text-[10px] border-b border-neutral-800">
            <tr>
              <th className="p-4">Organization</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Bots</th>
              <th className="p-4">Monthly Questions</th>
              <th className="p-4">Quota Utilized</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/80">
            {mockOrganizations.map((o) => (
              <tr key={o.id} className="hover:bg-neutral-900/60 transition-colors">
                <td className="p-4 font-bold text-white">{o.name}</td>
                <td className="p-4 text-amber-300 font-mono">{o.plan}</td>
                <td className="p-4 font-mono text-indigo-400">{o.botsCount}</td>
                <td className="p-4 font-mono text-neutral-300">
                  {(o.conversationsCount * 2.8).toFixed(0)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full w-[45%]" />
                    </div>
                    <span className="font-mono text-neutral-400 text-[11px]">45%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
