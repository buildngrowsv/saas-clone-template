/**
 * Drizzle Kit configuration — manages database schema migrations against Neon Postgres.
 *
 * WHY DRIZZLE:
 * Drizzle ORM was chosen for this template because it's type-safe, lightweight,
 * and works perfectly with Neon's serverless HTTP driver. Unlike heavier ORMs
 * (Prisma), Drizzle doesn't require a binary engine and has zero cold-start overhead,
 * which matters for serverless deployments on Vercel.
 *
 * COMMANDS:
 *   npm run db:push     — Push schema changes directly to DB (fast iteration in dev)
 *   npm run db:generate — Generate SQL migration files (for production deploys)
 *   npm run db:migrate  — Run pending migration files against the DB
 *
 * IMPORTANT:
 * The DATABASE_URL env var must point to your Neon pooled connection string.
 * Get this from the Neon dashboard after creating a project.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  /**
   * Schema glob — Drizzle Kit scans all .ts files in src/db/schema/ to find table definitions.
   * Each schema file exports one table (one-table-per-file convention for clarity).
   */
  schema: "./src/db/schema/*",

  /** Output directory for generated SQL migration files */
  out: "./drizzle",

  /** Database dialect — we use PostgreSQL via Neon */
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
