"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const AUTH_CALLBACK = "/auth/callback";
const ALLOWED_NEXT_PREFIX = "/app";

/**
 * When Clerk sets the session after sign-in (factor-one/factor-two), Clerk's
 * redirect can fail in dev. This watches for signed-in state and sends the user
 * to /auth/callback. Preserves `next` from current page query (relative only).
 */
export function SignInRedirectFailsafe() {
  const { isSignedIn, isLoaded } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasRedirected.current) return;
    hasRedirected.current = true;

    let target = AUTH_CALLBACK;
    try {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const next = params.get("next");
      if (next && next.startsWith(ALLOWED_NEXT_PREFIX) && !next.includes("//")) {
        target = `${AUTH_CALLBACK}?next=${encodeURIComponent(next)}`;
      }
    } catch {
      /* use default */
    }
    window.location.href = target;
  }, [isLoaded, isSignedIn]);

  return null;
}
