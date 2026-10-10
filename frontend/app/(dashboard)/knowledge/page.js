"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Globe,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import KnowledgeGapsModal from "@/components/knowledge/KnowledgeGapsModal";
import WebsiteKnowledgeManager from "@/components/knowledge/WebsiteKnowledgeManager";
import { knowledgeApi } from "@/lib/api/knowledge";

export default function KnowledgePage() {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("documents");
  const [documents, setDocuments] = useState([]);
  const [qas, setQas] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Modals state
  const [qaModalOpen, setQaModalOpen] = useState(false);
  const [newQA, setNewQA] = useState({ question: "", answer: "" });
  const [webModalOpen, setWebModalOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedGap, setSelectedGap] = useState(null);

  const processFiles = (files) => {
    if (!files || files.length === 0) return;
    const newDocs = Array.from(files).map((file) => {
      const ext = file.name.split(".").pop()?.toUpperCase() || "PDF";
      const sizeFormatted =
        file.size > 1024 * 1024
          ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
          : Math.round(file.size / 1024) + " KB";

      return {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        size: sizeFormatted,
        type: ext,
        chunks: Math.floor(Math.random() * 25) + 8,
        status: "Processing",
        uploadedDate: "Just now",
      };
    });

    setDocuments((prev) => [...newDocs, ...prev]);

    // Simulate vectorization completed to Ready
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) => (d.status === "Processing" ? { ...d, status: "Ready" } : d))
      );
    }, 1200);
  };

  const handleFileInputChange = (e) => {
    processFiles(e.target.files);
    if (e.target) e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  useEffect(() => {
    async function loadData() {
      const docs = await knowledgeApi.getDocuments();
      const qList = await knowledgeApi.getQAPairs();
      const webs = await knowledgeApi.getWebsites();
      const gpList = await knowledgeApi.getKnowledgeGaps();
      setDocuments(docs);
      setQas(qList);
      setWebsites(webs);
      setGaps(gpList);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleAddQA = async (e) => {
    e.preventDefault();
    if (!newQA.question || !newQA.answer) return;
    const created = await knowledgeApi.addQAPair("bot_sales_01", newQA);
    setQas([created, ...qas]);
    setNewQA({ question: "", answer: "" });
    setQaModalOpen(false);
  };

  const handleDeleteQA = async (id) => {
    await knowledgeApi.deleteQAPair(id);
    setQas(qas.filter((q) => q.id !== id));
  };

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    const created = await knowledgeApi.addWebsite("bot_sales_01", newUrl);
    setWebsites([created, ...websites]);
    setNewUrl("");
    setWebModalOpen(false);
  };

  const handleDeleteDocument = async (id) => {
    await knowledgeApi.deleteDocument(id);
    setDocuments(documents.filter((d) => d.id !== id));
  };

  const handleGapResolved = (gapId) => {
    setGaps(gaps.filter((g) => g.id !== gapId));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Knowledge Engine
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Train your AI bots with documents, verified answers, web pages, and resolve visitor knowledge gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "qa" && (
            <button
              onClick={() => setQaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Q&A Pair
            </button>
          )}
          {activeTab === "websites" && (
            <button
              onClick={() => setWebModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Website URL
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-6 text-xs font-semibold">
        {[
          { id: "documents", label: "Documents", icon: FileText, count: documents.length },
          { id: "qa", label: "Questions & Answers", icon: HelpCircle, count: qas.length },
          { id: "websites", label: "Websites", icon: Globe, count: websites.length },
          {
            id: "gaps",
            label: "Knowledge Gaps",
            icon: AlertCircle,
            badge: gaps.length > 0 ? `${gaps.length} Actionable` : null,
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 pb-3.5 relative transition-colors ${
                activeTab === t.id
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge ? (
                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                  {t.badge}
                </span>
              ) : t.count !== undefined ? (
                <span className="text-[10px] text-neutral-400 font-mono">({t.count})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Documents */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept=".pdf,.docx,.txt,.csv"
            className="hidden"
          />

          {/* Uploader Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20 scale-[1.01]"
                : "border-neutral-300 dark:border-neutral-800 hover:border-indigo-500 bg-white dark:bg-neutral-900 shadow-2xs"
            }`}
          >
            <Upload className="w-10 h-10 mx-auto text-indigo-500 mb-2" />
            <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">
              {isDragging ? "Drop your PDF or knowledge files here" : "Click to browse or Drag & Drop Knowledge Files Here"}
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              Supports PDF, DOCX, TXT, CSV up to 25MB. Files are automatically chunked and embedded in vector storage.
            </p>
          </div>

          {/* Documents Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 font-medium uppercase text-[10px] border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="p-4">File Name</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Vector Chunks</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Uploaded</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40">
                      <td className="p-4 font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        {doc.name}
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-sm">
                          {doc.type}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-500">{doc.size}</td>
                      <td className="p-4 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {doc.chunks} chunks
                      </td>
                      <td className="p-4">
                        <StatusBadge status={doc.status} size="sm" />
                      </td>
                      <td className="p-4 text-neutral-400">{doc.uploadedDate}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Q&A */}
      {activeTab === "qa" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {qas.map((qa) => (
              <div
                key={qa.id}
                className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                      VERIFIED Q&A
                    </span>
                    <span className="text-neutral-400 text-[11px]">{qa.createdDate}</span>
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Q: {qa.question}
                  </h4>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    A: {qa.answer}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteQA(qa.id)}
                  className="p-2 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Websites */}
      {activeTab === "websites" && (
        <WebsiteKnowledgeManager botId="bot_sales_01" />
      )}

      {/* TAB 4: Knowledge Gaps (Important SaaS feature) */}
      {activeTab === "gaps" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-semibold text-xs text-amber-900 dark:text-amber-200">
                  Automated Gap Detection Engine
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  These questions were asked repeatedly by website visitors where your bots could not find matching embeddings. Resolve them with one click.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {gaps.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-400 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                🎉 All customer queries are currently covered! No knowledge gaps detected.
              </div>
            ) : (
              gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        Asked {gap.askedCount} Times
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Category: {gap.suggestedCategory}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                      "{gap.question}"
                    </h4>
                    <p className="text-[11px] text-neutral-400">First detected: {gap.firstAsked}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedGap(gap)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Add Answer
                    </button>
                    <button
                      onClick={async () => {
                        await knowledgeApi.ignoreKnowledgeGap(gap.id);
                        setGaps(gaps.filter((g) => g.id !== gap.id));
                      }}
                      className="px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Q&A Modal */}
      <Modal
        isOpen={qaModalOpen}
        onClose={() => setQaModalOpen(false)}
        title="Add Verified Q&A Pair"
        description="Provide an exact question and authoritative answer for your bot."
      >
        <form onSubmit={handleAddQA} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              User Question
            </label>
            <input
              type="text"
              required
              placeholder="e.g. What is your refund policy?"
              value={newQA.question}
              onChange={(e) => setNewQA({ ...newQA, question: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
            />
          </div>
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Verified Answer
            </label>
            <textarea
              rows={4}
              required
              placeholder="e.g. We offer a full 14-day money-back guarantee..."
              value={newQA.answer}
              onChange={(e) => setNewQA({ ...newQA, answer: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQaModalOpen(false)}
              className="px-3.5 py-2 text-neutral-500 hover:bg-neutral-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
            >
              Save Q&A
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Website Modal */}
      <Modal
        isOpen={webModalOpen}
        onClose={() => setWebModalOpen(false)}
        title="Add Website Source"
        description="Our crawler will extract text content and index all reachable pages."
      >
        <form onSubmit={handleAddWebsite} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Website URL
            </label>
            <input
              type="url"
              required
              placeholder="https://example.com/docs"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWebModalOpen(false)}
              className="px-3.5 py-2 text-neutral-500 hover:bg-neutral-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
            >
              Start Crawling
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Knowledge Gap Modal */}
      <KnowledgeGapsModal
        gap={selectedGap}
        isOpen={!!selectedGap}
        onClose={() => setSelectedGap(null)}
        onResolved={handleGapResolved}
      />
    </div>
  );
}
