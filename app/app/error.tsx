"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

/** Safely get a short message from error (may be Error or serialized object). */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return "Something went wrong";
}

/** Heuristic: likely a DB/schema issue (missing table, etc.). */
function looksLikeDbError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  if (msg.includes("relation") && msg.includes("does not exist")) return true;
  if (msg.includes("42p01") || msg.includes("pgrst") || msg.includes("postgres")) return true;
  const obj = err as { code?: string };
  return obj?.code === "42P01" || obj?.code === "PGRST301";
}

/**
 * App area error boundary. Friendly message and retry; no stack or internal details.
 * Logs only event + pathname for observability.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    logger.error("app_error_boundary", { pathname, digest: error?.digest });
  }, [pathname, error?.digest]);

  const handleTryAgain = () => {
    reset();
    router.refresh();
  };

  const isDbError = looksLikeDbError(error);

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="text-mute">
          We couldn’t complete that. You can try again or go back to your dashboard.
        </p>
        {isDbError && (
          <p className="text-sm text-mute bg-stone-100 rounded-lg p-3 text-left">
            This often means the database schema isn’t set up yet. In the Supabase
            dashboard, open the SQL Editor and run the script in{" "}
            <code className="text-ink font-mono text-xs">supabase/schema.sql</code>.
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={handleTryAgain}
            className="px-4 py-2 bg-ink text-surface font-medium rounded-lg hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="px-4 py-2 border border-stone-200 font-medium rounded-lg hover:bg-stone-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
