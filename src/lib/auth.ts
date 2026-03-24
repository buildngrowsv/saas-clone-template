/**
 * Better Auth server configuration — the single source of truth for authentication.
 *
 * WHY BETTER AUTH:
 * Better Auth was chosen over NextAuth/Auth.js because it's simpler, type-safe,
 * and works seamlessly with Drizzle ORM. It handles OAuth providers, session
 * management, and CSRF protection out of the box. It also doesn't require
 * complex adapter configurations — the Drizzle adapter just works.
 *
 * ARCHITECTURE:
 * Better Auth uses a "catch-all" API route pattern. All auth requests
 * (sign-in, sign-out, OAuth callbacks, session checks) go through a single
 * route handler at /api/auth/[...all]. The auth instance configured here
 * processes those requests.
 *
 * LAZY INITIALIZATION:
 * The auth instance is lazily initialized (created on first use, not at import time).
 * This is CRITICAL for Next.js deployment because:
 * 1. At build time, env vars (GOOGLE_CLIENT_ID, DATABASE_URL) are not available
 * 2. If we created the auth instance at import time, it would crash the build
 * 3. The Proxy pattern defers creation to runtime when env vars exist
 *
 * This pattern was discovered during the banananano2pro production readiness audit
 * and is now standard for all env-dependent singletons in this template.
 *
 * IMPORTED BY:
 * - src/app/api/auth/[...all]/route.ts (handles all auth API requests)
 * - src/app/api/stripe/checkout-session/route.ts (getSession for auth check)
 * - src/app/api/upload/*/presigned-url/route.ts (getSession for auth check)
 * - src/app/api/dashboard/route.ts (getSession for auth check)
 * - Any server component or API route that needs auth.api.getSession()
 *
 * ADDING PROVIDERS:
 * To add GitHub, Apple, or other OAuth providers, add them to the socialProviders
 * object below and set the corresponding env vars. See Better Auth docs.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";

/**
 * Private singleton — holds the created auth instance.
 * null until first access at runtime.
 */
let _auth: ReturnType<typeof betterAuth> | null = null;

/**
 * Create the Better Auth instance with all configuration.
 * Called once on first access via the Proxy below.
 */
function createAuth() {
  return betterAuth({
    /**
     * Database adapter — uses Drizzle ORM with the Neon Postgres driver.
     * Better Auth automatically creates/manages its own tables:
     * - `user` (auth user records)
     * - `session` (active sessions)
     * - `account` (OAuth provider links)
     * - `verification` (email verification tokens)
     *
     * Our app-specific data lives in separate tables (user_profiles, subscriptions, etc.)
     * to avoid migration conflicts with Better Auth's auto-managed tables.
     */
    database: drizzleAdapter(getDb(), {
      provider: "pg",
    }),

    /**
     * OAuth providers — Google is the default.
     * To add more providers, add entries here and set the env vars.
     * Each provider needs a Client ID and Client Secret from their developer console.
     *
     * SETUP:
     * 1. Go to Google Cloud Console > APIs & Services > Credentials
     * 2. Create an OAuth 2.0 Client ID (Web application)
     * 3. Add authorized redirect URI: https://yourdomain.com/api/auth/callback/google
     * 4. Copy Client ID and Client Secret to .env.local
     */
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
  });
}

/**
 * Lazy singleton via Proxy — initialized on first property access at runtime.
 *
 * WHY A PROXY:
 * We can't use a simple `export const auth = createAuth()` because that runs
 * at import time, which happens during the Next.js build when env vars don't exist.
 * The Proxy intercepts property access (like `auth.api.getSession()`) and creates
 * the real instance only when it's actually needed at runtime.
 *
 * This is the same pattern used by stripe.ts and db/index.ts in this template.
 */
export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    if (!_auth) _auth = createAuth();
    return (_auth as unknown as Record<string | symbol, unknown>)[prop];
  },
});
