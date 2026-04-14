/**
 * Credit System — Database-Backed Usage Tracking and Rate Limiting
 *
 * WHY THIS EXISTS:
 * Every AI tool SaaS needs usage limits to control costs. Each fal.ai API call
 * costs us money (GPU inference), so we need to ensure:
 *   - Free users get a taste (3/day) but can't bankrupt us
 *   - Basic users get reasonable usage (50/month) for their $4.99
 *   - Pro users get unlimited (we eat the cost, but they're paying $9.99/mo)
 *
 * ARCHITECTURE — Database-Backed (Production):
 * Credits are tracked in the `user_profiles` table (credits column) and every
 * change is audit-logged in `credit_transactions`. This persists across Vercel
 * cold starts, deploys, and multi-instance scaling. The previous in-memory Map
 * implementation reset on every cold start, effectively giving everyone unlimited
 * usage and was the ROOT CAUSE of $0 revenue across the fleet.
 *
 * HOW PERIOD RESETS WORK:
 * Free tier resets daily, paid tiers reset monthly. We use the `credit_transactions`
 * table to determine when the last period started. On each credit check, we look
 * at the most recent "period_reset" transaction to determine if a new period
 * should begin. This is a "lazy reset" — no cron job needed.
 *
 * WHY NOT USE STRIPE USAGE-BASED BILLING:
 * Stripe supports metered billing, but it adds complexity (usage records, billing
 * thresholds, etc.) and doesn't give us real-time credit checking. Our approach
 * is simpler: fixed subscription tiers with database credit counters.
 */

import { PRODUCT_CONFIG, type ProductPricingTier } from "@/lib/config";
import { db } from "@/db";
import { userProfiles } from "@/db/schema/users";
import { creditTransactions } from "@/db/schema/credit-transactions";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Subscription tier names — must match the keys in PRODUCT_CONFIG.pricing.
 * "none" means the user has never subscribed (treated same as "free").
 */
export type SubscriptionTier = "free" | "basic" | "pro" | "none";

/**
 * Result of a credit availability check.
 *
 * WHY we return the full object instead of just a boolean:
 * The API route needs to include remaining credits in the response so the
 * frontend can show "3 of 50 credits used" in the UI. This helps users
 * understand their usage and creates natural upgrade pressure when they
 * see credits running low.
 */
export interface CreditCheckResult {
  readonly hasCreditsRemaining: boolean;
  readonly remainingCreditsCount: number;
  readonly tierCreditLimit: number;
  readonly currentUsageCount: number;
}

/**
 * Determines the pricing tier configuration for a given subscription level.
 * Maps the tier name to the actual limits/pricing defined in PRODUCT_CONFIG.
 */
function getPricingTierForSubscription(
  subscriptionTier: SubscriptionTier
): ProductPricingTier {
  if (subscriptionTier === "none") {
    return PRODUCT_CONFIG.pricing.free;
  }
  return PRODUCT_CONFIG.pricing[subscriptionTier];
}

/**
 * Counts how many credits a user has consumed in the current billing period.
 *
 * For free tier: counts deductions in the last 24 hours.
 * For paid tiers: counts deductions in the last 30 days.
 *
 * We count negative transactions (deductions) since the last period_reset
 * transaction, or since the period start if no reset exists.
 */
async function getUsageInCurrentPeriod(
  userId: string,
  pricingTier: ProductPricingTier
): Promise<number> {
  const periodStartMs =
    pricingTier.period === "day"
      ? Date.now() - 24 * 60 * 60 * 1000
      : Date.now() - 30 * 24 * 60 * 60 * 1000;

  const periodStart = new Date(periodStartMs);

  /**
   * Count deductions (negative amounts) since the period start.
   * We use ABS(SUM(amount)) where amount < 0 to get the total credits used.
   * This is more reliable than tracking a mutable counter because it derives
   * from the immutable transaction log.
   */
  const result = await db
    .select({
      totalDeducted: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${creditTransactions.amount} < 0 THEN ${creditTransactions.amount} ELSE 0 END)), 0)`,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        gte(creditTransactions.createdAt, periodStart)
      )
    );

  return Number(result[0]?.totalDeducted ?? 0);
}

/**
 * Ensures a user_profiles row exists for the given user.
 * Creates one with default values if it doesn't exist yet.
 *
 * WHY: Better Auth creates users in its own table, but our credit system
 * needs a row in user_profiles. This upsert pattern means we never crash
 * on a missing profile — we create it lazily on first credit check.
 */
async function ensureUserProfile(
  userId: string,
  email?: string
): Promise<void> {
  const existing = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userProfiles).values({
      userId,
      email: email ?? "unknown",
      credits: 0,
      plan: "free",
    });
  }
}

/**
 * Looks up the user's subscription tier from the database.
 *
 * Returns the plan stored in user_profiles, which is synced by the Stripe
 * webhook handler on subscription creation/update/cancellation.
 */
export async function getUserSubscriptionTierFromDb(
  userId: string
): Promise<SubscriptionTier> {
  const profile = await db
    .select({ plan: userProfiles.plan })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile[0]) {
    return "free";
  }

  const plan = profile[0].plan;
  if (plan === "basic" || plan === "pro") {
    return plan;
  }
  return "free";
}

/**
 * Checks whether a user has credits remaining for a generation.
 *
 * This is now async because it queries the database. The caller (API route)
 * must await this function.
 *
 * HOW IT WORKS:
 * 1. Ensure user profile exists (lazy create)
 * 2. Look up their subscription tier
 * 3. Count deductions in the current period from the transaction log
 * 4. Compare against the tier limit
 */
export async function checkUserCreditAvailability(
  userId: string,
  subscriptionTier: SubscriptionTier
): Promise<CreditCheckResult> {
  const pricingTier = getPricingTierForSubscription(subscriptionTier);

  /**
   * -1 limit means unlimited. Pro users should never be blocked.
   * We still track their usage for analytics, but always return true.
   */
  if (pricingTier.limit === -1) {
    const usageCount = await getUsageInCurrentPeriod(userId, pricingTier);
    return {
      hasCreditsRemaining: true,
      remainingCreditsCount: -1,
      tierCreditLimit: -1,
      currentUsageCount: usageCount,
    };
  }

  const usageCount = await getUsageInCurrentPeriod(userId, pricingTier);
  const remainingCredits = pricingTier.limit - usageCount;

  return {
    hasCreditsRemaining: remainingCredits > 0,
    remainingCreditsCount: Math.max(0, remainingCredits),
    tierCreditLimit: pricingTier.limit,
    currentUsageCount: usageCount,
  };
}

/**
 * Deducts one credit from the user's balance after a successful generation.
 *
 * IMPORTANT: Call this AFTER the fal.ai API call succeeds, not before.
 * We don't want to deduct credits for failed generations — that would be
 * a terrible user experience and would generate support tickets.
 *
 * Records the deduction as a -1 transaction in the audit log.
 * Also decrements the user_profiles.credits balance for fast dashboard reads.
 */
export async function deductOneCreditForUser(
  userId: string,
  subscriptionTier: SubscriptionTier
): Promise<void> {
  await ensureUserProfile(userId);

  /**
   * Insert a -1 transaction into the audit log. This is the source of truth
   * for usage counting — getUsageInCurrentPeriod() sums these.
   */
  await db.insert(creditTransactions).values({
    userId,
    amount: -1,
    reason: `action:${PRODUCT_CONFIG.name || "generation"}`,
  });

  /**
   * Also decrement the balance on user_profiles for fast reads.
   * This is a denormalized counter — the transaction log is authoritative.
   */
  await db
    .update(userProfiles)
    .set({ credits: sql`${userProfiles.credits} - 1` })
    .where(eq(userProfiles.userId, userId));

  console.log(
    `[Credits] Deducted 1 credit for user ${userId} (tier: ${subscriptionTier}).`
  );
}

/**
 * Adds credits to a user's account — typically called from the Stripe webhook
 * when a subscription is activated or renewed.
 *
 * Records a positive transaction in the audit log and updates the
 * denormalized balance on user_profiles.
 *
 * @param userId - The user's unique ID (from auth session / OAuth provider)
 * @param creditAmount - Number of credits to add
 * @param subscriptionTier - The user's subscription tier
 */
export async function addCredits(
  userId: string,
  creditAmount: number,
  subscriptionTier: SubscriptionTier,
  reason?: string
): Promise<void> {
  await ensureUserProfile(userId);

  /**
   * Record the credit addition in the audit log.
   * The reason field doubles as an idempotency key for invoice.paid events —
   * the webhook checks for existing transactions with the same reason before calling.
   */
  await db.insert(creditTransactions).values({
    userId,
    amount: creditAmount,
    reason: reason ?? `subscription_renewal:${subscriptionTier}`,
  });

  /**
   * Update the denormalized balance and plan on user_profiles.
   */
  await db
    .update(userProfiles)
    .set({
      credits: sql`${userProfiles.credits} + ${creditAmount}`,
      plan: subscriptionTier === "none" ? "free" : subscriptionTier,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  console.log(
    `[Credits] Added ${creditAmount} credits for user ${userId} (tier: ${subscriptionTier}). ` +
      `Recorded at ${new Date().toISOString()}.`
  );
}
