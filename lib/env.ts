/**
 * Environment variable validation. Call at app startup or in critical paths.
 * Fails fast with clear errors; never logs secret values.
 */
const required = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const;

/** Optional env var names (documentation / future validation). */
export const optionalEnvKeys = [
  "NEXT_PUBLIC_APP_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NEXT_PUBLIC_STRIPE_ENABLED",
] as const;

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  for (const key of required) {
    const v = process.env[key];
    if (v === undefined || v === "") missing.push(key);
  }
  return { valid: missing.length === 0, missing };
}

/** Call in API health check or at server startup. */
export function assertEnv(): void {
  const { valid, missing } = validateEnv();
  if (!valid) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }
}
