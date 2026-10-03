/**
 * Rate limiting: protects expensive or sensitive endpoints.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set;
 * otherwise falls back to in-memory limits (per-instance). Swap to Redis in production for consistency.
 *
 * No sensitive data is logged; identifier is typically user id or IP.
 */

export type RateLimitEndpoint =
  | "generate"
  | "export-pdf"
  | "share"
  | "share-view";

const LIMITS: Record<
  RateLimitEndpoint,
  { max: number; windowSeconds: number; message: string }
> = {
  generate: {
    max: 5,
    windowSeconds: 60,
    message: "Too many manual generations. Please try again in a minute.",
  },
  "export-pdf": {
    max: 5,
    windowSeconds: 60,
    message: "Too many PDF exports. Please try again in a minute.",
  },
  share: {
    max: 10,
    windowSeconds: 60,
    message: "Too many share link actions. Please try again in a minute.",
  },
  "share-view": {
    max: 60,
    windowSeconds: 60,
    message: "Too many views. Please try again in a minute.",
  },
};

// In-memory fallback when Redis is not configured (per endpoint, per identifier)
const memoryStore = new Map<
  string,
  { count: number; resetAt: number }
>();

function getMemoryKey(endpoint: RateLimitEndpoint, identifier: string): string {
  return `${endpoint}:${identifier}`;
}

async function checkMemory(
  endpoint: RateLimitEndpoint,
  identifier: string
): Promise<{ success: boolean; message: string }> {
  const config = LIMITS[endpoint];
  const key = getMemoryKey(endpoint, identifier);
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = memoryStore.get(key);

  if (!entry) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, message: "" };
  }
  if (now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, message: "" };
  }
  if (entry.count >= config.max) {
    const { logger } = await import("@/lib/logger");
    logger.rateLimit(endpoint);
    return { success: false, message: config.message };
  }
  entry.count++;
  return { success: true, message: "" };
}

async function checkUpstash(
  endpoint: RateLimitEndpoint,
  identifier: string
): Promise<{ success: boolean; message: string }> {
  const config = LIMITS[endpoint];
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.max, `${config.windowSeconds} s`),
    prefix: `htwwm:${endpoint}`,
  });

  const result = await ratelimit.limit(identifier);
  if (result.success) return { success: true, message: "" };
  const { logger } = await import("@/lib/logger");
  logger.rateLimit(endpoint);
  return { success: false, message: config.message };
}

/**
 * Check rate limit for the given endpoint and identifier (e.g. userId or IP).
 * Returns { success: true } or { success: false, message }.
 * Use the message in 429 response; do not log the identifier.
 */
export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  identifier: string
): Promise<{ success: boolean; message: string }> {
  const useRedis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (useRedis) {
    try {
      return await checkUpstash(endpoint, identifier);
    } catch {
      return await checkMemory(endpoint, identifier);
    }
  }
  return await checkMemory(endpoint, identifier);
}
