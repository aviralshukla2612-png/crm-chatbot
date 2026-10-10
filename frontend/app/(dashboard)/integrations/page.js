"use client";

import React, { useState } from "react";
import {
  Code,
  Smartphone,
  Webhook,
  Key,
  BarChart,
  MessageSquare,
  Mail,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

export default function IntegrationsPage() {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const integrations = [
    {
      id: "widget",
      name: "Website Floating Widget",
      desc: "Embed an interactive chat assistant with live streaming on any HTML, WordPress, or React site.",
      icon: Code,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950",
      status: "Connected",
      cta: "Configure Snippet",
    },
    {
      id: "whatsapp",
      name: "WhatsApp Cloud API",
      desc: "Connect your official WhatsApp Business number to automate 24/7 customer sales inquiries.",
      icon: Smartphone,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950",
      status: "Configured",
      cta: "Manage Webhook",
    },
    {
      id: "webhook",
      name: "Outbound Webhooks",
      desc: "Stream qualified leads directly to your internal CRM, n8n workflows, or ERP database.",
      icon: Webhook,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950",
      status: "Active",
      cta: "Webhook Endpoints",
    },
    {
      id: "rest",
      name: "Headless REST API",
      desc: "Direct JSON API for custom mobile apps, iOS, Android, and internal service backends.",
      icon: Key,
      color: "text-violet-600 bg-violet-50 dark:bg-violet-950",
      status: "Active",
      cta: "API Keys & Docs",
    },
    {
      id: "slack",
      name: "Slack Lead Alerts",
      desc: "Receive instant notifications in your company sales channel when a visitor requests an enterprise quote.",
      icon: MessageSquare,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-950",
      status: "Connected",
      cta: "Channel Settings",
    },
    {
      id: "ga4",
      name: "Google Analytics 4",
      desc: "Forward chatbot interaction and conversion goal events to your Google Analytics measurement ID.",
      icon: BarChart,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950",
      status: "Not Connected",
      cta: "Connect GA4",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Channels & Integrations
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Connect your AI assistants to website widgets, messaging gateways, CRMs, and webhooks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      item.status === "Connected" || item.status === "Active" || item.status === "Configured"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {item.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                  {item.cta}
                </button>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
