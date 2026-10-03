"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

/**
 * Manual page error boundary. Covers generation/export/share failures that bubble.
 * User-friendly message and retry; no stack traces.
 */
export default function ManualError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("manual_page_error", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="text-mute">
          We couldn’t load or update your manual. Please try again or return to your dashboard.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
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
