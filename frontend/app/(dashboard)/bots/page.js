"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronDown,
  Play,
  Share2,
  BarChart2,
  ExternalLink,
  MoreVertical,
  Bot,
  Trash2,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Code,
  Globe,
  X,
  Download,
  ShieldCheck,
} from "lucide-react";
import { botsApi } from "@/lib/api/bots";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import RealtimeBadge from "@/components/ui/RealtimeBadge";

export default function BotsPage() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("All");
  const [search, setSearch] = useState("");

  // Instant Deploy Modal State
  const [deployModalBot, setDeployModalBot] = useState(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [modalCmsTab, setModalCmsTab] = useState("html");

  const loadBots = async () => {
    try {
      const data = await botsApi.getBots();
      setBots(data || []);
    } catch (err) {
      console.warn("Bots real-time sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE event stream + adaptive background polling)
  const { isLive, lastSync, triggerSync } = useRealtimeSync(loadBots, {
    pollingInterval: 3500,
  });

  const handleDeleteBot = async (id, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this bot?")) {
      setBots((prev) => prev.filter((b) => b.id !== id));
      await botsApi.deleteBot(id);
      await loadBots();
    }
  };

  const filtered = bots.filter((b) => {
    if (filterTab === "Active" && b.status !== "Active") return false;
    if (filterTab === "Draft" && b.status !== "Draft") return false;
    if (filterTab === "Disabled" && b.status !== "Disabled") return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = bots.filter((b) => b.status === "Active").length;
  const draftCount = bots.filter((b) => b.status === "Draft").length;

  const appOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://187.127.158.24:3300";

  const getEmbedSnippet = (bot) => {
    if (!bot) return "";
    const idToUse = bot.id || "bot_aa";
    return `<script
  src="${appOrigin}/widget.js"
  data-bot-id="${idToUse}"
  data-color="${bot.primaryColor || "#4f46e5"}"
  data-position="${bot.launcherPosition || "bottom-right"}"
  defer
></script>`;
  };

  const handleCopyScript = (bot) => {
    const code = getEmbedSnippet(bot);
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadSampleHtml = (bot) => {
    if (!bot) return;
    const code = getEmbedSnippet(bot);
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bot.name} - Chatbot Live Embed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 40px;
      line-height: 1.6;
    }
    .card {
      max-width: 650px;
      margin: 40px auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.3);
    }
    h1 { margin-bottom: 8px; color: #ffffff; }
    p { color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello from ${bot.name}!</h1>
    <p>This is a test page. Your AI chatbot assistant is active in the bottom-right corner.</p>
  </div>

  <!-- NexusAI Embed Script -->
  ${code}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexusai-${bot.name.toLowerCase().replace(/\s+/g, "-")}-test.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-800 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Bots
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and manage your AI assistants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RealtimeBadge isLive={isLive} lastSync={lastSync} onRefresh={triggerSync} />

          <Link
            href="/bots/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all w-fit cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create AI Bot</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-4 text-xs font-semibold border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0 w-full sm:w-auto">
          {[
            { id: "All", label: `All Bots (${bots.length})` },
            { id: "Active", label: `Active (${activeCount})` },
            { id: "Draft", label: `Draft (${draftCount})` },
            { id: "Disabled", label: "Disabled (0)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`pb-1 transition-colors relative cursor-pointer ${
                filterTab === tab.id
                  ? "text-indigo-600 border-b-2 border-indigo-600 font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bots..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-hidden focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 shrink-0">
            <span>Last Updated</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Empty State when no bots exist */}
      {!loading && bots.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs my-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              No AI bots created yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Get started by creating your first AI assistant. You can give it a name, upload documents, and configure its personality in a few simple steps.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/bots/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Bot</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Bot Cards List */}
      {!loading && bots.length > 0 && (
        <div className="space-y-4">
          {filtered.map((bot) => (
            <div
              key={bot.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all space-y-4"
            >
              {/* Top row: Avatar, Name, Status, Description */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs"
                    style={{
                      backgroundColor: bot.primaryColor ? `${bot.primaryColor}15` : "#eef2ff",
                      color: bot.primaryColor || "#4f46e5",
                    }}
                  >
                    {bot.avatar || "🤖"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">
                        {bot.name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bot.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                            : "bg-blue-50 text-blue-700 border border-blue-200/50"
                        }`}
                      >
                        {bot.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {bot.description || "Custom AI chatbot assistant."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleDeleteBot(bot.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Bot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Middle row: 3 metrics + Last active */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-8">
                  <div>
                    <span className="text-base font-bold text-slate-900 block leading-tight">
                      {bot.conversationsCount || 0}
                    </span>
                    <span className="text-[11px] text-slate-400">Conversations</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 block leading-tight">
                      {bot.questionsCount || 0}
                    </span>
                    <span className="text-[11px] text-slate-400">Questions</span>
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 block leading-tight">
                      {bot.leadsCount || 0}
                    </span>
                    <span className="text-[11px] text-slate-400">Leads</span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400">
                  <span>Last active</span>
                  <span className="font-semibold text-slate-700 block">
                    {bot.lastActive || "Just now"}
                  </span>
                </div>
              </div>

              {/* Bottom row: Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <Link
                  href={`/bots/${bot.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </Link>

                {/* Direct Live Website Deploy Button */}
                <a
                  href={bot.websiteUrl || "https://cashbook.vardaansmartsolutions.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Open live website with chatbot active"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Live Website Deploy 🚀</span>
                </a>

                <Link
                  href={`/bots/${bot.id}`}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-slate-500" />
                  <span>Test</span>
                </Link>

                <Link
                  href="/analytics"
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Analytics</span>
                </Link>

                {/* Instant Deploy Modal Trigger */}
                <button
                  type="button"
                  onClick={() => setDeployModalBot(bot)}
                  className="px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Embed Code</span>
                </button>

                {/* Explicit Direct Delete Button */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteBot(bot.id, e)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-300 bg-rose-50/50 hover:bg-rose-100/70 text-rose-600 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                  title="Permanently delete this bot"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Bot</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INSTANT DEPLOY MODAL */}
      {deployModalBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden space-y-0 animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-xs"
                  style={{
                    backgroundColor: `${deployModalBot.primaryColor || "#4f46e5"}15`,
                    color: deployModalBot.primaryColor || "#4f46e5",
                  }}
                >
                  {deployModalBot.avatar || "🤖"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Deploy "{deployModalBot.name}" on Your Website
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Copy the embed code snippet below and paste it into any website HTML.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDeployModalBot(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Embed Code Snippet Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-indigo-600" />
                    HTML Embed Snippet
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Paste before closing <code className="bg-slate-100 px-1 py-0.5 rounded">&lt;/body&gt;</code>
                  </span>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-2xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
                    {getEmbedSnippet(deployModalBot)}
                  </pre>
                  <button
                    onClick={() => handleCopyScript(deployModalBot)}
                    className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a
                  href="/test-embed.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-900 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold block text-xs">Test on Live Demo Website</span>
                      <span className="text-[11px] text-indigo-600">See widget floating in action</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                </a>

                <button
                  type="button"
                  onClick={() => handleDownloadSampleHtml(deployModalBot)}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold block text-xs">Download HTML File</span>
                      <span className="text-[11px] text-slate-500">Ready-to-open local sample</span>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>

              {/* Platform Guides */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-700 text-xs">Platform Guide:</span>
                  {["html", "wordpress", "shopify", "webflow"].map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setModalCmsTab(plat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        modalCmsTab === plat
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {plat.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-600 leading-relaxed">
                  {modalCmsTab === "html" && (
                    <p>
                      Open your website's <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">index.html</code>. Paste the script tag right above the closing <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">&lt;/body&gt;</code> tag and save.
                    </p>
                  )}
                  {modalCmsTab === "wordpress" && (
                    <p>
                      In WordPress Admin, install WPCode / Header & Footer plugin. Navigate to <strong>Code Snippets &rarr; Header & Footer</strong>, paste the snippet into <strong>Footer</strong>, and click <strong>Save</strong>.
                    </p>
                  )}
                  {modalCmsTab === "shopify" && (
                    <p>
                      In Shopify Admin, go to <strong>Online Store &rarr; Themes &rarr; Actions &rarr; Edit code</strong>. Open <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">theme.liquid</code> and paste before <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">&lt;/body&gt;</code>.
                    </p>
                  )}
                  {modalCmsTab === "webflow" && (
                    <p>
                      In Webflow Project Settings &rarr; <strong>Custom Code</strong> &rarr; <strong>Footer Code</strong>. Paste snippet and click <strong>Publish</strong>.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/bots/${deployModalBot.id}/deploy`}
                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold text-xs cursor-pointer"
              >
                <span>Open Full Customization Studio &rarr;</span>
              </Link>

              <button
                onClick={() => setDeployModalBot(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
