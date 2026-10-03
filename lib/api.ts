/**
 * Client-side API helpers. Build absolute URLs so requests from dynamic routes
 * (e.g. /app/manual/[id]) hit /api/... and not /app/manual/api/...
 */
export function api(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return new URL(normalized, window.location.origin).toString();
  }
  return normalized;
}
