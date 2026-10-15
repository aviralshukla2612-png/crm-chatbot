"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  MessageSquare,
  Users2,
  BarChart3,
  Puzzle,
  UserPlus,
  Settings,
  HelpCircle,
  ChevronDown,
  Building2,
  Sparkles,
  LogOut,
  X,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Bots", href: "/bots", icon: Bot },
  { name: "Knowledge", href: "/knowledge", icon: BookOpen },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Leads", href: "/leads", icon: Users2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Integrations", href: "/integrations", icon: Puzzle },
  { name: "Team", href: "/team", icon: UserPlus },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [currentOrg, setCurrentOrg] = useState("Acme Healthcare");

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111827] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto border-r border-slate-800/80",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand & Organization */}
        <div className="p-5 border-b border-slate-800/60">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                ChatPilot
              </span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Org Selector */}
          <div className="mt-4 relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentOrg}
                  </p>
                  <p className="text-[10px] text-slate-400">Organization</p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {orgDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1.5 text-xs">
                {["Acme Healthcare", "Emperor Smart Solutions", "Apex FinTech"].map(
                  (org) => (
                    <button
                      key={org}
                      onClick={() => {
                        setCurrentOrg(org);
                        setOrgDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors",
                        org === currentOrg && "text-indigo-400 font-semibold bg-slate-800/60"
                      )}
                    >
                      {org}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group",
                  isActive
                    ? "bg-[#4f46e5] text-white shadow-md shadow-indigo-600/30 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-transform group-hover:scale-105",
                    isActive ? "text-white" : "text-slate-400"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800/60 space-y-2">
          {/* Public Website Link */}
          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public Website</span>
            </div>
            <span className="text-[9px] font-mono bg-emerald-400/20 px-1 rounded-sm">
              LIVE
            </span>
          </Link>

          {/* Help link */}
          <a
            href="#help"
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Help & Support</span>
          </a>

          {/* User Profile */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-linear-to-tr from-indigo-500 to-violet-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                A
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  Administrator
                </p>
                <p className="text-[10px] text-indigo-400 font-medium">Workspace Owner</p>
              </div>
            </div>
            <Link
              href="/login"
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
