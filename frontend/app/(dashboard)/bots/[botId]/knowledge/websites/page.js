"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Globe, Sparkles } from "lucide-react";
import WebsiteKnowledgeManager from "@/components/knowledge/WebsiteKnowledgeManager";

function BotWebsitesKnowledgeContent() {
  const routeParams = useParams();
  const botId = routeParams?.botId || "bot_sales_01";

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* Header Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link
          href={`/bots/${botId}`}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Websites Knowledge
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              Bot Knowledge Base
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-import knowledge from website URLs, generate vector embeddings, and answer visitor questions.
          </p>
        </div>
      </div>

      {/* Main Website Manager Component */}
      <WebsiteKnowledgeManager botId={botId} />
    </div>
  );
}

export default function BotWebsitesKnowledgePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading website knowledge...</div>}>
      <BotWebsitesKnowledgeContent />
    </Suspense>
  );
}
