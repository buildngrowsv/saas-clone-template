/**
 * Better Auth client — used in React components for sign-in, sign-out, and session state.
 *
 * WHY A SEPARATE CLIENT:
 * Better Auth has a client/server split. The server-side auth (auth.ts) handles
 * actual authentication logic, token verification, and database operations.
 * This client-side module provides React hooks and methods that communicate
 * with the server via the /api/auth/[...all] route handler.
 *
 * HOW IT WORKS:
 * The client sends requests to your auth API endpoint (baseURL + /api/auth/*).
 * It manages cookies, CSRF tokens, and session state transparently.
 *
 * IMPORTED BY:
 * - src/app/login/page.tsx (Google sign-in button)
 * - src/components/layout/SiteHeader.tsx (user menu, session state, sign out)
 * - src/app/(main)/pricing/page.tsx (check if user is logged in before checkout)
 * - src/app/(main)/dashboard/page.tsx (display user info)
 * - Any client component that needs auth state or actions
 *
 * USAGE:
 *   import { authClient } from "@/lib/auth-client";
 *
 *   // Hook: get session in a component
 *   const { data: session } = authClient.useSession();
 *
 *   // Action: sign in with Google
 *   await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
 *
 *   // Action: sign out
 *   await authClient.signOut();
 *
 * IMPORTANT:
 * The baseURL must match your deployment URL. In development, it defaults to
 * localhost:4738 (the port configured in this template's package.json scripts).
 * In production, set NEXT_PUBLIC_APP_URL to your domain.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  /**
   * Base URL for auth API requests.
   * NEXT_PUBLIC_APP_URL should be set in .env.local for development
   * and in Vercel environment variables for production.
   * Falls back to localhost:4738 which matches our dev port.
   */
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4738",
});
