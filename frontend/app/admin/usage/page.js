"use client";

import React, { useState, useEffect } from "react";
import { Cpu, HardDrive, Database, Layers, CheckCircle2, TrendingUp, Server } from "lucide-react";
import { analyticsApi } from "@/lib/api/analytics";

export default function AdminUsagePage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await analyticsApi.getDashboardMetrics();
        setMetrics(data);
      } catch (e) {
        console.warn("Failed to load usage metrics", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalQuestions = metrics?.totalQuestions || 0;
  const totalConversations = metrics?.totalConversations || 0;
  const estimatedTokens = totalQuestions * 340 + totalConversations * 180;
  const tokenFormatted = estimatedTokens > 0 ? `${(estimatedTokens / 1000).toFixed(1)}k` : "0";
  const quotaPercent = Math.min(100, Math.max(1, Math.round((totalQuestions / 10000) * 100)));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Platform Compute & Resource Usage
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Monitor neural inference tokens, vector storage memory, and per-tenant resource consumption.
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Inference Tokens */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">AI Inference Tokens</h3>
              <p className="text-xs text-slate-500">Monthly token consumption</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {tokenFormatted} <span className="text-sm font-normal text-slate-400">/ 10M tokens</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {totalQuestions} prompt inquiries across all active bots
            </p>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, (estimatedTokens / 10000000) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Vector Storage */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Vector Storage & Chunks</h3>
              <p className="text-xs text-slate-500">pgvector & neural collections</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              1.2 GB <span className="text-sm font-normal text-slate-400">/ 50 GB</span>
            </div>
            <p className="text-[11px] text-slate-500">768-dim embeddings indexed</p>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-[2.4%]" />
          </div>
        </div>

        {/* Card 3: Documents Processed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Knowledge Sources</h3>
              <p className="text-xs text-slate-500">PDFs, Docs, and web crawls</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              1 Website <span className="text-sm font-normal text-slate-400">indexed</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Automated RAG Sync Active
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full w-[10%]" />
          </div>
        </div>
      </div>

      {/* Tenant Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Tenant Usage Quotas</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Resource allocation and quota limits per registered organization
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            1 Active Tenant
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="p-4">Organization</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Bots</th>
                <th className="p-4">Monthly Questions</th>
                <th className="p-4">Quota Utilized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    ESS
                  </div>
                  Emperor Smart Solutions
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Enterprise
                  </span>
                </td>
                <td className="p-4 font-bold text-indigo-600">
                  {metrics?.activeBotsCount ?? 1}
                </td>
                <td className="p-4 font-mono font-semibold text-slate-800">
                  {totalQuestions}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-36 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-600 text-[11px] font-semibold">
                      {quotaPercent}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
