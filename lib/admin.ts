/**
 * Admin allowlist. Only users whose Clerk ID is in ADMIN_USER_IDS can access /app/admin.
 * Set ADMIN_USER_IDS in env (comma-separated), e.g. "user_2abc,user_2def".
 */

const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

export function isAdmin(userId: string | null): boolean {
  if (!userId) return false;
  return ADMIN_IDS.has(userId);
}
