"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  Mail,
  Lock,
  ArrowRight,
  ShieldAlert,
  Building,
  User,
  LayoutDashboard,
  Bot,
  MessageSquare,
  Users2,
  BarChart3,
  Palette,
  FileText,
  ShieldCheck,
  ChevronRight,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login"); // 'login' or 'register'
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("you@company.com");
  const [password, setPassword] = useState("••••••••••••");
  const [fullName, setFullName] = useState("Srajan Shukla");
  const [companyName, setCompanyName] = useState("Acme Healthcare");

  const handleSignIn = () => {
    setLoading(true);
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    } else {
      router.push("/dashboard");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSignIn();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans">
      {/* Left Column: Brand Hero & Quick Access in this space */}
      <div className="lg:w-5/12 bg-linear-to-b from-[#090d16] via-[#0f172a] to-[#1e1b4b] text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden shrink-0 space-y-8">
        {/* Glow orb */}
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-white">
                ChatPilot
              </span>
              <p className="text-[11px] text-slate-400 font-medium">
                AI Chatbot Platform
              </p>
            </div>
          </div>

          {/* Heading & bullet points */}
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              Turn your business knowledge into a{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-300 via-sky-300 to-teal-300">
                powerful AI assistant.
              </span>
            </h1>

            <div className="space-y-2.5 pt-2">
              {[
                "Upload documents",
                "Answer customer questions",
                "Generate leads",
                "Deploy in minutes",
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK ACCESS LAUNCHER IN THIS SPACE */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-indigo-500/30 backdrop-blur-md shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Quick Access to All 9 Screens</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Click to Open
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-400 text-slate-200 hover:text-white transition-all group"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 shrink-0" />
                <span className="truncate font-medium">2. Dashboard</span>
              </Link>

              <Link
                href="/bots"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-400 text-slate-200 hover:text-white transition-all group"
              >
                <Bot className="w-4 h-4 text-sky-400 group-hover:text-sky-300 shrink-0" />
                <span className="truncate font-medium">3. Bots Mgmt</span>
              </Link>

              <Link
                href="/bots/create"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-400 text-slate-200 hover:text-white transition-all group"
              >
                <FileText className="w-4 h-4 text-teal-400 group-hover:text-teal-300 shrink-0" />
                <span className="truncate font-medium">4. Knowledge</span>
              </Link>

              <Link
                href="/bots/create"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-400 text-slate-200 hover:text-white transition-all group"
              >
                <Palette className="w-4 h-4 text-purple-400 group-hover:text-purple-300 shrink-0" />
                <span className="truncate font-medium">5. Appearance</span>
              </Link>

              <Link
                href="/conversations"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-400 text-slate-200 hover:text-white transition-all group"
              >
                <MessageSquare className="w-4 h-4 text-violet-400 group-hover:text-violet-300 shrink-0" />
                <span className="truncate font-medium">6. Conversations</span>
              </Link>

              <Link
                href="/leads"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-400 text-slate-200 hover:text-white transition-all group"
              >
                <Users2 className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 shrink-0" />
                <span className="truncate font-medium">7. Leads (127)</span>
              </Link>

              <Link
                href="/analytics"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-600/30 border border-slate-700/60 hover:border-indigo-400 text-slate-200 hover:text-white transition-all group"
              >
                <BarChart3 className="w-4 h-4 text-rose-400 group-hover:text-rose-300 shrink-0" />
                <span className="truncate font-medium">8. Analytics</span>
              </Link>

              <Link
                href="/admin"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-400/50 hover:border-indigo-300 text-indigo-100 hover:text-white transition-all group font-semibold"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-300 shrink-0" />
                <span className="truncate">9. Super Admin</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Left Footer */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            © 2026 ChatPilot Inc.
          </span>
          <Link
            href="/admin"
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </Link>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "login"
                ? "Sign in to your account"
                : "Join and start building your AI chatbot"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {activeTab === "register" && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Srajan Shukla"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Healthcare"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Password</label>
                {activeTab === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-indigo-600 hover:text-indigo-700 text-[11px]"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
              />
            </div>

            {activeTab === "register" && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  required
                  defaultValue="••••••••••••"
                  placeholder="Password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
                />
              </div>
            )}

            {activeTab === "login" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  defaultChecked
                  className="rounded-sm border-slate-300 text-indigo-600 cursor-pointer"
                />
                <label htmlFor="remember" className="text-slate-600 cursor-pointer">
                  Remember me
                </label>
              </div>
            )}

            {/* Main Primary Sign In Button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? "Signing in..." : activeTab === "login" ? "Sign In" : "Create account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {activeTab === "login" && (
            <>
              <div className="relative text-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] text-slate-400">
                  or continue with
                </span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="flex items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors w-12 h-10 cursor-pointer"
                  title="Google Sign In"
                >
                  <span className="font-bold text-xs text-slate-700">G</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="flex items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors w-12 h-10 cursor-pointer"
                  title="GitHub Sign In"
                >
                  <span className="font-bold text-xs">🐙</span>
                </button>
              </div>
            </>
          )}

          <div className="text-center pt-1 text-xs text-slate-600">
            {activeTab === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
