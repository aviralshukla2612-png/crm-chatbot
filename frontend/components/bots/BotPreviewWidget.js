"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  FileText,
  Minimize2,
  Maximize2,
  RefreshCw,
} from "lucide-react";

export default function BotPreviewWidget({
  botId = "bot_aa",
  botName = "AI Sales Executive",
  avatar = "💼",
  primaryColor = "#4f46e5",
  welcomeMessage = "Hello! Welcome to our workspace. How can I help you today?",
  placeholderText = "Ask a question...",
  position = "right",
  showLeadForm = false,
}) {
  const [messages, setMessages] = useState([
    {
      id: "w_1",
      role: "assistant",
      content: welcomeMessage,
      quickReplies: [
        "Website Development",
        "Mobile Application",
        "AI Chatbot",
        "Custom Software",
        "UI/UX Design",
        "Cloud & DevOps",
        "SEO & Marketing",
      ],
      sources: [],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadData, setLeadData] = useState({ name: "", email: "", phone: "" });
  const [showPromptLead, setShowPromptLead] = useState(false);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(`session_preview_${Date.now()}`);
  }, []);

  const handleSend = async (e, explicitText) => {
    e?.preventDefault();
    const userText = (typeof explicitText === "string" ? explicitText : inputText).trim();
    if (!userText) return;

    const userMsg = {
      id: `w_u_${Date.now()}`,
      role: "user",
      content: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    const query = userText.toLowerCase();
    if (!explicitText) setInputText("");
    setIsTyping(true);

    // 1. Try real live Next.js API endpoint (saves conversation and broadcasts to dashboard live)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`/api/public/chat/${encodeURIComponent(botId || "bot_aa")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages.slice(-4),
          visitor: leadCaptured ? leadData : {},
          sessionId,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data?.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `w_a_${Date.now()}`,
              role: "assistant",
              content: data.reply,
              quickReplies: data.quickReplies || [],
              sources: data.sources || ["Verified Knowledge"],
            },
          ]);
          setIsTyping(false);
          return;
        }
      }
    } catch (err) {
      // Fallback seamlessly to local RAG engine if fetch fails
    }

    // 2. Intelligent RAG Knowledge Base Matching
    setTimeout(() => {
      let replyContent = "";
      let sources = [];

      // Check Hospital Details & Healthcare
      if (
        query.includes("hospital") ||
        query.includes("clinic") ||
        query.includes("health") ||
        query.includes("opd") ||
        query.includes("doctor") ||
        query.includes("emergency") ||
        query.includes("medical")
      ) {
        replyContent =
          "Here are the complete details for our medical center:\n\n" +
          "🏥 **Hospital Overview**:\n" +
          "Multi-specialty hospital with 24/7 emergency & trauma care, modern ICU, and state-of-the-art diagnostic facilities.\n\n" +
          "⏰ **OPD & Clinic Hours**:\n" +
          "• Monday – Saturday: 9:00 AM to 7:00 PM\n" +
          "• Emergency & Trauma Center: Open 24/7, 365 days a year\n" +
          "• Sunday: Emergency & in-patient care only\n\n" +
          "🩺 **Specialized Departments**:\n" +
          "• **Cardiology**: ECG, 2D Echo & Cardiac ICU\n" +
          "• **Orthopedics**: Joint replacement & trauma care\n" +
          "• **Pediatrics & NICU**: Child specialist OPD\n" +
          "• **General Surgery & Medicine**: Full inpatient care\n\n" +
          "💳 **Cashless Insurance**: Empanelled with major TPAs (Star Health, HDFC Ergo, ICICI Lombard, Max Bupa, etc.).\n\n" +
          "📞 **Helpline & Appointments**: +91 98765 43210 (Medical Enclave Campus)";
        sources = ["hospital-services-guide.pdf"];
      }
      // Check Ownership & Leadership
      else if (
        query.includes("owner") ||
        query.includes("founder") ||
        query.includes("who owns") ||
        query.includes("karan") ||
        query.includes("yash") ||
        query.includes("leadership") ||
        query.includes("ceo") ||
        query.includes("who started") ||
        query.includes("management")
      ) {
        replyContent =
          "Emperor Smart Solutions was founded and is led by **Karan Makwana & Yash Sharma**.\n\nThey oversee all strategic digital transformation, custom software architecture, and commercial project approvals across India.";
        sources = ["Company_Profile_Leadership.pdf"];
      }
      // Check ERP Systems & Pricing
      else if (
        query.includes("erp") ||
        query.includes("starter") ||
        query.includes("inventory") ||
        query.includes("accounting") ||
        query.includes("invoice")
      ) {
        replyContent =
          "Here is our ERP Development Solutions breakdown:\n\n• **ERP Starter**: From ₹2,50,000 (45-60 working days) — Dashboard, Products, Customers, Suppliers, Inventory, Purchases & Sales.\n• **ERP Professional**: From ₹5,00,000 (60-90 working days) — Stock management, Employees, Accounting, Invoices & Audit logs.\n• **ERP Enterprise**: From ₹8,50,000 (90-150 working days) — Multi-branch, Warehouse, GST e-invoicing & APIs.\n\n*Note: GST (18%) is applicable extra on all commercial invoices.*";
        sources = ["Custom_ERP_Enterprise_Modules.docx", "Emperor_Services_RateCard_2026.pdf"];
        if (showLeadForm && !leadCaptured) setShowPromptLead(true);
      }
      // Check Discounts & Commercial Concessions
      else if (
        query.includes("discount") ||
        query.includes("offer") ||
        query.includes("cheap") ||
        query.includes("price drop") ||
        query.includes("bargain") ||
        query.includes("deal")
      ) {
        replyContent =
          "Under our commercial policy, standard projects do not receive automatic discounts.\n\nSpecial concessions (up to 5% on Website + SEO, or up to 7% on ERP + CRM) strictly require direct approval from founders **Karan Makwana & Yash Sharma**. Would you like to connect with them directly?";
        sources = ["Client_Terms_Discounts_SLA.txt"];
        if (showLeadForm && !leadCaptured) setShowPromptLead(true);
      }
      // Check Mobile Applications
      else if (
        query.includes("mobile") ||
        query.includes("app") ||
        query.includes("flutter") ||
        query.includes("android") ||
        query.includes("ios")
      ) {
        replyContent =
          "Our Mobile Application Development packages:\n\n• **Basic Android App**: From ₹1,50,000 (Up to 10 screens, REST APIs, push notifications, Play Store support).\n• **Cross-Platform Flutter App**: From ₹2,50,000 (Single codebase for Android + iOS with custom UI).\n• **Advanced Mobile App**: From ₹4,50,000 (Real-time functionality, payments, and admin panel).";
        sources = ["Mobile_Flutter_Development_Brochure.pdf"];
        if (showLeadForm && !leadCaptured) setShowPromptLead(true);
      }
      // Check Website & E-Commerce
      else if (
        query.includes("website") ||
        query.includes("web") ||
        query.includes("ecommerce") ||
        query.includes("e-commerce") ||
        query.includes("shop")
      ) {
        replyContent =
          "Website & Web Application Solutions:\n\n• **Basic Business Website**: From ₹25,000 (Up to 5 pages, responsive, WhatsApp button, 7-12 days).\n• **Professional Website**: From ₹45,000 (Up to 10 pages, animations, SEO, speed optimized).\n• **E-Commerce Platform**: From ₹85,000 (Catalog, filters, payment gateways, admin order dashboard).\n• **Custom Web Applications / SaaS**: Starting from ₹1,25,000+.";
        sources = ["Emperor_Services_RateCard_2026.pdf"];
        if (showLeadForm && !leadCaptured) setShowPromptLead(true);
      }
      // Check CRM Solutions
      else if (
        query.includes("crm") ||
        query.includes("pipeline") ||
        query.includes("sales team")
      ) {
        replyContent =
          "CRM Solutions & Automation:\n\n• **CRM Basic**: From ₹1,50,000 (Lead management, contacts, follow-up pipeline, tasks).\n• **CRM Professional**: From ₹3,00,000 (Deal management, email & WhatsApp integration, activity history).\n• **CRM Enterprise**: From ₹5,50,000 (Multi-team territory management, automated sequences & forecasting).";
        sources = ["Company_Services_Overview.pdf"];
      }
      // Check Payment Milestones & Terms
      else if (
        query.includes("milestone") ||
        query.includes("payment") ||
        query.includes("terms") ||
        query.includes("advance")
      ) {
        replyContent =
          "Our standard commercial terms:\n\n• **40% Advance** upon contract kickoff\n• **40% Milestone** upon progress demo review\n• **20% Delivery** before production handover\n\nEvery project includes **30 days of free post-launch support** and warranty.";
        sources = ["Client_Terms_Discounts_SLA.txt"];
      }
      // Check Digital Marketing & SEO
      else if (
        query.includes("seo") ||
        query.includes("marketing") ||
        query.includes("ads")
      ) {
        replyContent =
          "Digital Marketing & SEO Packages:\n\n• **SEO Basic**: ₹12,000/month (Keyword research, technical audit, on-page optimization).\n• **Growth Marketing**: ₹25,000/month (SEO + Google/Meta Ads management).\n*(Note: Advertising spend is paid directly to Google/Meta platforms)*";
        sources = ["Emperor_Services_RateCard_2026.pdf"];
      }
      // Check Contact / Consultation
      else if (
        query.includes("contact") ||
        query.includes("call") ||
        query.includes("meet") ||
        query.includes("email") ||
        query.includes("phone")
      ) {
        replyContent =
          "We'd love to discuss your project! You can request a direct consultation with founders **Karan Makwana & Yash Sharma** by sharing your details below.";
        sources = ["Company_Profile_Leadership.pdf"];
        if (showLeadForm && !leadCaptured) setShowPromptLead(true);
      }
      // General Services Overview
      else if (
        query.includes("services") ||
        query.includes("what do you do") ||
        query.includes("help")
      ) {
        replyContent =
          "Emperor Smart Solutions provides full-cycle digital transformation:\n\n• Custom Website & Web Application Development\n• Mobile Applications (Android & Flutter)\n• Custom ERP & CRM Enterprise Systems\n• UI/UX Design & Cloud DevOps Deployment\n• Search Engine Optimization (SEO) & Marketing";
        sources = ["Company_Services_Overview.pdf"];
      }
      // Dynamic Fallback
      else {
        replyContent =
          "I'd be glad to look into this for you! While this specific detail isn't in my immediate rate card, our sales engineering team can prepare a customized scope. Would you like our founders to reach out to you?";
        sources = ["Company_Knowledge_Base.txt"];
        if (showLeadForm && !leadCaptured) setShowPromptLead(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `w_a_${Date.now()}`,
          role: "assistant",
          content: replyContent,
          sources,
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setLeadCaptured(true);
    setShowPromptLead(false);

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadData.name || "Preview Prospect",
          email: leadData.email || "",
          phone: leadData.phone || "",
          company: "Interactive Widget Preview",
          bot: botName,
          score: "High",
          inquiry: messages[messages.length - 1]?.content || "Inquiry from preview widget",
          source: "Interactive Bot Preview",
        }),
      });
    } catch (err) {}

    setMessages((prev) => [
      ...prev,
      {
        id: `w_lead_${Date.now()}`,
        role: "assistant",
        content: `Thank you, ${leadData.name || "friend"}! Our engineering and sales team has received your inquiry and will contact you at ${leadData.email || "your email"} within 2 business hours.`,
        sources: [],
      },
    ]);
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col h-[520px]">
      {/* Widget Header */}
      <div
        className="p-4 text-white flex items-center justify-between shadow-xs transition-colors"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-lg shadow-inner">
            {avatar}
          </div>
          <div>
            <h4 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
              {botName}
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h4>
            <p className="text-[11px] opacity-80">Instant AI Knowledge Assistant</p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([{ id: "w_1", role: "assistant", content: welcomeMessage, sources: [] }]);
            setShowPromptLead(false);
            setLeadCaptured(false);
          }}
          title="Restart Conversation"
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-neutral-50/60 dark:bg-neutral-950/40 text-xs">
        {messages.map((m, idx) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 shadow-2xs ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-xs"
                  : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200/70 dark:border-neutral-700/80 rounded-tl-xs whitespace-pre-line"
              }`}
            >
              {m.content}
            </div>

            {/* Quick Replies Interactive Options */}
            {m.quickReplies && m.quickReplies.length > 0 && idx === messages.length - 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                {m.quickReplies.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(null, qr)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-indigo-600/70 dark:border-indigo-400/70 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-neutral-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all shadow-xs cursor-pointer"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* Citations if available */}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1 max-w-[85%]">
                {m.sources.map((src, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded-sm"
                  >
                    <FileText className="w-2.5 h-2.5 text-indigo-500" />
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 w-16">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.4s]" />
          </div>
        )}

        {/* Lead Capture Interactive Trigger */}
        {showPromptLead && !leadCaptured && (
          <div className="mt-2 p-3 bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-neutral-800 dark:text-neutral-200">
            <p className="font-semibold text-xs text-indigo-900 dark:text-indigo-200 mb-1.5">
              Request Founder Consultation:
            </p>
            <form onSubmit={handleLeadSubmit} className="space-y-1.5">
              <input
                type="text"
                placeholder="Full Name"
                required
                value={leadData.name}
                onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs outline-hidden"
              />
              <input
                type="email"
                placeholder="Business Email"
                required
                value={leadData.email}
                onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
              >
                Submit & Connect
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={placeholderText}
          className="flex-1 px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-transparent focus:border-indigo-500 outline-hidden text-neutral-900 dark:text-white placeholder:text-neutral-400"
        />
        <button
          type="submit"
          className="p-2 rounded-xl text-white shadow-xs transition-all hover:scale-105"
          style={{ backgroundColor: primaryColor }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
