"use client";

import React, { useState } from "react";
import {
  Settings,
  Building,
  User,
  Shield,
  Bell,
  Key,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { mockCurrentUser, mockOrganizations } from "@/lib/mock/data";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const sections = [
    { id: "general", label: "General & Workspace", icon: Settings },
    { id: "profile", label: "My Profile", icon: User },
    { id: "security", label: "Security & Passwords", icon: Shield },
    { id: "notifications", label: "Notifications & Alerts", icon: Bell },
    { id: "billing", label: "Subscription & Billing", icon: CreditCard },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Account & Workspace Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Configure organization profiles, notification triggers, and plan subscriptions.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Settings successfully saved and synchronized.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Tabs */}
        <div className="w-full md:w-64 space-y-1 shrink-0">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                  activeSection === s.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xs">
          {activeSection === "general" && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-4">
                Organization Details
              </h3>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  defaultValue="Emperor Smart Solutions"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Default Currency
                </label>
                <select className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40">
                  <option>Indian Rupee (INR / ₹)</option>
                  <option>US Dollar (USD / $)</option>
                  <option>Euro (EUR / €)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Primary Market & Jurisdiction
                </label>
                <input
                  type="text"
                  defaultValue="India (GST applicable)"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
                />
              </div>

              <button
                type="submit"
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
              >
                Save Changes
              </button>
            </form>
          )}

          {activeSection === "profile" && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-4">
                Personal Profile
              </h3>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  defaultValue={mockCurrentUser.name}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  defaultValue={mockCurrentUser.email}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
                />
              </div>

              <button
                type="submit"
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
              >
                Update Profile
              </button>
            </form>
          )}

          {activeSection === "billing" && (
            <div className="space-y-6 text-xs">
              <div className="p-4 rounded-xl bg-linear-to-tr from-indigo-900 to-violet-900 text-white">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Current Subscription
                </span>
                <h4 className="text-xl font-bold mt-1">Enterprise Plan</h4>
                <p className="text-xs opacity-80 mt-1">
                  Unlimited vector chunks, autonomous lead qualification, and 24/7 dedicated support.
                </p>
                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-xs">
                  <span>Renews on May 15, 2026</span>
                  <span className="font-bold">Active</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <span className="font-bold text-neutral-900 dark:text-white block">
                  Usage Quotas
                </span>
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>Monthly Questions:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      3,892 / 50,000
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full w-[8%]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-4">
                Password & Authentication
              </h3>
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
                />
              </div>
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40"
                />
              </div>
              <button
                type="submit"
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
              >
                Change Password
              </button>
            </form>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white mb-4">
                Email & Push Notifications
              </h3>
              {[
                { title: "Immediate notification on qualified lead", def: true },
                { title: "Weekly bot performance report", def: true },
                { title: "Alert when knowledge gap is detected (>10 inquiries)", def: true },
                { title: "Monthly quota limit warning (>80%)", def: false },
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    defaultChecked={item.def}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
