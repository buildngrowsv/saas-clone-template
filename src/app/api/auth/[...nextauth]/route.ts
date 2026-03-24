/**
 * NextAuth API Route Handler — /api/auth/[...nextauth]
 * 
 * WHY THIS FILE:
 * NextAuth v4 with App Router requires a catch-all route handler that
 * delegates to NextAuth's internal handler. The [...nextauth] path segment
 * catches all auth-related routes:
 *   - /api/auth/signin — triggers OAuth sign-in flow
 *   - /api/auth/callback/google — handles OAuth callback from Google
 *   - /api/auth/session — returns current session (used by SessionProvider)
 *   - /api/auth/signout — handles sign-out
 * 
 * We import authOptions from @/lib/auth to keep the config in one place
 * (it's also needed by getServerSession() in other API routes).
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Create the NextAuth handler with our config.
 * Both GET and POST are needed:
 *   - GET: session checks, CSRF token, provider list
 *   - POST: sign-in, sign-out, callback handling
 */
const nextAuthHandler = NextAuth(authOptions);

export { nextAuthHandler as GET, nextAuthHandler as POST };
