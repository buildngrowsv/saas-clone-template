/**
 * AuthSessionProvider — Client-side wrapper for NextAuth SessionProvider
 *
 * WHY THIS SEPARATE FILE EXISTS:
 * Next.js App Router requires that React context providers (like SessionProvider)
 * be client components (marked with "use client"). But we want our root layout
 * to remain a server component for performance. The solution is this pattern:
 * extract the provider into its own client component file and import it in layout.tsx.
 *
 * This is the officially recommended pattern from both the Next.js and NextAuth docs.
 * Without this, you'd have to make the entire layout a client component, which would
 * disable server-side rendering for the whole app — a significant performance hit.
 *
 * UTM CAPTURE INTEGRATION (2026-04-13):
 * This provider also runs the useUtmCapture() hook, which captures UTM parameters
 * from the URL on first page load and persists them to localStorage + cookie.
 * It runs here (root level) so UTMs are captured before any child component
 * checks paywall state via useUsageTracking(). The hook is idempotent — it
 * respects first-touch attribution and won't overwrite existing UTM data.
 */

"use client";

import { SessionProvider } from "next-auth/react";
import { useUtmCapture } from "@/hooks/useUtmCapture";

/**
 * Internal component that runs the UTM capture hook.
 *
 * WHY a separate component (not inline in AuthSessionProvider):
 * Hooks must be called inside a component body. We can't call useUtmCapture()
 * directly in AuthSessionProvider because it returns JSX — we need a component
 * that renders nothing but runs the hook. This is a standard React pattern
 * for "effect-only" components.
 */
function UtmCaptureRunner() {
  useUtmCapture();
  return null;
}

/**
 * Wraps children in NextAuth's SessionProvider and initializes UTM capture.
 * The session prop is intentionally omitted — SessionProvider will fetch
 * the session from the /api/auth/session endpoint on mount. This is
 * slightly slower than passing a pre-fetched session, but simpler and
 * works correctly with App Router's server/client component boundary.
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <UtmCaptureRunner />
      {children}
    </SessionProvider>
  );
}
