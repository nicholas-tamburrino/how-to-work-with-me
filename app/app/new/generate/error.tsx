"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

/**
 * Generate page error boundary. Catches generation failures.
 * Friendly message and retry; no stack or internal details.
 */
export default function GenerateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("generate_page_error", { digest: error.digest });
  }, [error.digest]);

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-xl font-semibold text-ink">Generation didn’t complete</h1>
        <p className="text-mute">
          We couldn’t generate your manual. Please try again or go back to the questionnaire.
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
            href="/app/new"
            className="px-4 py-2 border border-stone-200 font-medium rounded-lg hover:bg-stone-50"
          >
            Back to questionnaire
          </Link>
        </div>
      </div>
    </main>
  );
}
