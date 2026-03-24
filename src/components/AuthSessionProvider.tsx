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
 */

"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Wraps children in NextAuth's SessionProvider.
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
  return <SessionProvider>{children}</SessionProvider>;
}
