"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REMEMBERED_EMAIL_KEY = "htwwm_remembered_email";

/** Selectors Clerk often uses for the sign-in identifier (email) input. */
const EMAIL_INPUT_SELECTORS = [
  'input[name="identifier"]',
  'input[type="email"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
];

function getEmailInput(): HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  for (const sel of EMAIL_INPUT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLInputElement) return el;
  }
  return null;
}

export function SignInRememberEmail() {
  const [rememberEmail, setRememberEmail] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load remembered email from localStorage and pre-fill the identifier input once Clerk has mounted.
  useEffect(() => {
    const email = typeof localStorage !== "undefined" ? localStorage.getItem(REMEMBERED_EMAIL_KEY) : null;
    if (!email || prefilled) return;

    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      const input = getEmailInput();
      if (input && !input.value?.trim()) {
        try {
          input.value = email;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          setPrefilled(true);
        } catch {
          /* ignore */
        }
      }
      attempts++;
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [prefilled]);

  // On mount, set checkbox to true if we have a stored email (so user sees it's "remembered").
  useEffect(() => {
    const email = typeof localStorage !== "undefined" ? localStorage.getItem(REMEMBERED_EMAIL_KEY) : null;
    setRememberEmail(!!email);
  }, []);

  // When "Remember email" is checked, periodically save the current identifier value to localStorage.
  useEffect(() => {
    if (!rememberEmail) {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      if (typeof localStorage !== "undefined") localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      return;
    }

    saveIntervalRef.current = setInterval(() => {
      const input = getEmailInput();
      const value = input?.value?.trim();
      if (value && value.includes("@")) {
        try {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, value);
        } catch {
          /* ignore */
        }
      }
    }, 1500);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [rememberEmail]);

  const handleToggle = useCallback(() => {
    setRememberEmail((prev) => {
      const next = !prev;
      if (!next && typeof localStorage !== "undefined") {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      return next;
    });
  }, []);

  return (
    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-mute">
      <input
        type="checkbox"
        checked={rememberEmail}
        onChange={handleToggle}
        className="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent"
        aria-label="Remember email"
      />
      <span>Remember email</span>
      {prefilled && (
        <span className="text-xs text-mute" aria-hidden>
          (pre-filled)
        </span>
      )}
    </label>
  );
}
