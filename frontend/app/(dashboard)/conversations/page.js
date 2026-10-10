"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  FileText,
  Send,
  User,
  Bot,
  ExternalLink,
  Plus,
  ArrowRight,
} from "lucide-react";
import { conversationsApi } from "@/lib/api/conversations";
import { useRealtimeSync } from "@/lib/hooks/useRealtimeSync";
import RealtimeBadge from "@/components/ui/RealtimeBadge";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [replyInput, setReplyInput] = useState("");

  const loadConversations = async () => {
    try {
      const data = await conversationsApi.getConversations();
      setConversations(data || []);
      if (data && data.length > 0) {
        setSelectedId((prev) => (prev ? (data.some((c) => c.id === prev) ? prev : data[0].id) : data[0].id));
      }
    } catch (err) {
      console.warn("Conversations real-time sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization hook (SSE event stream + adaptive background polling)
  const { isLive, lastSync, triggerSync } = useRealtimeSync(loadConversations, {
    pollingInterval: 3000,
  });

  const filtered = conversations.filter((c) => {
    if (filterTab === "Active" && c.status !== "Active") return false;
    if (filterTab === "Leads" && !c.isLead) return false;
    if (filterTab === "Resolved" && c.status !== "Resolved") return false;
    if (
      search &&
      !c.visitorName?.toLowerCase().includes(search.toLowerCase()) &&
      !c.lastMessage?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const currentChat = conversations.find((c) => c.id === selectedId) || filtered[0] || null;

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyInput.trim() || !currentChat) return;
    const text = replyInput;
    setReplyInput("");
    await conversationsApi.addMessage(currentChat.id, {
      role: "assistant",
      content: text,
    });
    loadConversations();
  };

  const handleMarkResolved = async () => {
    if (!currentChat) return;
    await conversationsApi.markResolved(currentChat.id);
    loadConversations();
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-800 font-sans">
      {/* Top Header with Real-Time Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Live Conversations & Chat Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, inspect, and reply to visitor inquiries in real-time.
          </p>
        </div>
        <RealtimeBadge isLive={isLive} lastSync={lastSync} onRefresh={triggerSync} />
      </div>

      {/* 3-Column Layout Matching Panel 6 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col lg:flex-row h-[740px]">
        {/* COLUMN 1: Conversation List */}
        <div className="w-full lg:w-72 xl:w-80 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Conversations
                </h2>
                <span className="text-xs font-semibold text-slate-400">
                  ({conversations.length})
                </span>
              </div>
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await conversationsApi.clearAll();
                    setSelectedId(null);
                    loadConversations();
                  }}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 text-xs">
              {["All", "Active", "Leads", "Resolved"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    filterTab === tab
                      ? "bg-[#4f46e5] text-white font-bold"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 outline-hidden focus:border-indigo-600"
              />
            </div>
          </div>

          {/* List items or Empty state */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {!loading && conversations.length === 0 && (
              <div className="p-8 text-center space-y-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  No conversations yet
                </h4>
                <p className="text-xs text-slate-400">
                  New visitor conversations will appear here in real-time when users interact with your chatbot.
                </p>
                <div className="pt-2">
                  <Link
                    href="/bots"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-xs"
                  >
                    <span>View Bots</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors relative ${
                  item.id === selectedId
                    ? "bg-indigo-50/50"
                    : "hover:bg-slate-50/70"
                }`}
              >
                {item.id === selectedId && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4f46e5]" />
                )}

                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                  {item.visitorName?.charAt(0) || "U"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {item.visitorName}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {item.startedAt || "Recently"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {item.lastMessage || "Started chat session"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: Chat Transcript */}
        <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
          {currentChat ? (
            <>
              {/* Top Chat Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {currentChat.visitorName?.charAt(0) || "V"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {currentChat.visitorName}
                    </h3>
                    <span className="text-[11px] text-slate-400">Visitor</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMarkResolved}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {currentChat.status === "Resolved" ? "Resolved" : "Mark Resolved"}
                </button>
              </div>

              {/* Messages Flow */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
                <div className="text-center">
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-full">
                    {currentChat.startedAt || "Today"}
                  </span>
                </div>

                {currentChat.messages?.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className={`flex items-start gap-2.5 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role !== "user" && (
                      <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0 font-bold">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl max-w-md text-xs shadow-2xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#4f46e5] text-white rounded-tr-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text || msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <form
                onSubmit={handleSendReply}
                className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-600 text-slate-800"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
              Select a conversation to view transcript
            </div>
          )}
        </div>

        {/* COLUMN 3: Visitor & Conversation Metadata */}
        <div className="w-full lg:w-64 xl:w-72 p-5 bg-white space-y-6 overflow-y-auto shrink-0 text-xs">
          {currentChat ? (
            <>
              {/* VISITOR INFO */}
              <div className="space-y-3">
                <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                  Visitor Info
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900">
                      {currentChat.visitorName}
                    </span>
                  </div>

                  {currentChat.visitorPhone && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{currentChat.visitorPhone}</span>
                    </div>
                  )}

                  {currentChat.visitorEmail && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{currentChat.visitorEmail}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{currentChat.visitorLocation || "Direct Session"}</span>
                  </div>
                </div>
              </div>

              {/* CONVERSATION INFO */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                  Conversation Info
                </h4>

                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-medium text-slate-800">
                      {currentChat.duration || "1 min"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Messages:</span>
                    <span className="font-medium text-slate-800">
                      {currentChat.messages?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bot:</span>
                    <span className="font-semibold text-indigo-600">
                      {currentChat.botName || "Custom Bot"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-medium text-slate-800">
                      {currentChat.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* LEAD INFORMATION */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                  Lead Information
                </h4>

                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Lead Score:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                      {currentChat.leadScore || "Medium"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold text-slate-900">
                      {currentChat.isLead ? "Captured" : "Prospect"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-400 text-xs text-center py-6">
              No conversation selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
