"use client";

import React, { useState } from "react";
import { Settings, Shield, Server, Cpu, Database, CheckCircle2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Platform Global Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Cluster connection endpoints, LLM model defaults, and platform tenant isolation rules.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Platform configuration updated and broadcast to all worker nodes.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-600" />
            Default LLM & Inference Engine
          </h3>

          <div>
            <label className="block text-slate-600 font-medium mb-1">AI Inference Engine Endpoint</label>
            <input
              type="text"
              defaultValue="http://ai-engine:11434"
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Default Model Tag</label>
              <input
                type="text"
                defaultValue="ess-enterprise-neural"
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Embedding Model</label>
              <input
                type="text"
                defaultValue="ess-vector-embed"
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-600" />
            Vector DB & Storage Cluster
          </h3>

          <div>
            <label className="block text-slate-600 font-medium mb-1">PostgreSQL & pgvector Host</label>
            <input
              type="text"
              defaultValue="postgres:5432 (Database: rag_db)"
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Qdrant Cluster Host</label>
            <input
              type="text"
              defaultValue="http://qdrant:6333"
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Save Platform Config
        </button>
      </form>
    </div>
  );
}
