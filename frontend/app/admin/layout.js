"use client";

import React, { useState, Suspense } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Menu, ShieldAlert, Search } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Banner Notice for Super Admin Mode */}
      <div className="bg-[#1e1b4b] border-b border-indigo-900/50 px-4 py-1.5 text-xs font-medium text-indigo-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Emperor Smart Solution • Master Platform Controller</span>
        </div>
        <Link
          href="/dashboard"
          className="underline text-indigo-300 hover:text-white text-[11px] font-semibold"
        >
          Switch to Tenant Workspace →
        </Link>
      </div>

      <div className="flex flex-1 min-h-[calc(100vh-32px)]">
        <Suspense fallback={<aside className="w-64 hidden lg:block bg-[#111827]" />}>
          <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </Suspense>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Admin Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 lg:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Global search tenants, bots, users..."
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500 text-slate-800 placeholder:text-slate-400 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div
                  title="Emperor Smart Solution (Super Admin)"
                  className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-default"
                >
                  ESS
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    Emperor Smart Solution
                  </p>
                  <p className="text-[10px] text-indigo-600 font-semibold leading-tight">
                    Super Admin
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
