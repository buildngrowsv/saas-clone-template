/**
 * Subscriptions table — tracks Stripe subscription state for each user.
 *
 * WHY THIS TABLE:
 * While the user_profiles.plan field stores the *current* plan for quick lookups,
 * the subscriptions table stores the full Stripe subscription state including
 * status transitions, billing period, and the Stripe subscription ID for API calls.
 *
 * This gives us:
 * 1. Ability to handle subscription edge cases (past_due, trialing, paused)
 * 2. Current period end date for credit reset logic
 * 3. Stripe subscription ID for cancellation, upgrade, and customer portal calls
 * 4. Historical record of subscription changes (via updatedAt timestamps)
 *
 * SYNCED VIA WEBHOOKS:
 * This table is updated by the Stripe webhook handler in
 * src/app/api/stripe/webhook/route.ts on these events:
 * - customer.subscription.created → Insert new row
 * - customer.subscription.updated → Update status, plan, period end
 * - customer.subscription.deleted → Set status to "canceled"
 *
 * UNIQUE CONSTRAINT:
 * stripeSubscriptionId has a UNIQUE constraint so we can use upsert
 * (INSERT ... ON CONFLICT DO UPDATE) in the webhook handler. This handles
 * the case where Stripe sends both "created" and "updated" events for
 * the same subscription (which happens during initial setup).
 *
 * IMPORTED BY:
 * - src/db/index.ts (schema registration)
 * - src/app/api/stripe/webhook/route.ts (subscription state management)
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const subscriptions = pgTable("subscriptions", {
  /** Auto-generated UUID primary key */
  id: uuid("id").primaryKey().defaultRandom(),

  /** References user_profiles.userId — the user who owns this subscription */
  userId: text("user_id").notNull(),

  /**
   * Stripe subscription ID (sub_xxx).
   * Used for API calls to cancel, update, or retrieve the subscription.
   * UNIQUE so we can upsert on webhook events.
   */
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),

  /**
   * Plan slug — matches Stripe Price metadata: 'basic' | 'standard' | 'pro'.
   * This should match the plan slugs in src/config/product.ts SUBSCRIPTION_PLANS.
   */
  plan: text("plan").notNull(),

  /**
   * Stripe subscription status.
   * Common values: 'active', 'past_due', 'canceled', 'trialing', 'paused'.
   * The webhook handler syncs this directly from Stripe's subscription object.
   */
  status: text("status").notNull(),

  /**
   * When the current billing period ends.
   * Used for:
   * 1. Showing "access until X date" after cancellation
   * 2. Credit reset logic (if you reset credits on renewal)
   * 3. Subscription status display in the dashboard
   */
  currentPeriodEnd: timestamp("current_period_end").notNull(),

  /**
   * Product slug — identifies which clone this subscription belongs to.
   * Matches user_profiles.productSlug and credit_transactions.productSlug
   * for the shared fleet database. Enables per-product subscription lookups.
   */
  productSlug: text("product_slug").notNull().default("default"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  /**
   * Index for webhook lookups — "get all subscriptions for user X".
   * The webhook handler needs this when processing subscription events.
   */
  index("idx_subscriptions_user_id").on(table.userId),
]);
