/**
 * Segmented Paywall Configuration — Traffic-Source-Aware Conversion Optimization
 *
 * WHY THIS FILE EXISTS:
 * All 40+ clones in the portfolio currently show the same paywall to every user.
 * This is leaving money on the table because different traffic sources have
 * different intent levels and cost profiles:
 *
 *   - PAID TRAFFIC (Google Ads, utm_medium=cpc): These users cost $2-15 per click.
 *     They searched with intent and clicked an ad. They should see a TIGHT paywall
 *     (1 free generation, then hard paywall) because: a) they're high-intent and
 *     likely to convert, b) every free generation is a wasted ad dollar, c) the
 *     paywall itself is the conversion event.
 *
 *   - ORGANIC SEARCH: These users found us via SEO. They're evaluating the tool
 *     and comparing alternatives. They should get MORE free usage to build habit
 *     and see value before we ask for money. The cost of acquisition is near-zero,
 *     so generous free usage is ROI-positive.
 *
 *   - PRODUCT HUNT / SOCIAL: Launch traffic is high-volume, low-intent. Many are
 *     just browsing. Give them enough free usage to form an opinion, then soft-sell.
 *
 *   - DIRECT / RETURNING: These are people who bookmarked us or typed the URL.
 *     They already know us. Default behavior: generous free tier, soft upsell.
 *
 * HOW TO CUSTOMIZE PER CLONE:
 * 1. Import DEFAULT_PAYWALL_CONFIG and override specific segments
 * 2. Or create a completely custom PaywallConfig in the clone's config.ts
 * 3. The useUsageTracking() hook reads this config and applies segment matching
 *
 * ARCHITECTURE:
 * Configuration is a plain object (not fetched from a DB) because:
 * - It changes per-product, not per-user or per-request
 * - It needs to be available at build time for static rendering
 * - Keeping it in code means it's version-controlled and auditable
 * - Clone-specific overrides are just import + spread
 *
 * IMPORTED BY:
 * - src/hooks/useUsageTracking.ts (reads config for segment matching + limits)
 * - src/lib/config.ts (optional: clones can re-export a customized version)
 *
 * DEPENDS ON:
 * - src/lib/utm-capture.ts (UtmParameters type for segment matching)
 */

import type { UtmParameters } from "@/lib/utm-capture";

/* ─── Types ──────────────────────────────────────────────────────────── */

/**
 * PaywallBehavior defines how the paywall behaves for a specific user segment.
 *
 * These values control the client-side UX flow:
 *   1. User generates content freely up to `freeGenerations` times
 *   2. After `showPricingAfter` uses, a pricing modal/banner appears (soft nudge)
 *   3. After `freeGenerations` uses:
 *      - If `hardPaywall` is true: block generation entirely, require payment
 *      - If `hardPaywall` is false: show soft upsell but allow continued use
 *         (useful for organic users where we want engagement over immediate revenue)
 *   4. If `discountCode` is set, the pricing modal pre-applies that code
 *      (e.g., "LAUNCH20" for Product Hunt traffic)
 *
 * WHY freeGenerations vs showPricingAfter:
 * These are intentionally separate because the optimal UX is to SHOW pricing
 * before the user hits the wall. Seeing "2 free uses remaining" creates urgency
 * and primes the user for the paywall before it blocks them. If showPricingAfter
 * equals freeGenerations, the paywall appears without warning, which feels jarring.
 */
export interface PaywallBehavior {
  /**
   * Number of free AI generations before the paywall activates.
   * After this count, either a hard block or soft upsell is shown.
   * Set to 0 for immediate paywall (e.g., invite-only or paid-only products).
   */
  readonly freeGenerations: number;

  /**
   * Show pricing information (modal, banner, or inline) after this many uses.
   * Should be LESS than freeGenerations to give the user warning.
   * Set to 0 to show pricing from the first generation.
   */
  readonly showPricingAfter: number;

  /**
   * When true, block the generation API entirely after free limit is reached.
   * When false, show a soft upsell (dismissible banner/modal) but allow
   * continued generation. Use false for organic traffic where engagement
   * metrics matter more than immediate conversion.
   *
   * IMPLEMENTATION NOTE: Even with hardPaywall=false, the server-side IP
   * rate limiter in /api/generate still enforces FREE_GENERATIONS_PER_IP_PER_DAY.
   * The soft paywall is a UX layer on top of that hard server limit.
   */
  readonly hardPaywall: boolean;

  /**
   * Optional Stripe promotion code to pre-apply in the checkout.
   * Use this for channel-specific discounts:
   *   - "PH_LAUNCH" for Product Hunt visitors
   *   - "TWITTER20" for social traffic
   *
   * The code must exist in Stripe Dashboard (Products > Coupons > Promotion codes).
   * If the code is invalid or expired, Stripe checkout simply ignores it.
   */
  readonly discountCode?: string;

  /**
   * Human-readable label for this segment, used in GA4 events and logging.
   * Example: "google_ads", "producthunt_launch", "organic_default"
   */
  readonly segmentLabel: string;
}

/**
 * PaywallSegment matches a set of UTM parameter conditions to a behavior.
 *
 * MATCHING RULES:
 * - All specified fields must match (AND logic)
 * - Omitted fields are wildcards (match anything)
 * - Values are compared case-insensitively (UTMs are normalized to lowercase
 *   in utm-capture.ts)
 * - Segments are evaluated in array order; FIRST match wins
 *   (so put more specific segments before generic ones)
 *
 * EXAMPLE: A segment with { utm_medium: "cpc", utm_source: "google" } matches
 * ONLY Google Ads traffic. A segment with just { utm_medium: "cpc" } matches
 * ALL paid search traffic (Google, Bing, etc.).
 */
export interface PaywallSegment {
  /**
   * Descriptive name for this segment — used in logs and GA4 events.
   * Should be kebab-case for consistency with GA4 event naming conventions.
   */
  readonly name: string;

  /**
   * UTM conditions to match. All specified fields must match (AND logic).
   * Omitted fields are wildcards. Values are case-insensitive.
   */
  readonly match: {
    readonly utm_source?: string;
    readonly utm_medium?: string;
    readonly utm_campaign?: string;
  };

  /**
   * The paywall behavior to apply when this segment matches.
   */
  readonly behavior: PaywallBehavior;
}

/**
 * Top-level paywall configuration. Contains an ordered list of segments
 * and a default behavior for unmatched traffic (organic/direct).
 */
export interface PaywallConfig {
  /**
   * Ordered list of traffic segments. Evaluated top-to-bottom; first match wins.
   * Put the most specific (and most valuable) segments first.
   */
  readonly segments: ReadonlyArray<PaywallSegment>;

  /**
   * Default behavior for traffic that doesn't match any segment.
   * This covers organic search, direct visits, bookmarks, and any
   * tagged traffic from sources not explicitly configured.
   */
  readonly defaultBehavior: PaywallBehavior;
}

/* ─── Default Configuration ──────────────────────────────────────────── */

/**
 * DEFAULT_PAYWALL_CONFIG — The out-of-the-box paywall strategy.
 *
 * This configuration is designed for AI tool SaaS products in the $5-10/month
 * price range. The strategy:
 *
 *   1. PAID SEARCH (Google/Bing Ads): Tight paywall. These users cost money
 *      to acquire and have high purchase intent. 1 free generation to demonstrate
 *      value, then hard paywall. The single free use is critical — it proves the
 *      tool works and converts "I'll try it" into "I need this".
 *
 *   2. PAID SOCIAL (Facebook/Instagram/TikTok Ads): Moderate paywall. Lower
 *      intent than search (they were scrolling, not searching), but still a
 *      paid user. 2 free generations, then hard paywall.
 *
 *   3. PRODUCT HUNT: Generous free tier with discount. PH users are early
 *      adopters who can become evangelists. Let them try 5 times, soft-sell
 *      with a launch discount code.
 *
 *   4. TWITTER/X: Social proof traffic. 3 free generations, soft paywall.
 *      These users often share results, which drives more organic traffic.
 *
 *   5. REDDIT: Community traffic. Similar to Twitter but slightly more
 *      skeptical. 3 free uses, soft upsell, no discount (Reddit users
 *      react negatively to overt promotion).
 *
 *   6. REFERRAL: Affiliate or partner traffic. Moderate free tier, soft
 *      paywall. The referral partner may have pre-sold the value.
 *
 *   7. DEFAULT (organic/direct): Most generous. 5 free generations, show
 *      pricing after 3, soft upsell. These users found us organically and
 *      are evaluating — give them enough room to see value.
 *
 * CUSTOMIZE PER CLONE:
 * Override this in your clone's config.ts:
 *   import { DEFAULT_PAYWALL_CONFIG } from "@/lib/paywall-config";
 *   export const PAYWALL_CONFIG = {
 *     ...DEFAULT_PAYWALL_CONFIG,
 *     defaultBehavior: { ...DEFAULT_PAYWALL_CONFIG.defaultBehavior, freeGenerations: 10 },
 *   };
 */
export const DEFAULT_PAYWALL_CONFIG: PaywallConfig = {
  segments: [
    /**
     * PAID SEARCH — Google Ads, Bing Ads, any CPC traffic.
     * Tightest paywall: 1 free generation, immediate pricing, hard block.
     *
     * WHY 1 free generation (not 0):
     * Zero free uses means the user can't verify the tool works before paying.
     * That kills conversion for AI tools because the value proposition is
     * "see how good the output is." One free use lets them experience the
     * magic moment, then the paywall captures the "I need more" impulse.
     */
    {
      name: "paid-search",
      match: { utm_medium: "cpc" },
      behavior: {
        freeGenerations: 1,
        showPricingAfter: 0,
        hardPaywall: true,
        segmentLabel: "paid_search_cpc",
      },
    },

    /**
     * PAID SOCIAL — Facebook, Instagram, TikTok ad traffic.
     * Moderate paywall: 2 free uses, show pricing after 1, hard block.
     *
     * WHY 2 (not 1 like search):
     * Social ad users have lower intent — they were scrolling, not actively
     * seeking a solution. Two tries gives them a chance to go from "huh, cool"
     * to "actually, I need this." But still hard paywall because we paid for them.
     */
    {
      name: "paid-social",
      match: { utm_medium: "paid_social" },
      behavior: {
        freeGenerations: 2,
        showPricingAfter: 1,
        hardPaywall: true,
        segmentLabel: "paid_social",
      },
    },

    /**
     * PRODUCT HUNT — Launch traffic.
     * Generous: 5 free uses, soft paywall, discount code.
     *
     * WHY generous + discount:
     * PH users are early adopters and potential evangelists. They share
     * products they like. Letting them try 5 times maximizes the chance
     * they'll upvote, comment, or share on social. The discount code
     * converts the enthusiastic ones at a lower CAC than ads.
     */
    {
      name: "producthunt",
      match: { utm_source: "producthunt" },
      behavior: {
        freeGenerations: 5,
        showPricingAfter: 3,
        hardPaywall: false,
        discountCode: "LAUNCH20",
        segmentLabel: "producthunt_launch",
      },
    },

    /**
     * TWITTER / X — Social sharing traffic.
     * Moderate: 3 free uses, soft paywall.
     *
     * WHY soft paywall:
     * Twitter users often share AI-generated results in their feed.
     * A hard paywall would cut off the viral loop. Soft paywall lets them
     * keep generating (within the server-side IP limit) while nudging upgrade.
     */
    {
      name: "twitter",
      match: { utm_source: "twitter" },
      behavior: {
        freeGenerations: 3,
        showPricingAfter: 2,
        hardPaywall: false,
        segmentLabel: "twitter_social",
      },
    },

    /**
     * REDDIT — Community traffic.
     * Moderate: 3 free uses, soft paywall, no discount code.
     *
     * WHY no discount:
     * Reddit users are highly sensitive to feeling marketed to. A discount
     * code can feel transactional and trigger negative reactions ("this is
     * just an ad disguised as a post"). Let the product speak for itself.
     */
    {
      name: "reddit",
      match: { utm_source: "reddit" },
      behavior: {
        freeGenerations: 3,
        showPricingAfter: 2,
        hardPaywall: false,
        segmentLabel: "reddit_community",
      },
    },

    /**
     * REFERRAL — Affiliate or partner traffic.
     * Moderate: 3 free uses, soft paywall.
     */
    {
      name: "referral",
      match: { utm_medium: "referral" },
      behavior: {
        freeGenerations: 3,
        showPricingAfter: 2,
        hardPaywall: false,
        segmentLabel: "referral_partner",
      },
    },

    /**
     * EMAIL — Newsletter or lifecycle email traffic.
     * These users already know us, moderate paywall.
     */
    {
      name: "email",
      match: { utm_medium: "email" },
      behavior: {
        freeGenerations: 3,
        showPricingAfter: 2,
        hardPaywall: false,
        segmentLabel: "email_lifecycle",
      },
    },
  ],

  /**
   * DEFAULT — Organic search, direct visits, bookmarks, untagged referrals.
   * Most generous: 5 free uses, show pricing after 3, soft upsell.
   *
   * WHY most generous:
   * Organic traffic costs nothing to acquire. The ROI calculation is different:
   * we're optimizing for ENGAGEMENT and HABIT FORMATION, not immediate conversion.
   * A user who generates 5 images and bookmarks the tool is likely to return
   * and eventually convert, even without a paywall forcing it.
   *
   * The server-side IP rate limiter (FREE_GENERATIONS_PER_IP_PER_DAY in
   * /api/generate/route.ts) still caps daily free usage regardless of this
   * client-side config, so we're protected against abuse.
   */
  defaultBehavior: {
    freeGenerations: 5,
    showPricingAfter: 3,
    hardPaywall: false,
    segmentLabel: "organic_default",
  },
};

/* ─── Segment Matching Logic ─────────────────────────────────────────── */

/**
 * Resolves which paywall behavior applies to a given set of UTM parameters.
 *
 * ALGORITHM:
 * 1. Iterate through segments in order (most specific first by convention)
 * 2. For each segment, check if ALL specified match conditions are satisfied
 * 3. Return the first matching segment's behavior
 * 4. If no segment matches, return the default behavior
 *
 * WHY first-match-wins (not best-match):
 * First-match is simpler to reason about, simpler to configure, and matches
 * how firewall rules and middleware chains work. The config author controls
 * priority by ordering segments: put "utm_medium=cpc AND utm_source=google"
 * before "utm_medium=cpc" if you want Google Ads to have different behavior
 * than Bing Ads.
 *
 * @param utmParams - The user's stored UTM parameters, or null for organic
 * @param config - The paywall configuration to evaluate against
 * @returns The resolved PaywallBehavior and matched segment name (or "default")
 */
export function resolvePaywallSegment(
  utmParams: UtmParameters | null,
  config: PaywallConfig = DEFAULT_PAYWALL_CONFIG
): { behavior: PaywallBehavior; matchedSegmentName: string } {
  /**
   * No UTMs = organic/direct traffic. Skip segment evaluation entirely
   * and return the default. This is the fast path for the majority of users.
   */
  if (!utmParams) {
    return {
      behavior: config.defaultBehavior,
      matchedSegmentName: "default",
    };
  }

  for (const segment of config.segments) {
    const matchConditions = segment.match;
    let allConditionsMet = true;

    /**
     * Check each specified condition. Omitted fields are wildcards.
     * Values are compared case-insensitively (UTMs are already normalized
     * to lowercase in utm-capture.ts, but we toLowerCase() the config
     * values too for safety in case someone configures "CPC" instead of "cpc").
     */
    if (matchConditions.utm_source) {
      if (
        utmParams.utm_source?.toLowerCase() !==
        matchConditions.utm_source.toLowerCase()
      ) {
        allConditionsMet = false;
      }
    }

    if (matchConditions.utm_medium) {
      if (
        utmParams.utm_medium?.toLowerCase() !==
        matchConditions.utm_medium.toLowerCase()
      ) {
        allConditionsMet = false;
      }
    }

    if (matchConditions.utm_campaign) {
      if (
        utmParams.utm_campaign?.toLowerCase() !==
        matchConditions.utm_campaign.toLowerCase()
      ) {
        allConditionsMet = false;
      }
    }

    if (allConditionsMet) {
      return {
        behavior: segment.behavior,
        matchedSegmentName: segment.name,
      };
    }
  }

  /**
   * No segment matched — the user has UTMs but from an unconfigured source.
   * Fall back to default behavior. This could be e.g. utm_source=bing or
   * utm_medium=banner — legitimate traffic that we haven't specifically tuned.
   */
  return {
    behavior: config.defaultBehavior,
    matchedSegmentName: "default",
  };
}
