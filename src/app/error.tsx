"use client";

/**
 * Global error boundary — catches unhandled errors in any route segment.
 *
 * WHY THIS PAGE EXISTS:
 * Without a custom error boundary, unhandled exceptions show Next.js's default
 * error overlay in development and a blank/broken page in production. This page:
 * 1. Shows a branded, professional error message instead of a stack trace
 * 2. Offers a "Try again" button that re-renders the failed segment
 * 3. Provides navigation home so users aren't stranded
 *
 * WHY "use client":
 * Error boundaries in Next.js App Router MUST be client components because
 * they use React's error boundary mechanism (which requires useEffect/state).
 * This is a Next.js requirement, not a choice.
 *
 * The `reset` function re-renders the route segment that threw, which often
 * clears transient errors (race conditions, stale cache, intermittent API).
 */

import { useEffect } from "react";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="mb-2 text-5xl font-bold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        An unexpected error occurred. This has been logged and we&apos;ll look
        into it. You can try again or head back to the homepage.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
        <a
          href="/"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
