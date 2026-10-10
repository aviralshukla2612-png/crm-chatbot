"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Universal Real-Time Data Synchronization Hook
 * Combines Server-Sent Events (SSE) push + adaptive background polling + window focus revalidation
 * Ensures data stays live in real-time without user ever needing to manually refresh.
 */
export function useRealtimeSync(onSync, options = {}) {
  const {
    pollingInterval = 3500,
    events = null, // null means all events
    enabled = true,
  } = options;

  const [isLive, setIsLive] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  const triggerSync = useCallback(async () => {
    if (typeof onSyncRef.current === "function") {
      try {
        await onSyncRef.current();
        setLastSync(new Date());
      } catch (err) {
        console.warn("[RealtimeSync] Sync error:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let eventSource = null;
    let pollTimer = null;
    let isMounted = true;

    // 1. Initial Load in background
    const executeInitial = async () => {
      if (typeof onSyncRef.current === "function") {
        try {
          await onSyncRef.current();
          if (isMounted) setLastSync(new Date());
        } catch (e) {}
      }
    };
    executeInitial();

    // 2. Setup Server-Sent Events (SSE) stream
    function connectSSE() {
      try {
        eventSource = new EventSource("/api/realtime");

        eventSource.onopen = () => {
          if (isMounted) setIsLive(true);
        };

        eventSource.onmessage = (e) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(e.data);
            if (payload.type === "connected") {
              setIsLive(true);
              return;
            }

            // If specific events filter was passed, check match
            if (events && Array.isArray(events) && !events.includes(payload.type)) {
              return;
            }

            // Immediately trigger smooth background data sync
            if (typeof onSyncRef.current === "function") {
              onSyncRef.current().then(() => {
                if (isMounted) setLastSync(new Date());
              }).catch(() => {});
            }
          } catch (err) {
            // Ignore non-json heartbeats
          }
        };

        eventSource.onerror = () => {
          if (isMounted) setIsLive(false);
        };
      } catch (err) {
        if (isMounted) setIsLive(false);
      }
    }

    connectSSE();

    // 3. Resilient Polling Fallback (ensures freshness even across network hiccups)
    if (pollingInterval > 0) {
      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible" && typeof onSyncRef.current === "function") {
          onSyncRef.current().then(() => {
            if (isMounted) setLastSync(new Date());
          }).catch(() => {});
        }
      }, pollingInterval);
    }

    // 4. Tab visibility & focus revalidation (instant refresh when user switches tab)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && typeof onSyncRef.current === "function") {
        onSyncRef.current().then(() => {
          if (isMounted) setLastSync(new Date());
        }).catch(() => {});
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [enabled, pollingInterval, events]);

  return { isLive, lastSync, triggerSync };
}
