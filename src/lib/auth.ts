/**
 * NextAuth Configuration & Helpers
 * 
 * WHY NextAuth (v4):
 * NextAuth is the de facto auth library for Next.js. It handles the entire
 * OAuth flow (redirect to Google, callback handling, session management)
 * so we don't have to implement any of that ourselves. For a SaaS template
 * that needs to ship fast, this is the right choice.
 * 
 * WHY Google OAuth specifically:
 * Google has the highest conversion rate for sign-up among OAuth providers
 * because almost everyone has a Google account. We can add more providers
 * (GitHub, Apple) later, but Google alone covers 90%+ of our target users.
 * 
 * ARCHITECTURE NOTE:
 * We export authOptions separately from the route handler so that
 * getServerSession() can use them in API routes and server components.
 * This is the standard NextAuth v4 pattern for App Router.
 */

import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Validate required environment variables at module load time.
 * Better to fail fast during deployment than silently at runtime.
 */
function getGoogleCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local. " +
        "Create credentials at https://console.cloud.google.com/apis/credentials"
    );
  }

  return { clientId, clientSecret };
}

/**
 * NextAuth configuration options.
 * 
 * WHY JWT strategy: We use JWT sessions (not database sessions) because:
 * 1. No database required for basic auth — reduces infra complexity
 * 2. Faster session lookups (no DB query per request)
 * 3. Works with any hosting provider (no persistent connections needed)
 * 
 * The tradeoff is that we can't revoke individual sessions server-side,
 * but for a SaaS tool this is acceptable — users can sign out, and
 * JWTs expire naturally.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      ...getGoogleCredentials(),
    }),
  ],

  /**
   * Use JWT strategy for session management.
   * maxAge: 30 days — matches typical SaaS session length.
   * Users shouldn't have to re-login every day for a tool they use casually.
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },

  /**
   * Callbacks customize the JWT and session objects.
   * 
   * WHY we pass the user ID into the session:
   * The default NextAuth session only includes name, email, and image.
   * We need the user's unique ID (from the OAuth provider) to look up
   * their subscription status and credit balance. By adding it to the
   * JWT and then the session, it's available in every API route via
   * getServerSession().
   */
  callbacks: {
    async jwt({ token, user }) {
      /**
       * The `user` object is only available on initial sign-in.
       * After that, we rely on the token which persists the ID.
       */
      if (user) {
        token.userId = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      /**
       * Expose the userId on the session object so API routes
       * can identify the user without an extra database lookup.
       */
      if (session.user && token.userId) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },

  /**
   * Custom sign-in page path. NextAuth will redirect here when
   * an unauthenticated user tries to access a protected resource.
   * 
   * WHY "/": We redirect to the landing page which has a sign-in button,
   * rather than a separate /login page. This keeps the funnel simple:
   * land on page → see value prop → sign in → use tool.
   */
  pages: {
    signIn: "/",
  },
};
