"use client";

import React, { useState, useEffect } from "react";
import { Globe, ExternalLink, Code2, Check, ArrowRight, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { botsApi } from "@/lib/api/bots";

export default function DeployWebsiteModal({ isOpen, onClose, bot, onBotUpdated }) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (bot) {
      setUrl(bot.websiteUrl || "");
      setError("");
    }
  }, [bot, isOpen]);

  if (!bot) return null;

  const handleSaveAndOpen = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    let cleanUrl = (url || "").trim();
    if (!cleanUrl) {
      setError("Please enter a valid website URL (e.g., https://yourcompany.com)");
      return;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      new URL(cleanUrl);
    } catch (err) {
      setError("Please enter a valid URL including domain (e.g. https://yourwebsite.com)");
      return;
    }

    setSaving(true);
    try {
      await botsApi.updateBot(bot.id, { websiteUrl: cleanUrl });
      if (onBotUpdated) onBotUpdated({ ...bot, websiteUrl: cleanUrl });
      window.open(cleanUrl, "_blank", "noopener,noreferrer");
      onClose();
    } catch (err) {
      setError("Failed to save website URL. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deploy Chatbot to Live Website 🚀"
      description={`Connect ${bot.name || "your chatbot"} to your official website domain.`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSaveAndOpen} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Your Live Website URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              required
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              placeholder="https://yourwebsite.com"
              className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
            Enter your company or client's website URL. Once saved, clicking <strong>Live Website Deploy</strong> will open this URL with your chatbot active.
          </p>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 justify-end border-t border-neutral-100 dark:border-neutral-800">
          <a
            href={`/bots/${bot.id}/deploy`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            Get Embed Code
          </a>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save & Open Website 🚀"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
