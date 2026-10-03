/**
 * Production build check: validate required env vars before building.
 * Run with: npm run build:check
 * Does not load .env.local; set vars in CI or export before running.
 */
const required = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
];

const missing = required.filter((key) => !process.env[key] || process.env[key] === "");

if (missing.length > 0) {
  console.error("Missing required env for production build:", missing.join(", "));
  process.exit(1);
}

console.log("Env check passed.");
