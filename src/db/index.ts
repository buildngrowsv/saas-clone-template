/**
 * Drizzle ORM client — connects to Neon Postgres via the serverless HTTP driver.
 *
 * WHY NEON + DRIZZLE:
 * Neon Postgres is a serverless PostgreSQL service that scales to zero when idle
 * and has sub-second cold starts. Combined with Drizzle ORM's lightweight type-safe
 * query builder, this gives us a fast, scalable database layer with zero cold-start
 * overhead — perfect for Vercel serverless functions.
 *
 * The neon() HTTP driver is used instead of the WebSocket driver because:
 * 1. HTTP queries are fastest for single non-interactive transactions
 * 2. Serverless functions (Vercel) benefit from stateless HTTP connections
 * 3. No connection pooling needed — each request gets its own HTTP connection
 *
 * LAZY INITIALIZATION:
 * Same pattern as auth.ts and stripe.ts — the database client is created on first
 * use, not at import time. This prevents build-time crashes when DATABASE_URL
 * is not yet available (Vercel injects env vars at runtime, not build time).
 *
 * IMPORTED BY:
 * - src/lib/credits.ts (credit balance queries and updates)
 * - src/app/api/stripe/webhook/route.ts (subscription and user profile updates)
 * - src/app/api/stripe/checkout-session/route.ts (user profile lookups)
 * - src/app/api/dashboard/route.ts (dashboard data queries)
 * - Any server-side code that needs database access
 *
 * USAGE:
 *   import { db } from "@/db";
 *   const users = await db.select().from(userProfiles).where(...);
 *
 *   // Or import getDb() for explicit initialization:
 *   import { getDb } from "@/db";
 *   const db = getDb();
 */
import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as usersSchema from "./schema/users";
import * as subscriptionsSchema from "./schema/subscriptions";
import * as creditTransactionsSchema from "./schema/credit-transactions";

/**
 * Combined schema object — passed to drizzle() so relational queries work.
 * When you add new schema files, import them here and spread into allSchema.
 */
const allSchema = {
  ...usersSchema,
  ...subscriptionsSchema,
  ...creditTransactionsSchema,
};

/**
 * Private singleton — holds the created Drizzle instance.
 * null until first access at runtime.
 */
let _db: NeonHttpDatabase<typeof allSchema> | null = null;

/**
 * Get or create the Drizzle database client singleton.
 *
 * Validates DATABASE_URL exists and throws a clear error if missing.
 * The error message tells the developer exactly what to do (create a Neon
 * project and set the connection string).
 *
 * @returns Configured Drizzle ORM instance with all schemas loaded
 * @throws Error if DATABASE_URL is not set
 */
export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "[db] DATABASE_URL environment variable is not set. " +
        "Create a Neon Postgres project at https://neon.tech and set the pooled connection string in .env.local or Vercel dashboard."
      );
    }
    const sql = neon(process.env.DATABASE_URL);
    _db = drizzle({ client: sql, schema: allSchema });
  }
  return _db;
}

/**
 * Default export for convenience — a Proxy that lazily initializes the DB.
 *
 * This lets you write `import { db } from "@/db"` and use `db.select()...`
 * without explicitly calling getDb(). The Proxy intercepts property access
 * and ensures the real DB instance is created first.
 *
 * Same lazy Proxy pattern used in auth.ts for the auth singleton.
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof allSchema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
