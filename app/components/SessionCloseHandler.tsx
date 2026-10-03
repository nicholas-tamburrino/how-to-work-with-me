"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const TAB_COUNT_KEY = "htwwm_tabCount";
const PENDING_SIGNOUT_KEY = "htwwm_pendingSignOut";
const UNLOADED_AT_KEY = "htwwm_unloadedAt";
const TAB_ID_KEY = "htwwm_tabId";
const REFRESH_THRESHOLD_MS = 250;

/**
 * Best-effort: sign out when the last tab/window is closed.
 * Does NOT sign out on refresh or in-app navigation.
 * Uses tab count in localStorage; on beforeunload decrements count; when count
 * hits 0 we set pendingSignOut. On next load, if we're a new tab and
 * pendingSignOut is set, we call signOut(). If we're the same tab (refresh),
 * we detect it via sessionStorage and restore count without signing out.
 */
export function SessionCloseHandler() {
  const { signOut } = useClerk();
  const mounted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mounted.current) return;
    mounted.current = true;

    const tabId = sessionStorage.getItem(TAB_ID_KEY);
    const unloadedAt = typeof localStorage !== "undefined" ? Number(localStorage.getItem(UNLOADED_AT_KEY) || 0) : 0;
    const pendingSignOut = typeof localStorage !== "undefined" ? localStorage.getItem(PENDING_SIGNOUT_KEY) === "true" : false;

    if (tabId) {
      // Same tab (e.g. refresh or in-app nav). sessionStorage persisted.
      if (pendingSignOut && unloadedAt && Date.now() - unloadedAt < REFRESH_THRESHOLD_MS) {
        // Likely refresh: restore tab count so we don't sign out.
        const count = Math.max(1, Number(localStorage.getItem(TAB_COUNT_KEY) || 0) + 1);
        localStorage.setItem(TAB_COUNT_KEY, String(count));
      }
      localStorage.removeItem(PENDING_SIGNOUT_KEY);
      localStorage.removeItem(UNLOADED_AT_KEY);
      return;
    }

    // New tab or first load in this tab.
    const newTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(TAB_ID_KEY, newTabId);
    const prevCount = Number(localStorage.getItem(TAB_COUNT_KEY) || 0);
    const newCount = prevCount + 1;
    localStorage.setItem(TAB_COUNT_KEY, String(newCount));

    if (pendingSignOut) {
      localStorage.removeItem(PENDING_SIGNOUT_KEY);
      localStorage.removeItem(UNLOADED_AT_KEY);
      signOut?.({ redirectUrl: "/sign-in" });
    }
  }, [signOut]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      const count = Math.max(0, Number(localStorage.getItem(TAB_COUNT_KEY) || 1) - 1);
      localStorage.setItem(TAB_COUNT_KEY, String(count));
      if (count === 0) {
        localStorage.setItem(PENDING_SIGNOUT_KEY, "true");
        localStorage.setItem(UNLOADED_AT_KEY, String(Date.now()));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return null;
}
