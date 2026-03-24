/**
 * Credit transactions table — audit log of every credit change.
 *
 * WHY AN AUDIT LOG:
 * Every credit change (addition or deduction) is recorded here for:
 * 1. User-facing billing history (dashboard shows recent transactions)
 * 2. Debugging — when a user says "where did my credits go?", we can trace every change
 * 3. Refund processing — we can see exactly which actions consumed credits
 * 4. Analytics — understand usage patterns, popular features, revenue per feature
 *
 * CONVENTION:
 * - Positive `amount` = credits added (subscription renewal, pack purchase, refund)
 * - Negative `amount` = credits deducted (billable action)
 *
 * REASON FORMAT:
 * The `reason` field is a human-readable string with a consistent prefix format:
 * - "subscription_renewal:standard" — monthly credit allocation for Standard plan
 * - "pack_purchase:growth" — one-time Growth credit pack
 * - "action:basic-action" — credits spent on a basic action
 * - "refund:manual:reason" — manual credit refund
 *
 * This format allows both human readability and programmatic parsing for analytics.
 *
 * IMPORTED BY:
 * - src/db/index.ts (schema registration)
 * - src/lib/credits.ts (insert transaction records on add/deduct)
 */
import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const creditTransactions = pgTable("credit_transactions", {
  /** Auto-generated UUID primary key */
  id: uuid("id").primaryKey().defaultRandom(),

  /** References user_profiles.userId */
  userId: text("user_id").notNull(),

  /**
   * Credit amount — positive for additions, negative for deductions.
   * This follows standard accounting convention for ledger entries.
   */
  amount: integer("amount").notNull(),

  /**
   * Human-readable reason for the transaction.
   * See module-level docstring for format conventions.
   */
  reason: text("reason").notNull(),

  /** When the transaction occurred */
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  /**
   * Index for user transaction history (dashboard billing page).
   * Queries filter by userId to show a specific user's transactions.
   */
  index("idx_credit_transactions_user_id").on(table.userId),

  /**
   * Index for sorting by date — dashboard shows most recent transactions first.
   * Also useful for time-range analytics queries.
   */
  index("idx_credit_transactions_created_at").on(table.createdAt),
]);
