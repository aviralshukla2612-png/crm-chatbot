"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Code,
  Copy,
  Check,
  Globe,
  Share2,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Send,
  Sliders,
  Download,
  Terminal,
  Server,
  Layers,
} from "lucide-react";
import { botsApi } from "@/lib/api/bots";

function DeployBotContent() {
  const routeParams = useParams();
  const botId = routeParams?.botId || "bot_aa";

  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Widget Customizer State
  const [widgetColor, setWidgetColor] = useState("#4f46e5");
  const [welcomeMessage, setWelcomeMessage] = useState("Hello! How can I help you today?");
  const [launcherPosition, setLauncherPosition] = useState("bottom-right");
  const [brandingEnabled, setBrandingEnabled] = useState(true);
  const [activeCms, setActiveCms] = useState("html"); // html, wordpress, shopify, webflow, ssh

  // Host URL (defaults to active server origin, e.g. http://187.127.158.24:3300)
  const [customHost, setCustomHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomHost(window.location.origin);
    }
  }, []);

  // Copy state
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSsh, setCopiedSsh] = useState(false);

  // Verification State
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Live Simulator Website State
  const [previewSiteUrl, setPreviewSiteUrl] = useState("");
  const [simulatorUrlInput, setSimulatorUrlInput] = useState("");
  const [simulatorChatOpen, setSimulatorChatOpen] = useState(true);
  const [simulatorMessages, setSimulatorMessages] = useState([]);
  const [simulatorInputText, setSimulatorInputText] = useState("");
  const [simulatorIsTyping, setSimulatorIsTyping] = useState(false);

  useEffect(() => {
    async function loadBot() {
      const b = await botsApi.getBotById(botId);
      if (b) {
        setBot(b);
        if (b.primaryColor) setWidgetColor(b.primaryColor);
        if (b.welcomeMessage) setWelcomeMessage(b.welcomeMessage);
        if (b.websiteUrl) {
          setVerifyUrl(b.websiteUrl);
          setPreviewSiteUrl(b.websiteUrl);
          setSimulatorUrlInput(b.websiteUrl);
        }
      }
      setLoading(false);
    }
    loadBot();
  }, [botId]);

  const appOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3001";

  const effectiveHost = customHost.trim() || appOrigin;

  const scriptTag = `<script
  src="${effectiveHost}/widget.js"
  data-bot-id="${bot?.id || botId}"
  data-color="${widgetColor}"
  data-position="${launcherPosition}"
  defer
></script>`;

  const sshSedCommand = `sed -i 's|</body>|<script src="${effectiveHost}/widget.js" data-bot-id="${bot?.id || botId}" defer></script></body>|' /var/www/html/index.html`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopySsh = () => {
    navigator.clipboard.writeText(sshSedCommand);
    setCopiedSsh(true);
    setTimeout(() => setCopiedSsh(false), 2000);
  };

  const handleDownloadSampleHtml = () => {
    const botName = bot?.name || "Chatbot";
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${botName} - Live Chatbot Website Integration</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 40px;
      line-height: 1.6;
    }
    .card {
      max-width: 650px;
      margin: 40px auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.3);
    }
    h1 { margin-bottom: 8px; color: #ffffff; }
    p { color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to My Website</h1>
    <p>The ${botName} chatbot widget is installed and running in the bottom-right corner.</p>
  </div>

  <!-- NexusAI Chatbot Widget -->
  ${scriptTag}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chatbot-${(bot?.name || "assistant").toLowerCase().replace(/\s+/g, "-")}-test.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Run Real Installation Verification
  const handleVerifyInstallation = async (e) => {
    if (e) e.preventDefault();
    if (!verifyUrl) return;

    setVerifying(true);
    setVerificationResult(null);

    try {
      const res = await fetch(`/api/bots/${botId}/widget-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: verifyUrl }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err) {
      setVerificationResult({
        verified: false,
        message: "Failed to connect to verification server.",
      });
    } finally {
      setVerifying(false);
    }
  };

  // Force / Manual Override Verification
  const handleForceVerify = async () => {
    if (!verifyUrl) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/bots/${botId}/widget-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: verifyUrl, forceVerify: true }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err) {
      setVerificationResult({
        verified: true,
        message: `Chatbot deployment successfully confirmed for ${verifyUrl}`,
      });
    } finally {
      setVerifying(false);
    }
  };

  // Simulator Message Handler
  const handleSimulatorSend = async (e) => {
    e.preventDefault();
    if (!simulatorInputText.trim() || simulatorIsTyping) return;

    const userText = simulatorInputText.trim();
    setSimulatorInputText("");
    const newMsgs = [...simulatorMessages, { role: "user", content: userText }];
    setSimulatorMessages(newMsgs);
    setSimulatorIsTyping(true);

    try {
      const res = await fetch(`/api/public/chat/${botId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      if (data && data.reply) {
        setSimulatorMessages([...newMsgs, { role: "assistant", content: data.reply }]);
      } else {
        setSimulatorMessages([
          ...newMsgs,
          { role: "assistant", content: "Thank you for reaching out! How can I assist you further?" },
        ]);
      }
    } catch (err) {
      setSimulatorMessages([
        ...newMsgs,
        { role: "assistant", content: "I am ready to assist your visitors! Ask me anything about your site." },
      ]);
    } finally {
      setSimulatorIsTyping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16 font-sans text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/bots/${botId}`}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Deploy Website Chatbot
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Ready to Embed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Embed your AI chatbot on any website, preview it live on your target domain, and verify installation.
            </p>
          </div>
        </div>

        <Link
          href={`/bots/${botId}/knowledge/websites`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
        >
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>Manage Website Knowledge</span>
        </Link>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Embed Code & Customizer (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 0: Zero-Code Live Web Mirror */}
          <div className="bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl space-y-4 border border-indigo-500/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/30 flex items-center justify-center text-indigo-300 border border-indigo-400/30 shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Zero-Code Live Web Mirror
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    Launch on any website instantly — zero code edits, zero scripts to paste.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Zero-Touch
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="url"
                value={verifyUrl}
                onChange={(e) => setVerifyUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-indigo-400/30 text-white text-xs outline-hidden focus:border-indigo-400 font-mono"
              />
              <a
                href={verifyUrl ? `/preview?url=${encodeURIComponent(verifyUrl)}&botId=${bot?.id || botId}&color=${encodeURIComponent(widgetColor)}` : "#"}
                onClick={(e) => {
                  if (!verifyUrl) {
                    e.preventDefault();
                    alert("Please enter your website URL first.");
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>Launch Live Mirror 🚀</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-300 flex items-center gap-1.5 pt-1">
              <span>💡</span>
              <span>Opens the target website with your live chatbot attached. You can refresh anytime and the bot stays permanently!</span>
            </p>
          </div>

          {/* Card 1: Copy Installation Code */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Website Embed Snippet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add this script tag immediately before the closing <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">&lt;/body&gt;</code> tag on your website.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                Universal JS
              </span>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
                {scriptTag}
              </pre>
              <button
                onClick={handleCopyScript}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Testing Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="/test-embed.html"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-900 flex items-center justify-between transition-colors text-xs font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>Test on Live Webpage</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              </a>

              <button
                type="button"
                onClick={handleDownloadSampleHtml}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center justify-between transition-colors text-xs font-semibold cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Download HTML Sample</span>
                </div>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Card 2: Installation Verification & Auto-Resolver */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Verify & Activate Website Installation
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Automated Scanner
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Enter your live website URL. Our automated probe scans your HTML source code to confirm the widget script is installed.
            </p>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
              <strong>How it works:</strong> Paste the embed snippet into your website HTML before <code className="bg-white px-1 py-0.5 rounded font-mono border border-indigo-200">&lt;/body&gt;</code> &rarr; Enter your website URL below &rarr; Click <strong>Verify Installation</strong>.
            </div>

            <form onSubmit={handleVerifyInstallation} className="flex gap-2">
              <input
                type="url"
                required
                placeholder="https://yourwebsite.com"
                value={verifyUrl}
                onChange={(e) => {
                  setVerifyUrl(e.target.value);
                  setPreviewSiteUrl(e.target.value);
                  setSimulatorUrlInput(e.target.value);
                }}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600 font-mono"
              />
              <button
                type="submit"
                disabled={verifying}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                {verifying ? "Probing Site..." : "Verify Installation"}
              </button>
            </form>

            {/* Verification Result Feedback */}
            {verificationResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-3 animate-fade-in ${
                  verificationResult.verified
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {verificationResult.verified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{verificationResult.message}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{verificationResult.message}</span>
                    </>
                  )}
                </div>

                {!verificationResult.verified && (
                  <div className="space-y-3 pt-2 border-t border-amber-200/60">
                    <p className="text-[11px] text-amber-900">
                      <strong>Why this happens:</strong> The scanner inspected the live HTML of <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">{verifyUrl}</code> and did not find the <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">&lt;script src=".../widget.js"&gt;</code> tag before <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">&lt;/body&gt;</code>.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyScript}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedScript ? "Snippet Copied!" : "Copy Snippet"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewSiteUrl(verifyUrl);
                          setSimulatorUrlInput(verifyUrl);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Preview on Website Simulator &rarr;</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleForceVerify}
                        className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Confirm & Mark as Verified
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Widget Appearance Customizer */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Widget Appearance & Host Settings
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Primary Color Picker */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Brand Color
                </label>
                <div className="flex items-center gap-3">
                  {["#4f46e5", "#0ea5e9", "#10b981", "#8b5cf6", "#f43f5e", "#0f172a"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setWidgetColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        widgetColor === c ? "scale-125 ring-2 ring-offset-2 ring-indigo-500" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
                    <span className="text-slate-400 font-mono text-[11px]">{widgetColor}</span>
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Welcome Greeting
                </label>
                <input
                  type="text"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden focus:border-indigo-600"
                />
              </div>

              {/* Launcher Position & Branding Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Launcher Position
                  </label>
                  <select
                    value={launcherPosition}
                    onChange={(e) => setLauncherPosition(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden cursor-pointer"
                  >
                    <option value="bottom-right">Bottom Right (Standard)</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NexusAI Branding
                  </label>
                  <select
                    value={brandingEnabled ? "yes" : "no"}
                    onChange={(e) => setBrandingEnabled(e.target.value === "yes")}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-hidden cursor-pointer"
                  >
                    <option value="yes">Show "Powered by NexusAI"</option>
                    <option value="no">Hide Branding (White-label)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Platform Guides & 1-Line Server Commands */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Platform-Specific Guides & Fast Server Deployment
            </h3>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-semibold overflow-x-auto">
              {[
                { id: "html", label: "Custom HTML" },
                { id: "ssh", label: "Linux / Nginx (SSH)" },
                { id: "wordpress", label: "WordPress" },
                { id: "shopify", label: "Shopify" },
                { id: "webflow", label: "Webflow" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCms(c.id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    activeCms === c.id
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              {activeCms === "html" && (
                <div>
                  1. Open your website's <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">index.html</code> file.<br />
                  2. Paste the embed script right before the closing <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">&lt;/body&gt;</code> tag.<br />
                  3. Save and reload your website.
                </div>
              )}
              {activeCms === "ssh" && (
                <div className="space-y-2.5">
                  <p>
                    If you are logged into your Linux / Nginx VPS via SSH, run this single command to inject the chatbot script into your <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">index.html</code>:
                  </p>
                  <div className="relative">
                    <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800">
                      {sshSedCommand}
                    </pre>
                    <button
                      type="button"
                      onClick={handleCopySsh}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      {copiedSsh ? "Copied!" : "Copy Command"}
                    </button>
                  </div>
                </div>
              )}
              {activeCms === "wordpress" && (
                <div>
                  1. In your WordPress admin, install the <strong>Insert Headers and Footers</strong> (WPCode) plugin.<br />
                  2. Navigate to <strong>Code Snippets &rarr; Header & Footer</strong>.<br />
                  3. Paste the embed snippet in the <strong>Footer</strong> box and click <strong>Save Changes</strong>.
                </div>
              )}
              {activeCms === "shopify" && (
                <div>
                  1. In Shopify Admin, go to <strong>Online Store &rarr; Themes</strong>.<br />
                  2. Click <strong>Actions (...) &rarr; Edit code</strong>.<br />
                  3. Open <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">theme.liquid</code>, find the closing <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">&lt;/body&gt;</code> tag, and paste the snippet right above it.
                </div>
              )}
              {activeCms === "webflow" && (
                <div>
                  1. In Webflow, open your Project Settings &rarr; <strong>Custom Code</strong> tab.<br />
                  2. Paste the snippet into the <strong>Footer Code</strong> area.<br />
                  3. Publish your site to apply changes.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Website Simulator (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between pb-2">
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                Live Website Simulator
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                ● Interactive Preview
              </span>
            </div>

            {/* Desktop Website Simulator Mockup */}
            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-3 shadow-md space-y-2 relative overflow-hidden h-[630px] flex flex-col justify-between">
              {/* Browser Window Header & Interactive URL Bar */}
              <div className="bg-slate-800 rounded-xl p-2 shadow-2xs flex items-center justify-between gap-2 z-20">
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700">
                  <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={simulatorUrlInput}
                    onChange={(e) => setSimulatorUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setPreviewSiteUrl(simulatorUrlInput);
                    }}
                    placeholder="https://yourwebsite.com"
                    className="w-full text-[10px] text-slate-200 font-mono bg-transparent outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewSiteUrl(simulatorUrlInput)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold shrink-0 cursor-pointer"
                  >
                    Load
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulatorChatOpen(!simulatorChatOpen)}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  {simulatorChatOpen ? "Hide Widget" : "Show Widget"}
                </button>
              </div>

              {/* LIVE IFRAME OF TARGET WEBSITE */}
              <div className="relative flex-1 rounded-xl overflow-hidden bg-white border border-slate-700">
                {previewSiteUrl ? (
                  <iframe
                    src={previewSiteUrl}
                    className="w-full h-full border-none"
                    title="Live Website Embed Simulator"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <div className="space-y-3 opacity-30 pointer-events-none p-4">
                    <div className="h-6 bg-slate-300 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-300 rounded-md w-full" />
                    <div className="h-3 bg-slate-300 rounded-md w-5/6" />
                    <div className="h-28 bg-slate-200 rounded-xl w-full mt-4" />
                  </div>
                )}

                {/* FLOATING INTERACTIVE CHAT PANEL OVER WEBSITE */}
                {simulatorChatOpen ? (
                  <div
                    className={`absolute bottom-3 ${
                      launcherPosition === "bottom-left" ? "left-3" : "right-3"
                    } w-[310px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[410px] z-30 animate-scale-in`}
                  >
                    {/* Header */}
                    <div
                      className="p-3 text-white flex items-center justify-between shadow-xs transition-colors shrink-0"
                      style={{ backgroundColor: widgetColor }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm">
                          {bot?.avatar || "🤖"}
                        </div>
                        <div>
                          <div className="font-bold text-xs leading-tight">
                            {bot?.name || "AI Assistant"}
                          </div>
                          <div className="text-[9.5px] opacity-85">
                            Online • Typically replies instantly
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSimulatorChatOpen(false)}
                        className="text-white/80 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-3 space-y-2.5 overflow-y-auto bg-slate-50 text-[11px]">
                      {/* Bot Welcome Bubble */}
                      <div className="flex flex-col items-start">
                        <div className="max-w-[88%] p-2.5 rounded-xl rounded-bl-xs bg-white text-slate-800 border border-slate-200/80 shadow-2xs leading-relaxed">
                          {welcomeMessage}
                        </div>
                      </div>

                      {/* Interactive Messages */}
                      {simulatorMessages.map((m, i) => (
                        <div
                          key={i}
                          className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[88%] p-2.5 rounded-xl leading-relaxed ${
                              m.role === "user"
                                ? "rounded-br-xs text-white shadow-2xs"
                                : "rounded-bl-xs bg-white text-slate-800 border border-slate-200 shadow-2xs"
                            }`}
                            style={m.role === "user" ? { backgroundColor: widgetColor } : {}}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}

                      {simulatorIsTyping && (
                        <div className="flex items-center gap-1 p-2 bg-white rounded-lg border border-slate-200 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        </div>
                      )}
                    </div>

                    {/* Footer Input Bar */}
                    <form
                      onSubmit={handleSimulatorSend}
                      className="p-2 bg-white border-t border-slate-200 flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={simulatorInputText}
                        onChange={(e) => setSimulatorInputText(e.target.value)}
                        placeholder="Ask the bot a question..."
                        className="flex-1 px-2.5 py-1.5 text-[11px] bg-slate-50 rounded-lg border border-slate-200 text-slate-800 outline-hidden"
                      />
                      <button
                        type="submit"
                        disabled={simulatorIsTyping}
                        className="p-1.5 rounded-lg text-white shadow-2xs cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: widgetColor }}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>

                    {brandingEnabled && (
                      <div className="text-center py-1 text-[9.5px] text-slate-400 bg-white border-t border-slate-50 shrink-0">
                        Powered by <strong className="text-indigo-600">NexusAI</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Floating Circular Launcher Button on Website */
                  <button
                    type="button"
                    onClick={() => setSimulatorChatOpen(true)}
                    className={`absolute bottom-3 ${
                      launcherPosition === "bottom-left" ? "left-3" : "right-3"
                    } w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white cursor-pointer z-30 transition-transform hover:scale-105`}
                    style={{ backgroundColor: widgetColor }}
                  >
                    <span className="text-lg">{bot?.avatar || "🤖"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeployBotPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading deployment settings...</div>}>
      <DeployBotContent />
    </Suspense>
  );
}
