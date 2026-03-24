/**
 * User profiles table — extends the auth user with app-specific fields.
 *
 * WHY A SEPARATE TABLE:
 * Better Auth automatically creates and manages its own `user` and `session` tables.
 * We keep our app-specific data (credits, plan, Stripe customer ID) in a separate
 * `user_profiles` table to avoid conflicts with Better Auth's auto-managed schema.
 * The `userId` column references Better Auth's user.id.
 *
 * This separation means:
 * 1. Better Auth can freely migrate its tables without breaking our app schema
 * 2. We can add/modify app fields without affecting auth behavior
 * 3. The join between auth user and app profile is a simple primary key lookup
 *
 * TABLE STRUCTURE:
 * - userId: Primary key, references Better Auth user.id
 * - email: Synced from auth on first login (for display and Stripe customer creation)
 * - credits: Current credit balance (integer, decremented on each billable action)
 * - plan: Active subscription plan slug ('free' | 'basic' | 'standard' | 'pro')
 * - stripeCustomerId: Created on first Stripe checkout, used to link payments to users
 *
 * INDEXES:
 * - stripeCustomerId: Stripe webhooks look up users by customer ID (e.g., on payment events)
 *
 * IMPORTED BY:
 * - src/db/index.ts (schema registration for Drizzle relational queries)
 * - src/lib/credits.ts (credit balance reads and updates)
 * - src/app/api/stripe/webhook/route.ts (plan and customer ID updates)
 * - src/app/api/stripe/checkout-session/route.ts (customer ID lookup/creation)
 * - src/app/api/dashboard/route.ts (credit balance and plan display)
 */
import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const userProfiles = pgTable("user_profiles", {
  /**
   * Primary key — matches the Better Auth user.id.
   * Set when the user profile is first created (typically on first checkout
   * or when credits are first allocated).
   */
  userId: text("user_id").primaryKey(),

  /**
   * Display email — synced from the auth user on first login or profile creation.
   * Used for Stripe customer creation and dashboard display.
   */
  email: text("email").notNull(),

  /**
   * Current credit balance — decremented on each billable action, incremented
   * on subscription renewal or pack purchase. Starts at 0 for new users.
   */
  credits: integer("credits").notNull().default(0),

  /**
   * Active subscription plan slug.
   * 'free' = no active subscription (default)
   * 'basic' | 'standard' | 'pro' = active Stripe subscription
   *
   * Updated by the Stripe webhook when subscription status changes.
   */
  plan: text("plan").notNull().default("free"),

  /**
   * Stripe customer ID (cus_xxx) — created on first checkout.
   * Stored so we don't create duplicate Stripe customers for the same user.
   * Webhooks use this to find the user for payment events.
   */
  stripeCustomerId: text("stripe_customer_id"),

  /** Record creation timestamp */
  createdAt: timestamp("created_at").defaultNow().notNull(),

  /** Last update timestamp — updated on credit changes, plan changes, etc. */
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  /**
   * Index for Stripe webhook lookups.
   * When a webhook fires (e.g., invoice.payment_succeeded), we look up the user
   * by their Stripe customer ID. Without this index, that's a full table scan.
   */
  index("idx_user_profiles_stripe_customer_id").on(table.stripeCustomerId),
]);
