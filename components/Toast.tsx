"use client";

import React, { useCallback, useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let nextId = 0;
const TOAST_DURATION_MS = 4000;

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      success: (m) => console.log("[toast]", m),
      error: (m) => console.error("[toast]", m),
      info: (m) => console.log("[toast]", m),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
    return id;
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = React.useMemo(
    () => ({
      success: (message) => add("success", message),
      error: (message) => add("error", message),
      info: (message) => add("info", message),
    }),
    [add]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

function Toaster({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: number) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [item.id, onRemove]);

  const styles =
    item.type === "success"
      ? "bg-success-800 text-white border border-success-700 shadow-card"
      : item.type === "error"
        ? "bg-error-800 text-white border border-error-700 shadow-card"
        : "bg-neutral-800 text-white border border-neutral-700 shadow-card";

  return (
    <div
      className={`toast-enter px-4 py-3 rounded-xl border shadow-card pointer-events-auto ${styles}`}
      role="alert"
    >
      <p className="text-sm font-medium">{item.message}</p>
    </div>
  );
}
