/**
 * Credit System — Usage Tracking and Rate Limiting
 * 
 * WHY THIS EXISTS:
 * Every AI tool SaaS needs usage limits to control costs. Each fal.ai API call
 * costs us money (GPU inference), so we need to ensure:
 *   - Free users get a taste (3/day) but can't bankrupt us
 *   - Basic users get reasonable usage (50/month) for their $4.99
 *   - Pro users get unlimited (we eat the cost, but they're paying $9.99/mo)
 * 
 * ARCHITECTURE DECISION — In-Memory vs Database:
 * This template uses in-memory storage (a Map) for credit tracking. This is
 * intentional for the template — it means you can run the template with ZERO
 * infrastructure (no database needed) to test the flow.
 * 
 * FOR PRODUCTION: Replace the in-memory Map with a database table. The interface
 * is designed to make this swap trivial — just change the implementation of
 * getUserCreditRecord() and deductOneCredit() to use Drizzle ORM queries instead
 * of Map operations. The rest of the code doesn't change.
 * 
 * WHY NOT USE STRIPE USAGE-BASED BILLING:
 * Stripe supports metered billing, but it adds complexity (usage records, billing
 * thresholds, etc.) and doesn't give us real-time credit checking. Our approach
 * is simpler: fixed subscription tiers with local credit counters. This matches
 * the UX pattern users expect from tools like Remove.bg, Canva, etc.
 */

import { PRODUCT_CONFIG, type ProductPricingTier } from "@/lib/config";

/**
 * Subscription tier names — must match the keys in PRODUCT_CONFIG.pricing.
 * "none" means the user has never subscribed (treated same as "free").
 */
export type SubscriptionTier = "free" | "basic" | "pro" | "none";

/**
 * CreditRecord tracks a single user's usage within their current billing period.
 * 
 * WHY we track the period start:
 * Free tier resets daily, paid tiers reset monthly. We store when the current
 * period started so we can check if credits should be refreshed. This avoids
 * needing a cron job to reset credits — we just check lazily on each request.
 */
interface CreditRecord {
  readonly usageCount: number;
  readonly periodStartTimestamp: number;
  readonly subscriptionTier: SubscriptionTier;
}

/**
 * In-memory credit store.
 * 
 * WARNING: This resets when the server restarts. Fine for development and
 * testing the template, but MUST be replaced with a database for production.
 * See the TODO comments in getUserCreditRecord() and deductOneCredit().
 * 
 * Key = user ID (from NextAuth session), Value = their credit record.
 */
const inMemoryCreditStore = new Map<string, CreditRecord>();

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
 * Checks whether a credit record's period has expired and needs reset.
 * 
 * WHY: Instead of running a cron job to reset all users' credits at midnight
 * (or on billing anniversary), we check lazily when the user makes a request.
 * This is simpler, has no infrastructure cost, and handles edge cases like
 * server restarts gracefully.
 */
function hasPeriodExpired(
  creditRecord: CreditRecord,
  pricingTier: ProductPricingTier
): boolean {
  const currentTimestamp = Date.now();
  const elapsedMilliseconds =
    currentTimestamp - creditRecord.periodStartTimestamp;

  if (pricingTier.period === "day") {
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
    return elapsedMilliseconds >= oneDayInMilliseconds;
  }

  /**
   * For monthly periods, we use 30 days as an approximation.
   * In production with Stripe, the actual reset would align with the
   * subscription billing cycle date from Stripe's webhook events.
   */
  const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;
  return elapsedMilliseconds >= thirtyDaysInMilliseconds;
}

/**
 * Retrieves or initializes a user's credit record.
 * 
 * TODO (PRODUCTION): Replace this with a database query:
 *   const record = await db.query.creditRecords.findFirst({
 *     where: eq(creditRecords.userId, userId)
 *   });
 */
function getUserCreditRecord(
  userId: string,
  subscriptionTier: SubscriptionTier
): CreditRecord {
  const existingRecord = inMemoryCreditStore.get(userId);

  if (!existingRecord) {
    const freshRecord: CreditRecord = {
      usageCount: 0,
      periodStartTimestamp: Date.now(),
      subscriptionTier,
    };
    inMemoryCreditStore.set(userId, freshRecord);
    return freshRecord;
  }

  /**
   * If the user's subscription tier changed (e.g., they upgraded from free to basic),
   * update the record to reflect the new tier. This ensures upgraded users
   * immediately get their new credit limit without waiting for period reset.
   */
  if (existingRecord.subscriptionTier !== subscriptionTier) {
    const upgradedRecord: CreditRecord = {
      usageCount: 0,
      periodStartTimestamp: Date.now(),
      subscriptionTier,
    };
    inMemoryCreditStore.set(userId, upgradedRecord);
    return upgradedRecord;
  }

  /**
   * Check if the current period has expired. If so, reset the usage count
   * and start a new period. This is the "lazy reset" pattern.
   */
  const pricingTier = getPricingTierForSubscription(subscriptionTier);
  if (hasPeriodExpired(existingRecord, pricingTier)) {
    const resetRecord: CreditRecord = {
      usageCount: 0,
      periodStartTimestamp: Date.now(),
      subscriptionTier,
    };
    inMemoryCreditStore.set(userId, resetRecord);
    return resetRecord;
  }

  return existingRecord;
}

/**
 * Checks whether a user has credits remaining for a generation.
 * 
 * Returns an object with:
 *   - hasCredits: boolean — can this user make a generation right now?
 *   - remainingCredits: number — how many credits left (-1 for unlimited)
 *   - tierLimit: number — total credits for this tier per period
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

export function checkUserCreditAvailability(
  userId: string,
  subscriptionTier: SubscriptionTier
): CreditCheckResult {
  const pricingTier = getPricingTierForSubscription(subscriptionTier);
  const creditRecord = getUserCreditRecord(userId, subscriptionTier);

  /**
   * -1 limit means unlimited. Pro users should never be blocked.
   * We still track their usage for analytics purposes, but we always
   * return hasCreditsRemaining: true.
   */
  if (pricingTier.limit === -1) {
    return {
      hasCreditsRemaining: true,
      remainingCreditsCount: -1,
      tierCreditLimit: -1,
      currentUsageCount: creditRecord.usageCount,
    };
  }

  const remainingCredits = pricingTier.limit - creditRecord.usageCount;

  return {
    hasCreditsRemaining: remainingCredits > 0,
    remainingCreditsCount: Math.max(0, remainingCredits),
    tierCreditLimit: pricingTier.limit,
    currentUsageCount: creditRecord.usageCount,
  };
}

/**
 * Deducts one credit from the user's balance after a successful generation.
 * 
 * IMPORTANT: Call this AFTER the fal.ai API call succeeds, not before.
 * We don't want to deduct credits for failed generations — that would be
 * a terrible user experience and would generate support tickets.
 * 
 * TODO (PRODUCTION): Replace with a database update:
 *   await db.update(creditRecords)
 *     .set({ usageCount: sql`usage_count + 1` })
 *     .where(eq(creditRecords.userId, userId));
 */
export function deductOneCreditForUser(
  userId: string,
  subscriptionTier: SubscriptionTier
): void {
  const currentRecord = getUserCreditRecord(userId, subscriptionTier);

  const updatedRecord: CreditRecord = {
    ...currentRecord,
    usageCount: currentRecord.usageCount + 1,
  };

  inMemoryCreditStore.set(userId, updatedRecord);
}
