"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Menu,
  Bell,
  Search,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Shield,
} from "lucide-react";
import { mockCurrentUser } from "@/lib/mock/data";

export default function Header({ onToggleSidebar }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const notifications = [
    {
      id: "n_1",
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      title: "New high-intent lead captured",
      desc: "Rohan Varma requested an ERP Enterprise quote.",
      time: "10 mins ago",
      unread: true,
    },
    {
      id: "n_2",
      icon: FileText,
      iconColor: "text-indigo-500",
      title: "Document ready for search",
      desc: "Emperor_Services_RateCard_2026.pdf vectorized (42 chunks).",
      time: "1 hour ago",
      unread: true,
    },
    {
      id: "n_3",
      icon: AlertCircle,
      iconColor: "text-amber-500",
      title: "Unanswered question detected",
      desc: "'Do you offer post-launch maintenance?' was asked 37 times.",
      time: "3 hours ago",
      unread: true,
    },
  ];

  const handleClearNotifications = () => {
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      {/* Left section: mobile hamburger & search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search bots, knowledge, conversations, leads..."
            className="w-full pl-10 pr-4 py-2 text-xs lg:text-sm bg-neutral-100/70 dark:bg-neutral-800/60 border border-transparent focus:border-indigo-500 rounded-xl outline-hidden transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Right section: actions & notifications */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <Link
          href="/bots/create"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xs shadow-indigo-600/30 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Bot</span>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleClearNotifications}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Mark read
                  </button>
                )}
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-y-auto mt-2">
                {notifications.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="py-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl px-2 transition-colors cursor-pointer"
                    >
                      <div className={`p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0 ${item.iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {item.desc}
                        </p>
                        <span className="text-[10px] text-neutral-400 mt-1 block">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <Link
          href="/settings"
          className="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-neutral-800"
        >
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center">
            AS
          </div>
        </Link>
      </div>
    </header>
  );
}
