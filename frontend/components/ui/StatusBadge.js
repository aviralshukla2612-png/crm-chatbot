import React from "react";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, size = "md" }) {
  if (!status) return null;

  const normalized = status.toUpperCase().trim();

  const styles = {
    // Bot / Org Statuses
    ACTIVE: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
      dot: "bg-emerald-500",
    },
    DRAFT: {
      badge: "bg-amber-50 text-amber-700 border-amber-200 font-medium",
      dot: "bg-amber-500",
    },
    PROCESSING: {
      badge: "bg-blue-50 text-blue-700 border-blue-200 font-medium animate-pulse",
      dot: "bg-blue-500",
    },
    DISABLED: {
      badge: "bg-slate-100 text-slate-600 border-slate-200 font-medium",
      dot: "bg-slate-400",
    },

    // Lead Commercial Scores
    HOT: {
      badge: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
      dot: "bg-rose-500",
    },
    HIGH: {
      badge: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
      dot: "bg-amber-500",
    },
    WARM: {
      badge: "bg-orange-50 text-orange-800 border-orange-200 font-semibold",
      dot: "bg-orange-500",
    },
    MEDIUM: {
      badge: "bg-sky-50 text-sky-800 border-sky-200 font-medium",
      dot: "bg-sky-500",
    },
    LOW: {
      badge: "bg-slate-100 text-slate-600 border-slate-200 font-medium",
      dot: "bg-slate-400",
    },
    COLD: {
      badge: "bg-slate-100 text-slate-600 border-slate-200 font-medium",
      dot: "bg-slate-400",
    },

    // Lead Pipeline Statuses
    NEW: {
      badge: "bg-blue-50 text-blue-700 border-blue-200 font-semibold",
      dot: "bg-blue-500",
    },
    CONTACTED: {
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium",
      dot: "bg-indigo-500",
    },
    QUALIFIED: {
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
      dot: "bg-emerald-500",
    },
    CONVERTED: {
      badge: "bg-teal-50 text-teal-800 border-teal-200 font-bold",
      dot: "bg-teal-600",
    },
    LOST: {
      badge: "bg-rose-50 text-rose-700 border-rose-200 font-medium",
      dot: "bg-rose-400",
    },
    CLOSED: {
      badge: "bg-slate-100 text-slate-600 border-slate-200 font-medium",
      dot: "bg-slate-400",
    },

    // System Status
    ONLINE: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
      dot: "bg-emerald-500",
    },
    OFFLINE: {
      badge: "bg-rose-50 text-rose-700 border-rose-200 font-medium",
      dot: "bg-rose-500",
    },
    READY: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium",
      dot: "bg-emerald-500",
    },
    UNANSWERED: {
      badge: "bg-amber-50 text-amber-700 border-amber-200 font-medium",
      dot: "bg-amber-500",
    },
  };

  const current = styles[normalized] || {
    badge: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
    dot: "bg-slate-400",
  };

  const sizeStyle =
    size === "sm"
      ? "text-[11px] px-2.5 py-0.5 tracking-tight"
      : "text-xs px-3 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border shadow-2xs whitespace-nowrap",
        sizeStyle,
        current.badge
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 shrink-0", current.dot)} />
      {status}
    </span>
  );
}
