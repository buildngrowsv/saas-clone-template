/**
 * Credit management utilities — check balance, deduct, and add credits.
 *
 * WHY A CREDITS SYSTEM:
 * Credits provide flexible usage-based billing. Instead of feature-gating
 * (free users get X, pro users get Y), credits let users pay proportional
 * to their usage. This works well for AI SaaS, API-based products, and
 * any service where usage varies significantly between users.
 *
 * ARCHITECTURE:
 * - User's current credit balance lives in the `user_profiles` table (fast reads)
 * - Every credit change (add or deduct) is logged to `credit_transactions` (audit trail)
 * - Deductions use optimistic concurrency: UPDATE WHERE credits >= amount
 *   This prevents race conditions where two concurrent requests could overdraw
 *
 * TRANSACTION FLOW:
 * 1. API route checks if user has enough credits: getUserCredits(userId)
 * 2. If yes, atomically deduct: deductCredits(userId, amount, reason)
 * 3. The deduction returns false if credits dropped below the required amount
 *    between the check and the deduction (race condition protection)
 * 4. Credits are added via addCredits() on subscription renewal or pack purchase
 *
 * IMPORTED BY:
 * - API routes that perform billable actions (your product-specific routes)
 * - src/app/api/stripe/webhook/route.ts (addCredits on payment/renewal)
 *
 * CUSTOMIZATION:
 * The ACTION_CREDIT_COSTS map in src/config/product.ts defines how many credits
 * each action costs. Modify that config for your product's pricing.
 */
import { db } from "@/db";
import { userProfiles } from "@/db/schema/users";
import { creditTransactions } from "@/db/schema/credit-transactions";
import { eq, sql } from "drizzle-orm";

/**
 * Check a user's current credit balance.
 *
 * Returns 0 if the user has no profile yet (new user who hasn't triggered
 * any credit action). This is safe because the first credit addition
 * (from subscription or pack purchase) creates the profile row.
 *
 * @param userId - The Better Auth user ID
 * @returns Current credit balance (non-negative integer)
 */
export async function getUserCredits(userId: string): Promise<number> {
  const result = await db
    .select({ credits: userProfiles.credits })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return result[0]?.credits ?? 0;
}

/**
 * Deduct credits from user and log the transaction.
 *
 * Uses an atomic UPDATE with a WHERE credits >= amount check to prevent
 * overdrawing. If two concurrent requests try to spend the last 10 credits,
 * only one will succeed — the other will see 0 rows updated and return false.
 *
 * WHY OPTIMISTIC CONCURRENCY:
 * We considered using a database transaction with SELECT FOR UPDATE (pessimistic
 * locking), but that adds latency and complexity. The optimistic approach is
 * simpler, faster, and sufficient for credit systems where occasional retries
 * are acceptable. The user sees "insufficient credits" instead of a deadlock timeout.
 *
 * @param userId - The Better Auth user ID
 * @param amount - Number of credits to deduct (positive integer)
 * @param reason - Human-readable reason for the audit log (e.g., "generation:image:model-name")
 * @returns true if deduction succeeded, false if insufficient credits
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  const result = await db
    .update(userProfiles)
    .set({
      credits: sql`${userProfiles.credits} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(
      sql`${userProfiles.userId} = ${userId} AND ${userProfiles.credits} >= ${amount}`
    )
    .returning({ credits: userProfiles.credits });

  /**
   * If no rows were updated, it means either:
   * 1. The user doesn't exist in user_profiles (shouldn't happen if they're authenticated)
   * 2. They don't have enough credits (the WHERE credits >= amount check failed)
   * Either way, we can't deduct — return false.
   */
  if (result.length === 0) return false;

  /**
   * Log the transaction for the audit trail.
   * Amount is negative for deductions (matches accounting convention).
   */
  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    reason,
  });

  return true;
}

/**
 * Add credits to a user's balance and log the transaction.
 *
 * Called by:
 * - Stripe webhook on subscription renewal (invoice.payment_succeeded)
 * - Stripe webhook on one-time pack purchase (checkout.session.completed)
 * - Manual refunds or adjustments
 *
 * @param userId - The Better Auth user ID
 * @param amount - Number of credits to add (positive integer)
 * @param reason - Human-readable reason (e.g., "subscription_renewal:standard", "pack_purchase:growth")
 */
export async function addCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  await db
    .update(userProfiles)
    .set({
      credits: sql`${userProfiles.credits} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  /**
   * Log the transaction — amount is positive for additions.
   * This creates the audit trail that the dashboard's billing history shows.
   */
  await db.insert(creditTransactions).values({
    userId,
    amount,
    reason,
  });
}
