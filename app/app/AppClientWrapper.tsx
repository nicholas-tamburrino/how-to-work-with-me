"use client";

import { ToastProvider } from "@/components/Toast";

export function AppClientWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
