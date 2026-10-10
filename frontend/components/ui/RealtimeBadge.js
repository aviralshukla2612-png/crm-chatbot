"use client";

import React from "react";
import { Activity, RefreshCw } from "lucide-react";

export default function RealtimeBadge({ isLive = true, lastSync = null, onRefresh = null }) {
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium">
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? "bg-emerald-500" : "bg-amber-400"}`}></span>
      </span>
      <span className="font-semibold tracking-wide flex items-center gap-1">
        {isLive ? "Live Real-Time Data" : "Connecting..."}
      </span>
      {lastSync && (
        <span className="text-[10px] text-emerald-700/70 font-mono hidden sm:inline">
          ({new Date(lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })})
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Manual refresh"
          className="ml-1 text-emerald-600 hover:text-emerald-800 transition-colors p-0.5"
        >
          <RefreshCw className="w-3 h-3 hover:rotate-180 transition-transform duration-300" />
        </button>
      )}
    </div>
  );
}
