/**
 * Safe structured logging. Never log answers, manual content, or PII.
 * Log only event types and non-sensitive metadata (e.g. ids, status codes).
 * Prepared for future monitoring integration (e.g. Datadog, Axiom).
 */
export type LogMeta = Record<string, string | number | boolean | undefined>;

function safeLog(level: "info" | "warn" | "error", event: string, meta?: LogMeta) {
  const payload = { level, event, ...meta, ts: new Date().toISOString() };
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(payload));
  } else {
    console[level === "error" ? "error" : "log"](event, meta ?? "");
  }
}

export const logger = {
  info(event: string, meta?: LogMeta) {
    safeLog("info", event, meta);
  },
  warn(event: string, meta?: LogMeta) {
    safeLog("warn", event, meta);
  },
  error(event: string, meta?: LogMeta) {
    safeLog("error", event, meta);
  },
  /** Request outcome: path, method, status. Never log body or user content. */
  request(path: string, method: string, status: number) {
    safeLog("info", "request", { path, method, status });
  },
  /** Generation job completed or failed. Log jobId and type only. */
  generation(outcome: "success" | "failure", jobId?: string) {
    safeLog(outcome === "success" ? "info" : "error", "generation", { outcome, jobId });
  },
  /** Rate limit hit. Do not log identifier (user id / IP). */
  rateLimit(endpoint: string) {
    safeLog("warn", "rate_limit_triggered", { endpoint });
  },
};
