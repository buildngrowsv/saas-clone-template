/**
 * Better Auth Configuration — Server-Side Authentication
 *
 * MIGRATION CONTEXT (2026-03-23):
 * This file was originally using NextAuth v4 (authOptions pattern). It has been
 * rewritten to use Better Auth because:
 *   1. The route handlers at /api/auth/[...all]/route.ts and several other API
 *      routes import `auth` (the Better Auth pattern), not `authOptions`.
 *   2. The auth-client.ts already uses `createAuthClient` from "better-auth/react",
 *      confirming the project was migrated to Better Auth on the client side but
 *      the server config file was never updated — causing a build-breaking mismatch.
 *   3. Better Auth has a cleaner API for Next.js App Router, better TypeScript
 *      support, and first-class Drizzle ORM integration via drizzleAdapter.
 *
 * WHY BETTER AUTH OVER NEXTAUTH:
 * Better Auth provides a more modern auth experience for Next.js 15+ projects:
 *   - Single `auth` export that works as both config and handler
 *   - Built-in adapter for Drizzle ORM (our database layer)
 *   - Simpler session API: `auth.api.getSession({ headers })` instead of
 *     `getServerSession(authOptions)` — no separate import needed
 *   - Works seamlessly with the [...all] catch-all route pattern
 *
 * WHY GOOGLE OAUTH:
 * Google has the highest sign-up conversion among OAuth providers because nearly
 * everyone has a Google account. We can add more providers later (GitHub, Apple),
 * but Google alone covers 90%+ of our target SaaS users.
 *
 * BACKWARD COMPATIBILITY:
 * We also export `authOptions` as an alias so that any legacy route files still
 * importing `authOptions` (e.g., /api/auth/[...nextauth]/route.ts, /api/generate/route.ts,
 * /api/stripe/checkout/route.ts) do not break at import time. Those files should
 * be migrated to use `auth` directly, but this alias buys time.
 *
 * SESSION DURATION:
 * 30-day sessions match typical SaaS session lengths. Users of casual tools
 * shouldn't need to re-login daily. The session.expiresIn value is in seconds.
 *
 * IMPORTED BY:
 * - src/app/api/auth/[...all]/route.ts (catch-all handler via toNextJsHandler)
 * - src/app/api/dashboard/route.ts (session check)
 * - src/app/api/stripe/checkout-session/route.ts (session check before payment)
 * - src/app/api/upload/{type}/presigned-url/route.ts (session check before upload)
 * - src/app/api/generate/route.ts (via authOptions alias)
 * - src/app/api/auth/[...nextauth]/route.ts (via authOptions alias — legacy)
 * - src/app/api/stripe/checkout/route.ts (via authOptions alias — legacy)
 *
 * DEPENDS ON:
 * - @/db (Drizzle ORM database client, lazily initialized)
 * - Environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendWelcomeEmail } from "@/lib/welcome-email";

/**
 * The main Better Auth instance — this is the primary export.
 *
 * CONFIGURATION DECISIONS:
 *
 * 1. drizzleAdapter(db): Connects auth to our existing Neon Postgres database
 *    via Drizzle ORM. Better Auth will create/read user and session records
 *    through the same DB connection pool used by the rest of the app.
 *
 * 2. Google socialProvider: Uses GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 *    from environment variables. These are set in .env.local for development
 *    and in Vercel dashboard for production. Create credentials at:
 *    https://console.cloud.google.com/apis/credentials
 *
 * 3. session.expiresIn: 30 days in seconds (30 * 24 * 60 * 60 = 2,592,000).
 *    This matches the session length we had with NextAuth. Users of SaaS tools
 *    expect persistent sessions — forcing frequent re-login hurts retention.
 *
 * 4. session.updateAge: 24 hours. The session token is refreshed (sliding window)
 *    if the user is active within this window. This means an active user's session
 *    effectively never expires, while an inactive user's session expires after 30 days.
 *
 * 5. BETTER_AUTH_SECRET: Used to sign session tokens. Falls back to NEXTAUTH_SECRET
 *    for backward compatibility if the env var hasn't been renamed yet during migration.
 *    In production, always set BETTER_AUTH_SECRET explicitly.
 */
export const auth = betterAuth({
  /**
   * Database adapter — connects Better Auth to our Neon Postgres via Drizzle.
   * The `db` import from @/db is a lazy Proxy, so the actual DB connection
   * is only created when auth first needs it (not at import/build time).
   */
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  /**
   * Social login providers.
   * Google is the primary (and currently only) provider.
   * Add more providers here as needed (github, apple, etc.).
   */
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },

  /**
   * Session configuration.
   * expiresIn: 30 days in seconds — long-lived for SaaS user convenience.
   * updateAge: 24 hours — sliding window refresh for active users.
   *
   * WHY 30 DAYS: Casual SaaS tool users (our target market) may use the tool
   * a few times a week. A 30-day session means they rarely need to re-authenticate,
   * reducing friction and improving retention metrics.
   */
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  /**
   * Secret for signing session tokens.
   * Falls back to NEXTAUTH_SECRET for projects migrating from NextAuth.
   * In fresh deployments, set BETTER_AUTH_SECRET in your environment.
   */
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,

  /**
   * Database hooks — lifecycle callbacks that fire when auth-related DB
   * records are created, updated, or deleted.
   *
   * WHY user.create.after FOR WELCOME EMAIL:
   * This hook fires AFTER the user row is committed to the database, meaning
   * the signup has definitively succeeded. We send the welcome email here
   * (not in a route handler or middleware) because:
   *   1. It fires exactly once per new user, regardless of auth provider
   *      (Google OAuth, email/password, magic link, etc.)
   *   2. The user record already exists, so we have their email and name
   *   3. It's the canonical "new user" event in Better Auth's lifecycle
   *
   * NON-BLOCKING PATTERN:
   * The welcome email is wrapped in try/catch so that email failures NEVER
   * break user signup. If Resend is down, misconfigured, or the env vars
   * aren't set, the user still gets their account. The console.warn in
   * the catch block ensures the failure is visible in server logs for
   * debugging without being a user-facing error.
   *
   * CLONE CUSTOMIZATION:
   * No per-clone changes needed here. The welcome email function reads
   * branding from siteConfig and PRODUCT_CONFIG automatically, so each
   * clone's email matches its own theme and pricing.
   */
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          /**
           * Send branded welcome email confirming free credits.
           * Non-blocking: failures are caught and logged, never thrown.
           * Skips gracefully when RESEND_API_KEY is not configured.
           */
          try {
            await sendWelcomeEmail(user.email, user.name);
          } catch (emailError) {
            console.warn(
              `[auth] Failed to send welcome email to user ${user.id}:`,
              emailError
            );
          }
        },
      },
    },
  },
});

/**
 * BACKWARD COMPATIBILITY EXPORT:
 * Several route files still import `authOptions` from this module because they
 * were written for the NextAuth v4 pattern (e.g., /api/auth/[...nextauth]/route.ts,
 * /api/generate/route.ts, /api/stripe/checkout/route.ts).
 *
 * By exporting `auth` as `authOptions`, those files will import successfully
 * without code changes. They should be migrated to use `auth` directly over time,
 * but this alias prevents a build-breaking import error in the meantime.
 *
 * NOTE: `authOptions` here is NOT a NextAuthOptions object — it IS the Better Auth
 * instance. Code that calls `getServerSession(authOptions)` will need updating,
 * but code that just re-exports or passes it to a handler will work as-is.
 */
export const authOptions = auth;
