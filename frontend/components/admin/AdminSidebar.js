"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Building2,
  Users,
  Bot,
  Users2,
  HardDrive,
  Activity,
  Settings,
  HelpCircle,
  LayoutDashboard,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "AI Evaluations", href: "/admin/ai-evaluations", icon: Sparkles },
  { name: "Organizations", href: "/admin/organizations", icon: Building2 },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Bots", href: "/admin/bots", icon: Bot },
  { name: "Conversations", href: "/admin/conversations", icon: MessageSquare },
  { name: "Leads", href: "/admin/leads", icon: Users2 },
  { name: "Usage", href: "/admin/usage", icon: HardDrive },
  { name: "System Health", href: "/admin/system", icon: Activity },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111827] text-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto shrink-0 select-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* ChatPilot Logo & Super Admin Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <MessageSquare className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              ChatPilot
            </span>
          </div>

          {/* Super Admin Badge Switcher */}
          <div className="mt-3.5 flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-200">Super Admin</span>
            </div>
            <Link
              href="/dashboard"
              title="Switch to Tenant Workspace"
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              Tenant App →
            </Link>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {adminNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all",
                  isActive
                    ? "bg-[#4f46e5] text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-white" : "text-slate-400"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Area */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          {/* Help & Support */}
          <Link
            href="/admin/system"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Platform Status</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </Link>

          {/* User Profile */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              SS
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">
                Srajan Shukla
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Super Admin
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
