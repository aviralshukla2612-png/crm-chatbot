"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  HelpCircle,
  Globe,
  Plus,
  MoreVertical,
  Check,
  CheckCircle2,
  Trash2,
  Send,
  Bot,
  User,
  Sliders,
  Target,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { botsApi } from "@/lib/api/bots";

const STEPS = [
  { id: 1, name: "Basic Info" },
  { id: 2, name: "Knowledge" },
  { id: 3, name: "Behavior" },
  { id: 4, name: "Leads" },
  { id: 5, name: "Appearance" },
  { id: 6, name: "Test" },
  { id: 7, name: "Publish" },
];

export default function CreateBotWizard() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1); // Start at step 1 for fresh bot creation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Form State - Fresh empty fields for user's own bot
  const [botName, setBotName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [welcomeMessage, setWelcomeMessage] = useState("Hello! How can I assist you today?");
  const [placeholderText, setPlaceholderText] = useState("Ask a question...");
  const [position, setPosition] = useState("Bottom Right");

  // Behavior & Lead Config
  const [personality, setPersonality] = useState("Helpful & Professional");
  const [responseLength, setResponseLength] = useState("Balanced");
  const [instructions, setInstructions] = useState("");
  const [collectLeads, setCollectLeads] = useState(true);

  // Knowledge Documents - Empty for user's own files
  const [documents, setDocuments] = useState([]);

  // Live widget preview chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hello! How can I assist you today?" },
  ]);

  const avatarsList = ["🤖", "💼", "🎧", "⚡", "🩺", "💬"];
  const colorSwatches = ["#4F46E5", "#3B82F6", "#06B6D4", "#10B981", "#8B5CF6", "#111827"];

  const handleFileUpload = (files) => {
    if (!files || files.length === 0) return;
    const newItems = Array.from(files).map((f) => {
      const ext = f.name.split(".").pop()?.toUpperCase() || "PDF";
      const sizeStr =
        f.size > 1024 * 1024
          ? (f.size / (1024 * 1024)).toFixed(1) + " MB"
          : Math.round(f.size / 1024) + " KB";
      return {
        name: f.name,
        type: ext,
        size: sizeStr,
        status: "Ready",
        uploaded: "Just now",
      };
    });
    setDocuments((prev) => [...prev, ...newItems]);
  };

  const removeDocument = (idx) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const generateAIResponse = (query) => {
    const q = query.toLowerCase().trim();
    const bot = botName.trim() || "AI Assistant";
    const company = companyName.trim() || "our hospital & medical center";
    const primaryDoc = documents && documents.length > 0 ? documents[0].name : "hospital-services-guide.pdf";

    // 1. Hospital Details / Overview / Departments / Facilities
    if (
      q.includes("hospital") ||
      q.includes("detail") ||
      q.includes("clinic") ||
      q.includes("facility") ||
      q.includes("center") ||
      q.includes("about")
    ) {
      return {
        text: `Here are the complete details for ${company}:\n\n` +
          `🏥 **Hospital Overview**:\n` +
          `We are a premier multi-specialty medical center offering round-the-clock emergency, outpatient, and surgical care with modern intensive care units (ICU).\n\n` +
          `⏰ **OPD & Clinic Hours**:\n` +
          `• Monday – Saturday: 9:00 AM to 7:00 PM\n` +
          `• Emergency & Trauma Center: Open 24/7, 365 days a year\n` +
          `• Sunday: Emergency & in-patient services only\n\n` +
          `🩺 **Specialized Departments**:\n` +
          `• **Cardiology**: ECG, 2D Echo, Cardiac ICU & Angiography\n` +
          `• **Orthopedics**: Joint replacement, fracture trauma & sports medicine\n` +
          `• **Pediatrics**: Child specialist OPD & NICU\n` +
          `• **Internal Medicine & Diabetology**: Chronic illness management\n` +
          `• **General Surgery & Laparoscopy**: Minimally invasive procedures\n` +
          `• **Pathology & Radiology**: 24/7 Digital X-Ray & Ultrasound\n\n` +
          `🛌 **Facilities**:\n` +
          `• 50+ In-patient beds with Deluxe and Private room options\n` +
          `• Advanced ICU with ventilator and continuous monitoring\n` +
          `• 100% Cashless hospitalization with major health insurance TPAs\n\n` +
          `📞 **Emergency Helpline & Appointments**: +91 98765 43210\n\n` +
          `Would you like me to help you book an appointment with a specialist?`,
        sources: [primaryDoc],
      };
    }

    // 2. Opening Hours / Timings
    if (
      q.includes("hour") ||
      q.includes("timing") ||
      q.includes("open") ||
      q.includes("close") ||
      q.includes("sunday") ||
      q.includes("time")
    ) {
      return {
        text: `Our clinic & OPD opening hours:\n\n` +
          `• **Monday to Saturday**: 9:00 AM – 7:00 PM\n` +
          `• **Sunday**: Closed for routine OPD (Emergency care open 24/7)\n` +
          `• **Emergency & Ambulance Hotline**: 24/7 active at **+91 98765 43210**.`,
        sources: [primaryDoc],
      };
    }

    // 3. Appointments & Booking
    if (
      q.includes("appointment") ||
      q.includes("book") ||
      q.includes("consult") ||
      q.includes("schedule") ||
      q.includes("slot")
    ) {
      return {
        text: `You can book an appointment with our doctors right away:\n\n` +
          `1. **By Phone**: Call our hospital reception at **+91 98765 43210**\n` +
          `2. **Direct Booking**: Simply reply here with your **Name**, **Preferred Date**, and **Department**, and our desk will confirm your appointment!`,
        sources: [primaryDoc],
      };
    }

    // 4. Emergency Care & Ambulance
    if (
      q.includes("emergency") ||
      q.includes("ambulance") ||
      q.includes("trauma") ||
      q.includes("urgent") ||
      q.includes("icu")
    ) {
      return {
        text: `🚨 **24/7 Emergency Care & Trauma Center**:\n\n` +
          `Our emergency department is staffed 24 hours a day with critical care physicians and trauma specialists.\n\n` +
          `• **Emergency Hotline**: +91 98765 43210\n` +
          `• **Ambulance Service**: Cardiac life-support ambulance available on call.`,
        sources: [primaryDoc],
      };
    }

    // 5. Insurance & Cashless Hospitalization
    if (
      q.includes("insurance") ||
      q.includes("cashless") ||
      q.includes("tpa") ||
      q.includes("claim") ||
      q.includes("mediclaim")
    ) {
      return {
        text: `Yes, we provide **100% Cashless Treatment** through all leading health insurance providers:\n\n` +
          `• Star Health & Allied Insurance\n` +
          `• HDFC ERGO General Insurance\n` +
          `• ICICI Lombard & Bajaj Allianz\n` +
          `• Max Bupa / Niva Bupa & Care Health\n` +
          `• Medi Assist, Paramount & Vidal TPA\n\n` +
          `Please present your health card and policy number at our TPA helpdesk upon arrival.`,
        sources: [primaryDoc],
      };
    }

    // 6. Doctor Specialists
    if (
      q.includes("doctor") ||
      q.includes("specialist") ||
      q.includes("physician") ||
      q.includes("surgeon") ||
      q.includes("cardio") ||
      q.includes("ortho")
    ) {
      return {
        text: `Our medical team features senior consultants across all key specialties:\n\n` +
          `• **Cardiology**: Dr. S. K. Mehta (MD, DM Cardiology)\n` +
          `• **Orthopedics**: Dr. R. Verma (MS Ortho, Joint Replacement)\n` +
          `• **Pediatrics**: Dr. A. Joshi (MD Pediatrics)\n` +
          `• **General Medicine**: Dr. P. Shah (MD Internal Medicine)\n` +
          `• **General Surgery**: Dr. N. Patel (MS Surgery)\n\n` +
          `Would you like to schedule a consultation with any of these specialists?`,
        sources: [primaryDoc],
      };
    }

    // 7. Pricing & Consultation Fees
    if (
      q.includes("price") ||
      q.includes("cost") ||
      q.includes("fee") ||
      q.includes("charge") ||
      q.includes("rate") ||
      q.includes("package")
    ) {
      return {
        text: `Our standard consultation and healthcare fee structure:\n\n` +
          `• **General OPD Consultation**: ₹500\n` +
          `• **Specialist Doctor Consultation**: ₹800\n` +
          `• **Executive Health Screening**: ₹2,500\n` +
          `• **Comprehensive Whole Body Profile**: ₹4,800\n` +
          `• **Cardiac Checkup Package**: ₹3,200\n\n` +
          `*All diagnostics and lab tests receive a 10% discount when booked with an OPD consultation.*`,
        sources: [primaryDoc],
      };
    }

    // 8. Contact & Address
    if (
      q.includes("contact") ||
      q.includes("phone") ||
      q.includes("number") ||
      q.includes("address") ||
      q.includes("location") ||
      q.includes("where")
    ) {
      return {
        text: `You can reach ${company} at:\n\n` +
          `📍 **Address**: Central Medical Enclave Campus, Main Road\n` +
          `📞 **Main Helpline**: +91 98765 43210\n` +
          `🚨 **Emergency Line**: +91 98765 22108\n` +
          `✉️ **Email**: info@hospital-care.org\n\n` +
          `We are open 24/7 for emergency admissions and 9:00 AM to 7:00 PM for outpatient visits.`,
        sources: [primaryDoc],
      };
    }

    // 9. Greetings
    if (
      q === "hi" ||
      q === "hello" ||
      q === "hey" ||
      q.startsWith("hi ") ||
      q.startsWith("hello ")
    ) {
      return {
        text: `Hello! I'm ${bot}, your assistant for ${company}.\n\nHow can I help you today? You can ask me about hospital details, clinic hours, doctor appointments, emergency care, or insurance claims.`,
        sources: [],
      };
    }

    // 10. Intelligent Contextual Response
    return {
      text: `Thank you for your inquiry! As the assistant for ${company}, here is what I can assist you with:\n\n` +
        `• **Hospital Details & Facilities**: Multi-specialty care, modern ICU, and diagnostics\n` +
        `• **OPD Hours**: Monday to Saturday, 9:00 AM – 7:00 PM (Emergency: 24/7)\n` +
        `• **Doctor Consultations**: Booking slots with our senior specialists\n` +
        `• **Cashless Insurance**: Empanelled with major insurance TPAs\n\n` +
        `Please let me know if you would like more specific details or wish to book an appointment!`,
      sources: [primaryDoc],
    };
  };

  const handleSendMessage = (textToSend) => {
    const query = textToSend || chatInput;
    if (!query.trim()) return;

    const userMsg = { role: "user", content: query };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    if (!textToSend) setChatInput("");

    setTimeout(() => {
      const responseObj = generateAIResponse(query);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: responseObj.text,
          sources: responseObj.sources,
        },
      ]);
    }, 450);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const finalName = botName.trim() || "My AI Assistant";
    await botsApi.createBot({
      name: finalName,
      company: companyName,
      description: description || "Custom AI chatbot assistant.",
      avatar: avatarsList[avatarIndex],
      primaryColor,
      welcomeMessage,
      placeholderText,
      personality,
      responseLength,
      instructions,
      collectLeads,
      documents,
      sourcesCount: documents.length,
    });
    router.push("/bots");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in text-slate-800 font-sans">
      {/* 7-Step Breadcrumb Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {STEPS.map((s, idx) => {
            const isCurrent = currentStep === s.id;
            const isPast = currentStep > s.id;

            return (
              <div
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className="flex items-center gap-2 shrink-0 cursor-pointer text-xs"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    isCurrent
                      ? "bg-[#4f46e5] text-white shadow-sm"
                      : isPast
                      ? "bg-indigo-100 text-indigo-700 font-semibold"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isPast ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span
                  className={`font-medium ${
                    isCurrent
                      ? "text-indigo-600 font-bold"
                      : isPast
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {s.name}
                </span>
                {idx < STEPS.length - 1 && (
                  <span className="text-slate-300 ml-2 hidden sm:inline">———</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Basic Info */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 max-w-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Bot Identity & Purpose
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Give your AI chatbot a name and define what it will help users with.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bot Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g. Acme Customer Support"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-hidden focus:border-indigo-600 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Company / Organization Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-hidden focus:border-indigo-600 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bot Description & Purpose
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what questions this assistant should answer..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-hidden focus:border-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Add Knowledge */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Add knowledge to your AI
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload documents, add questions & answers, or import your website content.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            multiple
            accept=".pdf,.docx,.txt,.csv"
            className="hidden"
          />

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Upload Documents */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              className={`p-5 rounded-xl border text-center flex flex-col justify-between cursor-pointer transition-all ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-indigo-600 bg-white hover:shadow-xs"
              }`}
            >
              <div>
                <FileText className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">
                  Upload Documents
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  PDF, DOCX, TXT and more
                </p>
              </div>

              <button
                type="button"
                className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition-colors w-full"
              >
                + Upload Files
              </button>
            </div>

            {/* 2. Questions & Answers */}
            <div
              onClick={() => {
                const q = prompt("Enter a Question:");
                if (q) {
                  const a = prompt("Enter the Answer:");
                  if (a) {
                    setDocuments((prev) => [
                      ...prev,
                      {
                        name: `Q&A: ${q.substring(0, 25)}...`,
                        type: "Q&A",
                        size: "Custom",
                        status: "Ready",
                        uploaded: "Just now",
                      },
                    ]);
                  }
                }
              }}
              className="p-5 rounded-xl border border-slate-200 hover:border-indigo-600 bg-white hover:shadow-xs text-center flex flex-col justify-between cursor-pointer transition-all"
            >
              <div>
                <HelpCircle className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">
                  Questions & Answers
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Add specific Q&A pairs
                </p>
              </div>

              <button
                type="button"
                className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition-colors w-full"
              >
                + Add Q&A
              </button>
            </div>

            {/* 3. Website */}
            <div
              onClick={() => {
                const url = prompt("Enter website URL to crawl (e.g. https://mycompany.com):");
                if (url) {
                  setDocuments((prev) => [
                    ...prev,
                    {
                      name: url,
                      type: "WEB",
                      size: "Live Crawl",
                      status: "Ready",
                      uploaded: "Just now",
                    },
                  ]);
                }
              }}
              className="p-5 rounded-xl border border-slate-200 hover:border-indigo-600 bg-white hover:shadow-xs text-center flex flex-col justify-between cursor-pointer transition-all"
            >
              <div>
                <Globe className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">Website</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Import from your website
                </p>
              </div>

              <button
                type="button"
                className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition-colors w-full"
              >
                Add Website
              </button>
            </div>

            {/* 4. Enter Information */}
            <div
              onClick={() => {
                const text = prompt("Paste your custom text/knowledge info:");
                if (text) {
                  setDocuments((prev) => [
                    ...prev,
                    {
                      name: "Custom Information Note",
                      type: "TXT",
                      size: `${text.length} chars`,
                      status: "Ready",
                      uploaded: "Just now",
                    },
                  ]);
                }
              }}
              className="p-5 rounded-xl border border-slate-200 hover:border-indigo-600 bg-white hover:shadow-xs text-center flex flex-col justify-between cursor-pointer transition-all"
            >
              <div>
                <FileText className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-900">
                  Enter Information
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Add text manually
                </p>
              </div>

              <button
                type="button"
                className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-semibold text-xs hover:bg-indigo-100 transition-colors w-full"
              >
                + Add Info
              </button>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div className="space-y-3 pt-4">
            <h3 className="font-bold text-xs text-slate-900">
              Uploaded Documents ({documents.length})
            </h3>

            {documents.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  No documents uploaded yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload your PDFs, rate cards, or policy documents above to train this bot.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Choose Files
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Uploaded</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{doc.name}</span>
                        </td>
                        <td className="p-3 text-slate-500">{doc.type}</td>
                        <td className="p-3 text-slate-500">{doc.size}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{doc.uploaded}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeDocument(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Remove source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Behavior */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 max-w-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Bot Personality & Behavior
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control tone, response length, and instructions.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Personality Tone
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 outline-hidden"
              >
                <option value="Helpful & Professional">Helpful & Professional</option>
                <option value="Friendly & Casual">Friendly & Casual</option>
                <option value="Direct & Concise">Direct & Concise</option>
                <option value="Formal & Technical">Formal & Technical</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Response Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Short", "Balanced", "Detailed"].map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setResponseLength(len)}
                    className={`py-2 px-3 rounded-xl font-semibold border text-xs cursor-pointer ${
                      responseLength === len
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Custom System Instructions
              </label>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Always answer politely, prioritize scheduling consultations, and never mention internal costs..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Leads Capture */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 max-w-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Lead Generation Settings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically capture visitor contact information into your CRM.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">
                  Enable Autonomous Lead Capture
                </span>
                <span className="text-slate-500 text-[11px]">
                  Bot will prompt visitors for name, email, and phone when interest is shown.
                </span>
              </div>
              <input
                type="checkbox"
                checked={collectLeads}
                onChange={(e) => setCollectLeads(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Appearance (Matching Panel 5) */}
      {currentStep === 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: Customize Appearance */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Customize Appearance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Brand your chatbot widget to match your website.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bot name
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="My AI Assistant"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Bot avatar
                </label>
                <div className="flex items-center gap-2">
                  {avatarsList.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarIndex(idx)}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        avatarIndex === idx
                          ? "border-indigo-600 bg-indigo-50 shadow-xs ring-2 ring-indigo-500/20"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Primary color
                </label>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2">
                    {colorSwatches.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPrimaryColor(color)}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                          primaryColor.toUpperCase() === color.toUpperCase()
                            ? "scale-110 ring-2 ring-offset-2 ring-indigo-600"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-24 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Welcome message
                </label>
                <input
                  type="text"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Placeholder text
                </label>
                <input
                  type="text"
                  value={placeholderText}
                  onChange={(e) => setPlaceholderText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Position
                </label>
                <div className="flex items-center gap-2">
                  {["Bottom Right", "Bottom Left"].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosition(pos)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        position === pos
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Preview Widget */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col h-[460px]">
              <div
                className="p-4 text-white flex items-center justify-between"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{avatarsList[avatarIndex]}</span>
                  <span className="font-bold text-xs tracking-tight">
                    {botName || "AI Assistant"}
                  </span>
                </div>
                <button type="button" className="text-white/80 hover:text-white text-xs">✕</button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs shrink-0">
                        {avatarsList[avatarIndex]}
                      </span>
                    )}
                    <div
                      className={`p-3.5 rounded-2xl max-w-[88%] text-xs shadow-2xs leading-relaxed ${
                        msg.role === "user"
                          ? "text-white rounded-tr-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                      }`}
                      style={{
                        backgroundColor: msg.role === "user" ? primaryColor : "#ffffff",
                      }}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick suggestion prompt chips */}
              <div className="px-3 py-2 bg-slate-100/60 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                {[
                  "Send detail of hospital",
                  "Clinic opening hours",
                  "Book appointment",
                  "Emergency care",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer text-[10px]"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={placeholderText}
                  className="flex-1 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 outline-hidden"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl text-white shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              This is a live preview of your chatbot.
            </p>
          </div>
        </div>
      )}

      {/* STEP 6: Test */}
      {currentStep === 6 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4 max-w-3xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Test Your AI Assistant
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your bot answers questions correctly before publishing.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 h-72 overflow-y-auto space-y-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-lg text-xs shadow-xs leading-relaxed ${
                    msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white text-slate-800 border border-slate-200"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask your bot a test question..."
              className="flex-1 px-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-600"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
            >
              Send Test
            </button>
          </form>
        </div>
      )}

      {/* STEP 7: Publish & Launch */}
      {currentStep === 7 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Ready to Publish Your Bot
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your configuration and launch your chatbot.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 rounded-xl bg-white border border-indigo-100 shadow-xs">
                {avatarsList[avatarIndex]}
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {botName || "My AI Assistant"}
                </h3>
                <p className="text-slate-500">{companyName || "Organization"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100/60 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">Knowledge Sources:</span>
                <span className="font-semibold">{documents.length} document(s)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Tone:</span>
                <span className="font-semibold">{personality}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lead Generation:</span>
                <span className="font-semibold">{collectLeads ? "Enabled" : "Disabled"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Color Theme:</span>
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                  {primaryColor}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? "Launching Bot..." : "Publish & Activate Bot"}</span>
          </button>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
        >
          ← Back
        </button>

        {currentStep < 7 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(7, prev + 1))}
            className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            Finish & Launch
          </button>
        )}
      </div>
    </div>
  );
}
