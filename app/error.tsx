"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

/**
 * Root error boundary. Shows a friendly message and retry; never exposes stack or internal details.
 * Logs only non-sensitive metadata (route/event), not error message content.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("error_boundary", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="text-mute">
          We couldn’t complete that. Please try again or return to the home page.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2.5 bg-accent text-white font-medium rounded-full shadow-card hover:bg-accent/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 border border-neutral-200 font-medium rounded-full hover:bg-neutral-50 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
