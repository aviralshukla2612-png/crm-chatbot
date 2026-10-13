"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Bot,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Database,
  Users2,
  MessageSquare,
  Building2,
  ChevronRight,
} from "lucide-react";
import BotPreviewWidget from "@/components/bots/BotPreviewWidget";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              NexusAI <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-sm bg-indigo-950 text-indigo-400 border border-indigo-800">SaaS</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors"
            >
              Super Admin Portal
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 text-neutral-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-102"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero-Knowledge AI Chatbot SaaS Builder</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Turn Business Knowledge into an{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-violet-400 to-teal-400">
              Autonomous Sales AI
            </span>
          </h1>

          <p className="text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Create, train, and deploy production-grade AI assistants that qualify leads, quote prices, and answer customer inquiries without learning complex prompt engineering or vector databases.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-102"
            >
              Launch Organization Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/bots/create"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-bold text-sm text-neutral-200 transition-colors"
            >
              + Create Bot Wizard
            </Link>
          </div>
        </div>

        {/* Live Interactive Chatbot Playground Demo */}
        <div className="mt-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-6 sm:p-10 rounded-3xl bg-neutral-900/60 border border-neutral-800">
          <div className="space-y-4">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">
              Try It Right Now
            </span>
            <h2 className="text-2xl font-bold text-white">
              Experience the Emperor Sales Assistant Live
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Ask about ERP Starter vs Professional rates, e-commerce web applications, or discount approval policies. The bot grounds every answer with verified citations.
            </p>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Automatic multi-document & Q&A vector retrieval</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>In-chat lead capture trigger during high commercial intent</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero-discount policy guardrails enforced</span>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                Explore Organization Workspace <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div>
            <BotPreviewWidget
              botName="AI Sales Executive"
              avatar="💼"
              primaryColor="#4f46e5"
              welcomeMessage="Hello! Welcome to Emperor Smart Solutions. Ask about our ERP modules, web apps, or project timelines!"
              placeholderText="Type 'pricing for ERP' or 'discounts'..."
              showLeadForm={true}
            />
          </div>
        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-neutral-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Multi-Tenant Isolation</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Each organization manages its own isolated bots, knowledge collections, conversations, and leads without seeing other tenants.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Dedicated Super Admin</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Complete SaaS owner platform visibility: inspect any tenant bot, track global token usage, and monitor cluster health for AI Inference, pgvector, and automated webhooks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Automated Lead CRM</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Qualify inbound visitors on budget, authority, need, and timeline with real-time pipeline management and status workflows.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
