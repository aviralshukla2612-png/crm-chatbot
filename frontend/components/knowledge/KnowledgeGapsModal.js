"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { knowledgeApi } from "@/lib/api/knowledge";
import { CheckCircle2, Sparkles } from "lucide-react";

export default function KnowledgeGapsModal({ gap, isOpen, onClose, onResolved }) {
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!gap) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsSaving(true);
    await knowledgeApi.resolveKnowledgeGap(gap.id, answer);
    setIsSaving(false);
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      setAnswer("");
      if (onResolved) onResolved(gap.id);
      onClose();
    }, 900);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Knowledge Gap"
      description={`This question was asked ${gap.askedCount} times by visitors and went unanswered.`}
    >
      {success ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">
            Knowledge updated successfully!
          </h4>
          <p className="text-xs text-neutral-500">
            Vector embeddings generated and synced to Qdrant/pgvector. The bot will now answer this inquiry instantly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">
              Unanswered Visitor Query:
            </span>
            <p className="text-neutral-800 dark:text-neutral-200 font-medium">
              "{gap.question}"
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Provide the Official Answer
            </label>
            <textarea
              rows={4}
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. Yes, we provide 30 days of complimentary post-launch support and offer tailored monthly SLA packages starting from..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSaving ? "Syncing..." : "Save & Sync Vector Store"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
