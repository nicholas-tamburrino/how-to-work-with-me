"use client";

import { useEffect, useMemo, useState } from "react";
import { Laptop2, Moon, Sun } from "lucide-react";

type ThemeMode = "system" | "light" | "dark";
const STORAGE_KEY = "htwwm_theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const theme = mode === "system" ? getSystemTheme() : mode;
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  const Icon = useMemo(() => {
    if (mode === "light") return Sun;
    if (mode === "dark") return Moon;
    return Laptop2;
  }, [mode]);

  const label = useMemo(() => {
    if (mode === "light") return "Theme: light (click to change)";
    if (mode === "dark") return "Theme: dark (click to change)";
    return "Theme: system (click to change)";
  }, [mode]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const initial: ThemeMode =
        stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
      setMode(initial);
      applyTheme(initial);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (mode !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");

    try {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } catch {
      // Safari fallback
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, [mode]);

  function cycleMode() {
    const next: ThemeMode = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycleMode}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-token bg-surface-2 text-mute hover:text-ink hover:border-accent-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ring-offset-surface"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

