/**
 * =============================================================================
 * src/lib/subscription-store.ts — Pro Subscription Token Store + Stripe Fallback
 * =============================================================================
 *
 * PURPOSE:
 * Provides two complementary Pro subscription verification mechanisms:
 *
 *   1. **Upstash Redis token store** — Durable per-token Pro status backed by
 *      serverless Redis. Used by clones that rely on token-based (no user DB)
 *      subscription gating.
 *
 *   2. **Stripe API fallback (isProActiveFromStripe)** — Direct Stripe checkout
 *      session query that verifies payment WITHOUT Redis. This is the critical
 *      fallback that lets DD clones verify Pro even when Upstash is not provisioned.
 *
 * WHY BOTH EXIST:
 * Many clones in the fleet launch without Upstash Redis provisioned. Without the
 * Stripe API fallback, paying customers would be stuck on free tier despite having
 * a successful Stripe charge. The fallback queries Stripe's own records as the
 * durable source of truth.
 *
 * TOKEN LIFECYCLE (Redis path):
 *   pending  → checkout session created but not paid yet (1h TTL)
 *   active   → payment confirmed via Stripe webhook (13-month TTL)
 *   cancelled → subscription cancelled (kept 30 days for clear error messaging)
 *
 * NAMESPACE ISOLATION:
 * Keys are prefixed with "template:sub:token:" by default. Each clone MUST
 * customize this prefix to avoid key collisions if sharing an Upstash database.
 * Use the product slug or a short unique identifier (e.g. "manga:", "logo:", etc.).
 *
 * GRACEFUL DEGRADATION:
 * If UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are not configured,
 * all Redis calls fail conservatively (no Pro access granted). The Stripe API
 * fallback (isProActiveFromStripe) works independently of Redis.
 *
 * REQUIRED ENV VARS:
 *   UPSTASH_REDIS_REST_URL    — for Redis path (optional)
 *   UPSTASH_REDIS_REST_TOKEN  — for Redis path (optional)
 *   STRIPE_SECRET_KEY         — for Stripe API fallback (required for paid features)
 *
 * CALLED BY:
 *   - /api/stripe/checkout (or /api/stripe/create-checkout) → createPendingToken
 *   - /api/stripe/webhook → activateToken, cancelToken, storeSubscriptionTokenMapping
 *   - /api/generate (or product-specific route) → isProActive, isProActiveFromStripe
 */

import { Redis } from "@upstash/redis";

// -------------------------------------------------------------------------
// Redis client — lazy singleton, fails gracefully if env vars are missing
// -------------------------------------------------------------------------

let _redisClient: Redis | null = null;
let _redisInitAttempted = false;

/**
 * getRedisClient — returns a shared Redis instance, or null if not configured.
 *
 * Uses lazy initialization so the build does not fail when UPSTASH env vars are
 * absent (e.g. local dev, new clone before Vercel env vars are configured).
 * The null check at each call site ensures operations skip gracefully.
 */
function getRedisClient(): Redis | null {
  if (_redisInitAttempted) {
    return _redisClient;
  }

  _redisInitAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[subscription-store] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. " +
        "Pro subscription persistence is DISABLED. Set these Vercel env vars to enable."
    );
    return null;
  }

  try {
    _redisClient = new Redis({ url, token });
    return _redisClient;
  } catch (err) {
    console.error("[subscription-store] Failed to initialize Redis client:", err);
    return null;
  }
}

// -------------------------------------------------------------------------
// Token key helpers — CUSTOMIZE THE PREFIX FOR EACH CLONE
// -------------------------------------------------------------------------

/**
 * KEY_PREFIX — Namespace prefix for Redis keys. Each clone MUST customize
 * this to avoid key collisions when sharing one Upstash database across the fleet.
 *
 * Examples: "manga:sub:token:", "logo:sub:token:", "bgremover:sub:token:"
 */
const KEY_PREFIX = "template:sub:token:";
const SUBID_PREFIX = "template:sub:subid:";

function subTokenKey(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

function subIdToTokenKey(stripeSubscriptionId: string): string {
  return `${SUBID_PREFIX}${stripeSubscriptionId}`;
}

// -------------------------------------------------------------------------
// TTLs
// -------------------------------------------------------------------------

/** Pending checkout session expires after 1 hour — abandoned checkouts should not linger */
const PENDING_TTL_SECONDS = 60 * 60;

/**
 * Active Pro subscription is valid for 13 months.
 * Covers a full annual billing cycle plus a one-month buffer.
 */
const ACTIVE_TTL_SECONDS = 13 * 30 * 24 * 60 * 60;

// -------------------------------------------------------------------------
// Public API — Redis token lifecycle
// -------------------------------------------------------------------------

export type SubscriptionStatus = "pending" | "active" | "cancelled";

/**
 * createPendingToken — called by /api/stripe/checkout when creating a Stripe session.
 *
 * Generates a UUID, stores it as "pending" in Redis with a 1h TTL. The token is
 * passed to Stripe as client_reference_id so the webhook can activate it.
 * Returns the token string even if Redis is unavailable (checkout flow continues).
 */
export async function createPendingToken(): Promise<string> {
  const token = crypto.randomUUID();

  const redis = getRedisClient();
  if (!redis) {
    console.warn(
      "[subscription-store] createPendingToken: Redis unavailable — token not stored.",
      { token }
    );
    return token;
  }

  try {
    await redis.setex(subTokenKey(token), PENDING_TTL_SECONDS, "pending");
  } catch (err) {
    console.error("[subscription-store] createPendingToken: Redis write failed:", err);
  }

  return token;
}

/**
 * activateToken — called by webhook on checkout.session.completed.
 *
 * Upgrades the token from "pending" to "active" with a 13-month TTL.
 * Returns true on success, false if Redis is unavailable or write fails.
 */
export async function activateToken(token: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn(
      "[subscription-store] activateToken: Redis unavailable — cannot persist Pro status.",
      { token }
    );
    return false;
  }

  try {
    await redis.setex(subTokenKey(token), ACTIVE_TTL_SECONDS, "active");
    console.log("[subscription-store] activateToken: token activated in Redis", { token });
    return true;
  } catch (err) {
    console.error("[subscription-store] activateToken: Redis write failed:", err);
    return false;
  }
}

/**
 * cancelToken — called on customer.subscription.deleted.
 *
 * Marks the token as cancelled with a 30-day TTL so clients get a clear
 * cancellation message rather than "invalid token."
 */
export async function cancelToken(token: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.setex(subTokenKey(token), 30 * 24 * 60 * 60, "cancelled");
  } catch (err) {
    console.error("[subscription-store] cancelToken: Redis write failed:", err);
  }
}

/**
 * storeSubscriptionTokenMapping — saves stripeSubscriptionId → token in Redis.
 *
 * Called by the webhook's checkout.session.completed handler AFTER activateToken().
 * This lets customer.subscription.deleted find the token to cancel.
 */
export async function storeSubscriptionTokenMapping(
  stripeSubscriptionId: string,
  token: string
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.setex(subIdToTokenKey(stripeSubscriptionId), ACTIVE_TTL_SECONDS, token);
  } catch (err) {
    console.error("[subscription-store] storeSubscriptionTokenMapping: Redis write failed:", err);
  }
}

/**
 * getTokenForSubscription — retrieves the token for a stripeSubscriptionId.
 *
 * Called by the webhook's customer.subscription.deleted handler.
 */
export async function getTokenForSubscription(
  stripeSubscriptionId: string
): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const token = await redis.get<string>(subIdToTokenKey(stripeSubscriptionId));
    return token ?? null;
  } catch (err) {
    console.error("[subscription-store] getTokenForSubscription: Redis read failed:", err);
    return null;
  }
}

/**
 * checkTokenStatus — returns the current status of a subscription token from Redis.
 *
 * Returns SubscriptionStatus or null if not found.
 */
export async function checkTokenStatus(
  token: string
): Promise<SubscriptionStatus | null> {
  if (!token || typeof token !== "string" || token.length < 10) {
    return null;
  }

  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const status = await redis.get<string>(subTokenKey(token));
    if (!status) return null;

    if (status === "active" || status === "pending" || status === "cancelled") {
      return status as SubscriptionStatus;
    }

    return null;
  } catch (err) {
    console.error("[subscription-store] checkTokenStatus: Redis read failed:", err);
    return null;
  }
}

/**
 * isProActive — returns true only when the token is "active" in Redis.
 *
 * Used by generate routes to decide whether to bypass the IP rate limit.
 * Any error or missing token returns false (free tier applies).
 */
export async function isProActive(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const status = await checkTokenStatus(token);
  return status === "active";
}

// -------------------------------------------------------------------------
// Stripe API fallback for Pro verification (no Redis required)
// -------------------------------------------------------------------------

/**
 * _stripeFallbackCache — short-lived in-memory cache for Stripe API lookups.
 *
 * WHY IN-MEMORY IS ACCEPTABLE HERE (but NOT for the primary store):
 * This cache is a performance optimization on top of the Stripe API, which IS
 * the durable source of truth. Unlike the banned credits Map() anti-pattern
 * (see clone-factory-quality-gates Gate 8), this cache only avoids redundant
 * Stripe API calls within a 5-minute window. If the cache resets on cold start,
 * the next request simply hits Stripe again — no data is lost.
 */
const _stripeFallbackCache = new Map<string, { isPro: boolean; cachedAt: number }>();
const STRIPE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * isProActiveFromStripe — queries the Stripe Checkout Sessions API to verify
 * whether a token (used as client_reference_id) has a paid session.
 *
 * WHY THIS EXISTS:
 * When Upstash Redis is not provisioned (which is the case for many clones in
 * the fleet), isProActive() always returns false because there is no Redis to
 * read from. Paying customers are stuck on free tier even though Stripe
 * successfully charged them. This function provides a direct Stripe API fallback
 * so Pro verification works WITHOUT Redis.
 *
 * HOW IT WORKS:
 * 1. Queries Stripe for checkout sessions with this client_reference_id
 * 2. Checks if any returned session has payment_status === "paid"
 * 3. For subscriptions, verifies the subscription is still active/trialing
 * 4. Caches the result for 5 minutes to avoid hammering Stripe on every request
 * 5. Returns false on ANY error (fail-closed — never grant Pro on uncertainty)
 *
 * CALLED BY: /api/generate (or product-specific route) as fallback when
 * isProActive() returns false.
 *
 * DEPENDS ON: STRIPE_SECRET_KEY env var
 *
 * SECURITY:
 * - Token validation: rejects null, non-string, and short tokens
 * - Stripe key trimming: strips trailing newlines from echo-piped env vars
 * - Fail-closed: any error → false → user stays on free tier (safe default)
 * - Cache is per-token, so one user's lookup never leaks to another
 */
export async function isProActiveFromStripe(
  token: string | null | undefined
): Promise<boolean> {
  // Input validation — same guards as checkTokenStatus
  if (!token || typeof token !== "string" || token.length < 10) return false;

  // Check in-memory cache first to avoid redundant Stripe API calls
  const cached = _stripeFallbackCache.get(token);
  if (cached && Date.now() - cached.cachedAt < STRIPE_CACHE_TTL_MS) {
    return cached.isPro;
  }

  // Trim the Stripe secret key — Vercel env vars set via `echo` may have trailing \n
  // which causes 401 auth failures. This is a known fleet-wide issue.
  const stripeKey = process.env.STRIPE_SECRET_KEY?.replace(
    /[\s\n\r\\n]+$/g,
    ""
  ).trim();
  if (!stripeKey) {
    // No Stripe key configured — cannot verify. Fail closed.
    return false;
  }

  try {
    // Query Stripe Checkout Sessions API by client_reference_id.
    // When we created the checkout session, we set client_reference_id = token.
    // Stripe indexes this field and returns matching sessions.
    const url = new URL("https://api.stripe.com/v1/checkout/sessions");
    url.searchParams.set("client_reference_id", token);
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${stripeKey}` },
    });

    if (!response.ok) {
      console.warn(
        `[subscription-store] isProActiveFromStripe: Stripe API returned ${response.status} for token ${token.slice(0, 8)}…`
      );
      _stripeFallbackCache.set(token, { isPro: false, cachedAt: Date.now() });
      return false;
    }

    const data = (await response.json()) as {
      data: Array<{ payment_status: string; subscription?: string | null }>;
    };

    // Find a paid checkout session
    const paidSession = data.data.find(
      (s: { payment_status: string }) => s.payment_status === "paid"
    );

    if (!paidSession) {
      _stripeFallbackCache.set(token, { isPro: false, cachedAt: Date.now() });
      return false;
    }

    // Subscription cancellation check: a cancelled subscription's checkout
    // session still shows payment_status "paid" because the original payment
    // succeeded. Verify the subscription is still active before granting Pro.
    // One-time payments (no subscription field) are permanently valid.
    if (paidSession.subscription) {
      const subResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions/${paidSession.subscription}`,
        { method: "GET", headers: { Authorization: `Bearer ${stripeKey}` } }
      );

      if (subResponse.ok) {
        const subData = (await subResponse.json()) as { status: string };
        const isActive =
          subData.status === "active" || subData.status === "trialing";
        if (!isActive) {
          console.log(
            `[subscription-store] isProActiveFromStripe: subscription ${paidSession.subscription} status="${subData.status}" — NOT Pro for token ${token.slice(0, 8)}…`
          );
          _stripeFallbackCache.set(token, {
            isPro: false,
            cachedAt: Date.now(),
          });
          return false;
        }
      } else {
        console.warn(
          `[subscription-store] isProActiveFromStripe: subscription check returned ${subResponse.status} — denying Pro for token ${token.slice(0, 8)}…`
        );
        _stripeFallbackCache.set(token, {
          isPro: false,
          cachedAt: Date.now(),
        });
        return false;
      }
    }

    // Paid + subscription active (or one-time payment)
    _stripeFallbackCache.set(token, { isPro: true, cachedAt: Date.now() });
    console.log(
      `[subscription-store] isProActiveFromStripe: CONFIRMED Pro via Stripe API for token ${token.slice(0, 8)}…`
    );
    return true;
  } catch (err) {
    // Network error, JSON parse error, etc. — fail closed
    console.error(
      "[subscription-store] isProActiveFromStripe: error querying Stripe:",
      err instanceof Error ? err.message : err
    );
    _stripeFallbackCache.set(token, { isPro: false, cachedAt: Date.now() });
    return false;
  }
}
