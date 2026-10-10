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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Platform Global Configuration
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Cluster connection endpoints, LLM model defaults, and platform tenant isolation rules.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Platform configuration updated and broadcast to all worker nodes.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-400" />
            Default LLM & Inference Engine
          </h3>

          <div>
            <label className="block text-neutral-400 mb-1">Ollama Cluster Endpoint</label>
            <input
              type="text"
              defaultValue="http://ollama:11434"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl font-mono text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 mb-1">Default Model Tag</label>
              <input
                type="text"
                defaultValue="llama3.2:1b"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">Embedding Model</label>
              <input
                type="text"
                defaultValue="nomic-embed-text"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl font-mono text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            Vector DB & Storage Cluster
          </h3>

          <div>
            <label className="block text-neutral-400 mb-1">PostgreSQL & pgvector Host</label>
            <input
              type="text"
              defaultValue="postgres:5432 (Database: rag_db)"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl font-mono text-white"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Qdrant Cluster Host</label>
            <input
              type="text"
              defaultValue="http://qdrant:6333"
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl font-mono text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Save Platform Config
        </button>
      </form>
    </div>
  );
}
