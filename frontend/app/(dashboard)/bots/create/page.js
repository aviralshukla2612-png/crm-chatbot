"use client";

import React from "react";
import CreateBotWizard from "@/components/bots/CreateBotWizard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CreateBotPage() {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/bots"
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Create AI Assistant
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Build and train an autonomous conversational agent in minutes.
          </p>
        </div>
      </div>

      <CreateBotWizard />
    </div>
  );
}
