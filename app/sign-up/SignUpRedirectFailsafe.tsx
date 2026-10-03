"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const AUTH_CALLBACK = "/auth/callback";

/**
 * When Clerk sets the session after sign-up, redirect can fail. This watches
 * for signed-in state and sends the user to /auth/callback immediately.
 */
export function SignUpRedirectFailsafe() {
  const { isSignedIn, isLoaded } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasRedirected.current) return;
    hasRedirected.current = true;
    window.location.href = AUTH_CALLBACK;
  }, [isLoaded, isSignedIn]);

  return null;
}
