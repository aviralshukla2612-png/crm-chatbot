"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  X,
  Play,
  Pause,
  ChevronRight,
  ShieldCheck,
  FileText,
  Filter,
  Check,
  HelpCircle,
  Send,
  Bot,
  Sparkles,
} from "lucide-react";

export default function WebsiteKnowledgeManager({ botId = "bot_sales_01" }) {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null);

  // Add Website Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    baseUrl: "",
    crawlScope: "entire", // homepage, selected, entire
    maxPages: 50,
    includePatterns: "",
    excludePatterns: "/admin/*, /cart/*, /login/*",
    syncSchedule: "manual",
    permissionConfirmed: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Pages Drawer State
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pageSearch, setPageSearch] = useState("");

  // Test Chat Drawer State
  const [isTestChatOpen, setIsTestChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am ready to answer questions using your imported website content. Ask me anything about your products, services, or FAQs!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Load Connected Websites
  const loadWebsites = async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/websites`);
      const data = await res.json();
      if (data.sources) {
        setWebsites(data.sources);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, [botId]);

  // Polling for Active Ingestion Progress
  useEffect(() => {
    const hasActiveCrawl = websites.some(
      (w) => w.status === "Crawling" || w.status === "Pending"
    );
    if (!hasActiveCrawl) return;

    const timer = setInterval(() => {
      loadWebsites();
    }, 2000);
    return () => clearInterval(timer);
  }, [websites]);

  // Submit Add Website
  const handleAddWebsite = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.baseUrl) {
      setFormError("Please enter a valid website URL.");
      return;
    }

    if (!formData.permissionConfirmed) {
      setFormError("Please confirm you have permission to index this website.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bots/${botId}/websites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          baseUrl: formData.baseUrl,
          crawlScope: formData.crawlScope,
          maxPages: Number(formData.maxPages) || 50,
          includePatterns: formData.includePatterns
            ? formData.includePatterns.split(",").map((s) => s.trim())
            : [],
          excludePatterns: formData.excludePatterns
            ? formData.excludePatterns.split(",").map((s) => s.trim())
            : [],
          syncSchedule: formData.syncSchedule,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Failed to initiate website crawling.");
        setSubmitting(false);
        return;
      }

      setIsAddModalOpen(false);
      setFormData({
        name: "",
        baseUrl: "",
        crawlScope: "entire",
        maxPages: 50,
        includePatterns: "",
        excludePatterns: "/admin/*, /cart/*, /login/*",
        syncSchedule: "manual",
        permissionConfirmed: false,
      });
      loadWebsites();
    } catch (err) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Re-sync Website
  const handleSyncWebsite = async (websiteId) => {
    try {
      await fetch(`/api/websites/${websiteId}/sync`, { method: "POST" });
      loadWebsites();
    } catch (e) {
      console.error(e);
    }
  };

  // Cancel / Pause Crawl
  const handleCancelCrawl = async (websiteId) => {
    try {
      await fetch(`/api/websites/${websiteId}/cancel`, { method: "POST" });
      loadWebsites();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Website Knowledge
  const handleDeleteWebsite = async (websiteId) => {
    if (!confirm("Are you sure you want to delete this website knowledge and its vector embeddings?")) {
      return;
    }
    try {
      await fetch(`/api/websites/${websiteId}`, { method: "DELETE" });
      loadWebsites();
      if (selectedWebsite?.id === websiteId) setSelectedWebsite(null);
    } catch (e) {
      console.error(e);
    }
  };

  // View Indexed Pages Drawer
  const handleViewPages = async (website) => {
    setSelectedWebsite(website);
    setLoadingPages(true);
    try {
      const res = await fetch(`/api/websites/${website.id}/pages`);
      const data = await res.json();
      setPages(data.pages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPages(false);
    }
  };

  // Toggle Page Exclusion
  const handleToggleExclusion = async (pageId, currentStatus) => {
    const willExclude = currentStatus !== "Excluded";
    try {
      await fetch(`/api/websites/${selectedWebsite.id}/pages/${pageId}/exclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excluded: willExclude }),
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, crawlStatus: willExclude ? "Excluded" : "Indexed" } : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Send Test Message
  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch(`/api/public/chat/${botId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: chatMessages.slice(-4),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, sources: data.sources || [] },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error querying chatbot knowledge." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-white to-white border border-indigo-100 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/30">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Website Knowledge Ingestion
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect your website URL to auto-extract pages, build vector embeddings, and answer queries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsTestChatOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Test with Website Knowledge</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Website</span>
          </button>
        </div>
      </div>

      {/* Connected Websites List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-900">
              Connected Websites
            </h4>
            <span className="text-xs font-semibold text-slate-400">
              ({websites.length})
            </span>
          </div>
          <button
            onClick={loadWebsites}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {websites.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Globe className="w-6 h-6" />
            </div>
            <h5 className="font-bold text-sm text-slate-800">
              No websites connected yet
            </h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your public website URL to crawl documentation, pricing, FAQs, and product catalogs automatically.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Website URL</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {websites.map((web) => (
              <div key={web.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {web.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          web.status === "Ready"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : web.status === "Crawling"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                            : web.status === "Failed"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {web.status}
                      </span>
                    </div>

                    <a
                      href={web.baseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 hover:underline"
                    >
                      <span>{web.baseUrl}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                      <span>Indexed: <strong className="text-slate-700">{web.pagesIndexed} pages</strong></span>
                      <span>•</span>
                      <span>Discovered: <strong className="text-slate-700">{web.pagesDiscovered}</strong></span>
                      <span>•</span>
                      <span>Scope: <strong className="text-slate-700 capitalize">{web.crawlScope}</strong></span>
                      <span>•</span>
                      <span>Last Synced: <strong className="text-slate-700">{web.lastSyncedAt ? new Date(web.lastSyncedAt).toLocaleDateString() : "Just now"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleViewPages(web)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    View Pages
                  </button>

                  {web.status === "Crawling" ? (
                    <button
                      onClick={() => handleCancelCrawl(web.id)}
                      className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSyncWebsite(web.id)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs transition-colors cursor-pointer"
                      title="Re-synchronize Knowledge"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteWebsite(web.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Website"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Add Website Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Connect Website Knowledge
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWebsite} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Website Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Website Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., My Company Documentation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden focus:border-indigo-600"
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Website URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden focus:border-indigo-600 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Protected with SSRF validation. Private IP ranges and localhost are blocked.
                </p>
              </div>

              {/* Crawl Scope */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Crawl Scope
                </label>
                <select
                  value={formData.crawlScope}
                  onChange={(e) => setFormData({ ...formData, crawlScope: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden focus:border-indigo-600 cursor-pointer"
                >
                  <option value="entire">Entire public website (Follow internal links & sitemap)</option>
                  <option value="homepage">Homepage only</option>
                  <option value="selected">Selected URL patterns only</option>
                </select>
              </div>

              {/* Maximum Pages */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Maximum Pages
                  </label>
                  <select
                    value={formData.maxPages}
                    onChange={(e) => setFormData({ ...formData, maxPages: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden focus:border-indigo-600 cursor-pointer"
                  >
                    <option value={10}>10 pages (Quick test)</option>
                    <option value={50}>50 pages (Standard)</option>
                    <option value={100}>100 pages</option>
                    <option value={250}>250 pages</option>
                    <option value={500}>500 pages (Enterprise)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sync Schedule
                  </label>
                  <select
                    value={formData.syncSchedule}
                    onChange={(e) => setFormData({ ...formData, syncSchedule: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="manual">Manual only</option>
                    <option value="daily">Daily automatic sync</option>
                    <option value="weekly">Weekly automatic sync</option>
                  </select>
                </div>
              </div>

              {/* Exclude Patterns */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Exclude URL Patterns
                </label>
                <input
                  type="text"
                  placeholder="/admin/*, /cart/*, /checkout/*"
                  value={formData.excludePatterns}
                  onChange={(e) => setFormData({ ...formData, excludePatterns: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden focus:border-indigo-600 font-mono text-xs"
                />
              </div>

              {/* Permission Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permissionConfirmed}
                    onChange={(e) => setFormData({ ...formData, permissionConfirmed: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-600 leading-relaxed">
                    I confirm that I own or have explicit authorization to index and crawl this public website content for my AI assistant.
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Initiating Crawl..." : "Start Crawl & Index"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Indexed Pages */}
      {selectedWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Indexed Pages: {selectedWebsite.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {pages.length} pages indexed in vector knowledge base
                </p>
              </div>
              <button
                onClick={() => setSelectedWebsite(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter pages by URL or title..."
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 outline-hidden"
                />
              </div>
            </div>

            {/* Pages List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4 space-y-3">
              {loadingPages ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading indexed pages...</div>
              ) : pages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No pages recorded yet. Pages will populate once the crawler completes.
                </div>
              ) : (
                pages
                  .filter((p) =>
                    pageSearch
                      ? p.url.toLowerCase().includes(pageSearch.toLowerCase()) ||
                        p.title?.toLowerCase().includes(pageSearch.toLowerCase())
                      : true
                  )
                  .map((page) => (
                    <div
                      key={page.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-xs text-slate-800 line-clamp-1">
                            {page.title || page.url}
                          </div>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 hover:underline truncate"
                          >
                            <span>{page.url}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            page.crawlStatus === "Indexed"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {page.crawlStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[10px] text-slate-400">
                        <span>Chunks: <strong className="text-slate-600">{page.chunksCount} vectors</strong></span>
                        <button
                          onClick={() => handleToggleExclusion(page.id, page.crawlStatus)}
                          className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {page.crawlStatus === "Excluded" ? "Include in RAG" : "Exclude from RAG"}
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: Interactive Website Knowledge Test */}
      {isTestChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col border-l border-slate-200 animate-slide-left">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <div>
                  <h4 className="font-bold text-sm">Website Knowledge Playground</h4>
                  <p className="text-[11px] text-indigo-200">Live Q&A testing against crawled content</p>
                </div>
              </div>
              <button
                onClick={() => setIsTestChatOpen(false)}
                className="p-1 rounded-lg text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl shadow-2xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>Source: </span>
                        <span className="font-semibold text-slate-600">
                          {msg.sources[0].title || msg.sources[0].url}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-400 w-fit">
                  Searching website knowledge base...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendTestMessage} className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask a question about your website..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
