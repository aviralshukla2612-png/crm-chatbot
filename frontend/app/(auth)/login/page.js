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
  ChevronRight,
  Zap,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login"); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form states
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("AdminAccess2026!");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleDirectLogin = async (targetRole = "ORG_ADMIN") => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directLogin: true, portalRole: targetRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }
      const isSuper = data.user?.role === "SUPER_ADMIN" || targetRole === "superadmin" || String(targetRole).includes("super");
      const destination = isSuper ? "/admin" : "/dashboard";
      window.location.replace(destination);
    } catch (err) {
      setErrorMessage(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      if (activeTab === "register") {
        if (!fullName.trim()) throw new Error("Full name is required");
        if (!companyName.trim()) throw new Error("Company / Organization name is required");
        if (!email.trim()) throw new Error("Email address is required");
        if (!password || password.length < 8) throw new Error("Password must be at least 8 characters");

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName.trim(),
            organizationName: companyName.trim(),
            email: email.trim(),
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Registration failed");
        }

        window.location.replace("/dashboard");
        return;
      }

      const isPlatformAdmin = email.trim().toLowerCase() === "admin@emperorsmartsolutions.com";
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          directLogin: false,
          portalRole: isPlatformAdmin ? "superadmin" : "ORG_ADMIN",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid credentials");
      }

      const isSuper = data.user?.role === "SUPER_ADMIN" || data.orgRole === "SUPER_ADMIN" || isPlatformAdmin;
      const destination = isSuper ? "/admin" : "/dashboard";
      window.location.replace(destination);
    } catch (err) {
      setErrorMessage(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans">
      {/* Left Column: Brand Hero & Value Proposition */}
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
                Autonomous AI Chatbot & Lead Generation
              </p>
            </div>
          </div>

          {/* Heading & bullet points */}
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              Turn your business knowledge into an{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-300 via-sky-300 to-teal-300">
                intelligent AI team.
              </span>
            </h1>

            <div className="space-y-3 pt-2">
              {[
                "Instant multi-document RAG ingestion",
                "Autonomous 24/7 lead qualification & scheduling",
                "Isolated workspace & dedicated brand customization",
                "Full analytics, conversation review & CRM sync",
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

          {/* Quick Access Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">Explore Demo</span>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Instant Access
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => handleDirectLogin("ORG_ADMIN")}
                disabled={loading}
                className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 hover:border-indigo-400 text-slate-100 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs">Enter Workspace Demo</span>
                    <span className="text-[11px] text-slate-400">Experience the complete AI chatbot administration panel</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-300 transition-transform group-hover:translate-x-0.5" />
              </button>

              <Link
                href="/"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-slate-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block text-xs">Public Website</span>
                    <span className="text-[11px] text-slate-400">Marketing landing page & widget demo</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Left Footer */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            © 2026 ChatPilot. All rights reserved.
          </span>
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
              {activeTab === "login" ? "Welcome back" : "Create your workspace"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "login"
                ? "Sign in to access your AI assistant dashboard"
                : "Join now to build custom chatbots for your business"}
            </p>
          </div>

          {/* 1-Click Fast Login Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDirectLogin("superadmin")}
              disabled={loading}
              className="w-full py-2.5 px-3.5 rounded-xl bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white font-bold text-xs shadow-md border border-indigo-500/30 flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div className="text-left">
                  <span className="block font-bold text-xs text-white">
                    ⚡ 1-Click Super Admin Login
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Master platform controller & manage 1,000s of workspaces
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => handleDirectLogin("ORG_ADMIN")}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-semibold">1-Click Workspace Admin Login</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

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
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Innovations"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourcompany.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Password</label>
                {activeTab === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-indigo-600 hover:underline text-[11px]"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 outline-hidden focus:border-indigo-600 text-xs text-slate-800"
                />
              </div>
            </div>

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
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? "Signing in..." : activeTab === "login" ? "Sign In to Workspace" : "Create Workspace"}</span>
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
                  onClick={() => handleDirectLogin("ORG_ADMIN")}
                  className="flex items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors w-12 h-10 cursor-pointer"
                  title="Google Sign In"
                >
                  <span className="font-bold text-xs text-slate-700">G</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectLogin("ORG_ADMIN")}
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
                  onClick={() => {
                    setActiveTab("register");
                    if (email === "admin@company.com") {
                      setEmail("");
                      setPassword("");
                    }
                    setErrorMessage("");
                  }}
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

          <div className="text-center pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>← Public Website</span>
            </Link>

            {/* Subtle Platform Operator Access */}
            <button
              type="button"
              onClick={() => {
                setEmail("admin@emperorsmartsolutions.com");
                setPassword("AdminAccess2026!");
              }}
              title="Platform Operator Mode"
              className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              Platform Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
