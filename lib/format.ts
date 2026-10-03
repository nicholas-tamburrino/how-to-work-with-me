/**
 * Format a date/time for display. Uses toLocaleString with medium date + short time.
 * Falls back to Intl.DateTimeFormat with explicit options if dateStyle/timeStyle are unsupported.
 */
export function formatDateTime(value: string | number | Date): string {
  const date = typeof value === "object" && value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    // Older runtimes may not support dateStyle/timeStyle; use explicit options
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}
