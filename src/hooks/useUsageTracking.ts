/**
 * useUsageTracking — React Hook for Segmented Paywall Usage Tracking
 *
 * WHY THIS HOOK EXISTS:
 * This is the glue between UTM capture (traffic source) and paywall behavior
 * (conversion strategy). It answers the four questions every component that
 * gates AI generation needs to ask:
 *   1. Can this user generate right now? (canGenerate)
 *   2. How many free uses do they have left? (remainingFreeGenerations)
 *   3. Should we show a paywall/pricing modal? (shouldShowPaywall)
 *   4. What traffic segment are they in? (segmentInfo)
 *
 * HOW IT WORKS:
 * On mount, the hook:
 *   1. Reads stored UTM parameters (from useUtmCapture)
 *   2. Resolves the paywall segment (from paywall-config.ts)
 *   3. Reads the user's generation count from localStorage (anonymous) or
 *      from the credit system response (authenticated)
 *   4. Computes the paywall state based on segment limits vs usage count
 *
 * ANONYMOUS vs AUTHENTICATED TRACKING:
 * - ANONYMOUS users: generation count stored in localStorage. This is
 *   "best-effort" — users can clear localStorage to reset. That's okay
 *   because the server-side IP rate limiter in /api/generate catches abuse.
 *   The client-side count is a UX convenience, not a security boundary.
 * - AUTHENTICATED users: generation count tracked by the credit system
 *   (src/lib/credits.ts). The localStorage count is still maintained as
 *   a fast local cache to avoid API round-trips on every render.
 *
 * GA4 EVENTS FIRED:
 * - paywall_shown: When shouldShowPaywall transitions from false to true.
 *   Includes segment label and generation count for funnel analysis.
 * - paywall_dismissed: When the user dismisses the paywall modal/banner.
 *   Consumers call dismissPaywall() which fires this event.
 * - paywall_converted: When the user clicks through to pricing/checkout.
 *   Consumers call recordPaywallConversion() which fires this event.
 *
 * IMPORTED BY:
 * - Dashboard page (gates the "Generate" button)
 * - UploadZone component (shows remaining credits / paywall banner)
 * - PricingCards component (pre-selects the discount code from segment)
 * - Any component that conditionally renders based on usage limits
 *
 * DEPENDS ON:
 * - src/hooks/useUtmCapture.ts (UTM parameter reading)
 * - src/lib/paywall-config.ts (segment resolution + PaywallBehavior)
 * - src/lib/utm-capture.ts (sendGa4EventWithUtmAttribution for GA4 events)
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUtmCapture } from "@/hooks/useUtmCapture";
import {
  resolvePaywallSegment,
  type PaywallBehavior,
  type PaywallConfig,
  DEFAULT_PAYWALL_CONFIG,
} from "@/lib/paywall-config";
import { sendGa4EventWithUtmAttribution } from "@/lib/utm-capture";

/* ─── localStorage Keys ──────────────────────────────────────────────── */

/**
 * localStorage key for the anonymous generation counter.
 * Versioned with _v1 for schema evolution safety (same pattern as
 * cookie-consent-storage.ts and utm-capture.ts).
 */
const ANONYMOUS_USAGE_LOCALSTORAGE_KEY = "saas_clone_usage_count_v1";

/**
 * localStorage key for tracking when the paywall was last dismissed.
 * Used to implement a "don't show again for N minutes" cooldown so
 * the paywall doesn't immediately reappear on every page navigation.
 */
const PAYWALL_DISMISSED_AT_LOCALSTORAGE_KEY =
  "saas_clone_paywall_dismissed_at_v1";

/**
 * How long to suppress the paywall after the user dismisses it (in ms).
 * 10 minutes is enough to let the user finish their current task without
 * annoyance, but short enough that they'll see it again in the same session.
 */
const PAYWALL_DISMISS_COOLDOWN_MS = 10 * 60 * 1000;

/* ─── Anonymous Usage Persistence ────────────────────────────────────── */

/**
 * Reads the anonymous user's generation count from localStorage.
 *
 * The stored value is a JSON object with:
 *   - count: number of generations performed
 *   - firstGenerationTimestamp: when the first generation happened (for
 *     daily reset logic if needed in the future)
 *
 * Returns 0 if nothing is stored or the stored value is corrupted.
 *
 * WHY a JSON object (not just a number):
 * Future-proofing for daily reset logic. If we later want to reset
 * anonymous counts daily (matching the server-side IP limit reset),
 * we need to know when counting started. Storing a plain number would
 * require a migration.
 */
function readAnonymousGenerationCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const storedJson = window.localStorage.getItem(
      ANONYMOUS_USAGE_LOCALSTORAGE_KEY
    );
    if (!storedJson) {
      return 0;
    }

    const parsed = JSON.parse(storedJson) as {
      count?: number;
      firstGenerationTimestamp?: number;
    };

    /**
     * Daily reset check: if the first generation was more than 24 hours ago,
     * reset the count. This mirrors the server-side IP rate limiter behavior
     * so the client-side UX (remaining credits display) stays roughly in sync
     * with what the server will actually allow.
     */
    if (parsed.firstGenerationTimestamp) {
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.firstGenerationTimestamp > twentyFourHoursMs) {
        window.localStorage.removeItem(ANONYMOUS_USAGE_LOCALSTORAGE_KEY);
        return 0;
      }
    }

    return typeof parsed.count === "number" && parsed.count >= 0
      ? parsed.count
      : 0;
  } catch {
    return 0;
  }
}

/**
 * Increments the anonymous user's generation count by 1.
 *
 * Called AFTER a successful generation (same pattern as the credit system's
 * deductOneCreditForUser — deduct after success, never before).
 *
 * Sets firstGenerationTimestamp on the first generation so the daily
 * reset logic in readAnonymousGenerationCount() has a reference point.
 */
function incrementAnonymousGenerationCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const currentCount = readAnonymousGenerationCount();
    const newCount = currentCount + 1;

    /**
     * Read existing timestamp or set a new one.
     * We preserve the original timestamp across increments so the
     * 24-hour reset window is anchored to the FIRST generation, not
     * the most recent one.
     */
    let firstTimestamp = Date.now();
    try {
      const existing = window.localStorage.getItem(
        ANONYMOUS_USAGE_LOCALSTORAGE_KEY
      );
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed.firstGenerationTimestamp) {
          firstTimestamp = parsed.firstGenerationTimestamp;
        }
      }
    } catch {
      /* use current time if parsing fails */
    }

    window.localStorage.setItem(
      ANONYMOUS_USAGE_LOCALSTORAGE_KEY,
      JSON.stringify({
        count: newCount,
        firstGenerationTimestamp: firstTimestamp,
      })
    );

    return newCount;
  } catch {
    return 0;
  }
}

/* ─── Paywall Dismiss Cooldown ───────────────────────────────────────── */

/**
 * Checks whether the paywall is in its dismiss cooldown period.
 * Returns true if the paywall was dismissed recently and should stay hidden.
 */
function isPaywallInDismissCooldown(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const dismissedAt = window.localStorage.getItem(
      PAYWALL_DISMISSED_AT_LOCALSTORAGE_KEY
    );
    if (!dismissedAt) {
      return false;
    }

    const dismissedTimestamp = parseInt(dismissedAt, 10);
    if (isNaN(dismissedTimestamp)) {
      return false;
    }

    return Date.now() - dismissedTimestamp < PAYWALL_DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * Records that the user dismissed the paywall, starting the cooldown timer.
 */
function recordPaywallDismissTimestamp(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      PAYWALL_DISMISSED_AT_LOCALSTORAGE_KEY,
      String(Date.now())
    );
  } catch {
    /* silent fail — cooldown is a UX nicety, not critical */
  }
}

/* ─── Hook Return Type ───────────────────────────────────────────────── */

/**
 * The return type of useUsageTracking(). Every field is documented so
 * consuming components know exactly what they're getting.
 */
export interface UsageTrackingState {
  /**
   * True if the user can perform a generation right now.
   * False if they've exhausted their free tier AND the segment has hardPaywall=true.
   * Note: even when canGenerate is true, the server may still reject (IP limit,
   * credit system). This is the CLIENT-SIDE pre-check only.
   */
  readonly canGenerate: boolean;

  /**
   * Number of free generations remaining before the paywall activates.
   * 0 means the user has used all their free generations.
   * -1 means unlimited (paid subscriber — paywall doesn't apply).
   */
  readonly remainingFreeGenerations: number;

  /**
   * True when the paywall UI should be shown. This is true when:
   *   a) The user has used >= showPricingAfter generations, AND
   *   b) The paywall dismiss cooldown has expired, AND
   *   c) The user is not a paid subscriber
   *
   * Components should render a pricing modal/banner when this is true.
   */
  readonly shouldShowPaywall: boolean;

  /**
   * True when the user has hit the hard limit and MUST pay to continue.
   * Only true when hardPaywall=true in the segment AND all free uses exhausted.
   * Different from shouldShowPaywall which can be true for soft upsells too.
   */
  readonly isHardBlocked: boolean;

  /**
   * Information about the resolved traffic segment.
   * Use this for conditional UI (e.g., showing the discount code),
   * analytics, and debugging.
   */
  readonly segmentInfo: {
    readonly segmentName: string;
    readonly segmentLabel: string;
    readonly behavior: PaywallBehavior;
  };

  /**
   * The discount code for this segment, if any.
   * Pass this to the Stripe checkout to pre-apply the discount.
   * Undefined if the segment doesn't offer a discount.
   */
  readonly discountCode?: string;

  /**
   * Total number of generations the user has performed (in the current period).
   * Used for displaying "X of Y free uses remaining" in the UI.
   */
  readonly totalGenerationsUsed: number;

  /**
   * Call this AFTER a successful generation to increment the usage counter.
   * Returns the new usage count.
   *
   * WHY a callback (not automatic):
   * The hook doesn't know when a generation succeeds — only the component
   * that calls /api/generate knows. The component calls recordGeneration()
   * in the .then() of the API call, same as how deductOneCreditForUser
   * is called after fal.ai success.
   */
  readonly recordGeneration: () => number;

  /**
   * Call this when the user dismisses the paywall modal/banner.
   * Starts the cooldown timer and fires a GA4 paywall_dismissed event.
   */
  readonly dismissPaywall: () => void;

  /**
   * Call this when the user clicks through to pricing/checkout from the paywall.
   * Fires a GA4 paywall_converted event with segment attribution.
   */
  readonly recordPaywallConversion: () => void;
}

/* ─── The Hook ───────────────────────────────────────────────────────── */

/**
 * Usage tracking hook with traffic-source-aware paywall segmentation.
 *
 * @param config - Custom paywall configuration. Defaults to DEFAULT_PAYWALL_CONFIG.
 *   Pass a custom config when a clone needs different segment rules.
 * @param isSubscriber - True if the user has an active paid subscription.
 *   When true, all paywall logic is bypassed (subscribers never see paywalls).
 *   This should come from the session/auth state in the consuming component.
 *
 * USAGE EXAMPLE:
 * ```tsx
 * function GenerateButton() {
 *   const { canGenerate, shouldShowPaywall, remainingFreeGenerations, recordGeneration } =
 *     useUsageTracking({ isSubscriber: session?.user?.subscriptionTier !== "free" });
 *
 *   const handleGenerate = async () => {
 *     const result = await fetch("/api/generate", { ... });
 *     if (result.ok) {
 *       recordGeneration(); // increment counter after success
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button disabled={!canGenerate} onClick={handleGenerate}>
 *         Generate ({remainingFreeGenerations} free remaining)
 *       </button>
 *       {shouldShowPaywall && <PricingModal />}
 *     </>
 *   );
 * }
 * ```
 */
export function useUsageTracking(options?: {
  config?: PaywallConfig;
  isSubscriber?: boolean;
}): UsageTrackingState {
  const paywallConfig = options?.config ?? DEFAULT_PAYWALL_CONFIG;
  const isActiveSubscriber = options?.isSubscriber ?? false;

  /**
   * Read UTM parameters via the capture hook.
   * This returns null for organic/direct traffic, or the stored
   * first-touch UTMs for tagged traffic.
   */
  const utmParameters = useUtmCapture();

  /**
   * Resolve the paywall segment based on UTM parameters.
   * useMemo because segment resolution is a pure function of UTMs + config,
   * and we don't want to re-resolve on every render.
   */
  const resolvedSegment = useMemo(
    () => resolvePaywallSegment(utmParameters, paywallConfig),
    [utmParameters, paywallConfig]
  );

  /**
   * Track the anonymous generation count in component state.
   * Initialize from localStorage synchronously to avoid UI flicker
   * (same pattern as useUtmCapture).
   */
  const [generationCount, setGenerationCount] = useState<number>(() =>
    readAnonymousGenerationCount()
  );

  /**
   * Track whether the paywall dismiss cooldown is active.
   * Initialized from localStorage.
   */
  const [isDismissCooldownActive, setIsDismissCooldownActive] =
    useState<boolean>(() => isPaywallInDismissCooldown());

  /**
   * Track whether we've already fired the paywall_shown GA4 event for this
   * session. We only want to fire it ONCE when shouldShowPaywall first
   * becomes true, not on every re-render.
   */
  const hasFireedPaywallShownEventRef = useRef(false);

  /**
   * Refresh the generation count from localStorage on mount.
   * This handles the case where another tab incremented the count
   * (localStorage is shared across tabs in the same origin).
   */
  useEffect(() => {
    const currentCount = readAnonymousGenerationCount();
    setGenerationCount(currentCount);
  }, []);

  /* ─── Computed State ─────────────────────────────────────────────── */

  const segmentBehavior = resolvedSegment.behavior;
  const segmentName = resolvedSegment.matchedSegmentName;

  /**
   * Remaining free generations. Clamped to 0 minimum.
   * -1 for subscribers (they have unlimited or credit-based access,
   * not paywall-gated).
   */
  const remainingFreeGenerations = isActiveSubscriber
    ? -1
    : Math.max(0, segmentBehavior.freeGenerations - generationCount);

  /**
   * Whether the user has exhausted all free generations for their segment.
   * Subscribers are never exhausted.
   */
  const hasExhaustedFreeGenerations =
    !isActiveSubscriber && generationCount >= segmentBehavior.freeGenerations;

  /**
   * Whether the user is hard-blocked (can't generate at all).
   * Only true when both: free uses exhausted AND segment uses hard paywall.
   * Subscribers are never blocked.
   */
  const isHardBlocked =
    hasExhaustedFreeGenerations && segmentBehavior.hardPaywall;

  /**
   * Whether the user can generate right now.
   * True unless hard-blocked. Soft paywall segments allow continued generation
   * even after the free limit (the server-side IP limit is the real backstop).
   */
  const canGenerate = isActiveSubscriber || !isHardBlocked;

  /**
   * Whether to show the paywall UI.
   * True when:
   *   1. User is NOT a subscriber, AND
   *   2. User has generated >= showPricingAfter times, AND
   *   3. The dismiss cooldown has expired
   *
   * The cooldown check prevents the paywall from reappearing immediately
   * after dismissal, which would be annoying and counter-productive.
   */
  const shouldShowPaywall =
    !isActiveSubscriber &&
    generationCount >= segmentBehavior.showPricingAfter &&
    !isDismissCooldownActive;

  /* ─── GA4 Event: paywall_shown ─────────────────────────────────── */

  /**
   * Fire paywall_shown event when the paywall first becomes visible.
   * Uses a ref to ensure it fires at most once per hook lifecycle.
   *
   * WHY in useEffect (not inline):
   * GA4 events are side effects. React Strict Mode double-invokes render
   * functions, which would fire the event twice. useEffect with a ref guard
   * ensures exactly one event per paywall appearance.
   */
  useEffect(() => {
    if (shouldShowPaywall && !hasFireedPaywallShownEventRef.current) {
      hasFireedPaywallShownEventRef.current = true;

      sendGa4EventWithUtmAttribution("paywall_shown", {
        segment_name: segmentName,
        segment_label: segmentBehavior.segmentLabel,
        generations_used: generationCount,
        free_limit: segmentBehavior.freeGenerations,
        is_hard_paywall: segmentBehavior.hardPaywall,
      });
    }

    /**
     * Reset the fired flag when shouldShowPaywall goes back to false.
     * This allows the event to fire again if the paywall re-appears
     * after a cooldown period.
     */
    if (!shouldShowPaywall) {
      hasFireedPaywallShownEventRef.current = false;
    }
  }, [
    shouldShowPaywall,
    segmentName,
    segmentBehavior.segmentLabel,
    segmentBehavior.freeGenerations,
    segmentBehavior.hardPaywall,
    generationCount,
  ]);

  /* ─── Callbacks ────────────────────────────────────────────────── */

  /**
   * Record a successful generation. Call this from the component AFTER
   * the /api/generate call succeeds.
   *
   * Updates both the localStorage counter and the React state so the UI
   * reflects the new count immediately without a page refresh.
   */
  const recordGeneration = useCallback((): number => {
    const newCount = incrementAnonymousGenerationCount();
    setGenerationCount(newCount);

    /**
     * Fire a GA4 event for generation tracking with segment attribution.
     * This lets us build reports like "generations per segment" and
     * "average generations before conversion by traffic source".
     */
    sendGa4EventWithUtmAttribution("generation_completed", {
      segment_name: segmentName,
      segment_label: segmentBehavior.segmentLabel,
      generation_number: newCount,
      remaining_free: Math.max(
        0,
        segmentBehavior.freeGenerations - newCount
      ),
    });

    return newCount;
  }, [segmentName, segmentBehavior.segmentLabel, segmentBehavior.freeGenerations]);

  /**
   * Dismiss the paywall UI. Starts the cooldown timer so it doesn't
   * immediately reappear, and fires a GA4 event for funnel analysis.
   */
  const dismissPaywall = useCallback((): void => {
    recordPaywallDismissTimestamp();
    setIsDismissCooldownActive(true);

    sendGa4EventWithUtmAttribution("paywall_dismissed", {
      segment_name: segmentName,
      segment_label: segmentBehavior.segmentLabel,
      generations_used: generationCount,
      free_limit: segmentBehavior.freeGenerations,
      is_hard_paywall: segmentBehavior.hardPaywall,
    });

    /**
     * Schedule the cooldown expiry so the paywall can reappear after
     * PAYWALL_DISMISS_COOLDOWN_MS without requiring a page refresh.
     */
    setTimeout(() => {
      setIsDismissCooldownActive(false);
    }, PAYWALL_DISMISS_COOLDOWN_MS);
  }, [
    segmentName,
    segmentBehavior.segmentLabel,
    segmentBehavior.freeGenerations,
    segmentBehavior.hardPaywall,
    generationCount,
  ]);

  /**
   * Record that the user clicked through to pricing/checkout from the paywall.
   * This is a high-value conversion event for GA4 funnel analysis.
   *
   * Note: this does NOT handle the actual navigation to the checkout.
   * The consuming component should call this AND THEN redirect to the
   * pricing page or trigger the Stripe checkout flow.
   */
  const recordPaywallConversion = useCallback((): void => {
    sendGa4EventWithUtmAttribution("paywall_converted", {
      segment_name: segmentName,
      segment_label: segmentBehavior.segmentLabel,
      generations_used: generationCount,
      free_limit: segmentBehavior.freeGenerations,
      is_hard_paywall: segmentBehavior.hardPaywall,
      discount_code: segmentBehavior.discountCode || "none",
    });
  }, [
    segmentName,
    segmentBehavior.segmentLabel,
    segmentBehavior.freeGenerations,
    segmentBehavior.hardPaywall,
    segmentBehavior.discountCode,
    generationCount,
  ]);

  /* ─── Return ───────────────────────────────────────────────────── */

  return {
    canGenerate,
    remainingFreeGenerations,
    shouldShowPaywall,
    isHardBlocked,
    segmentInfo: {
      segmentName,
      segmentLabel: segmentBehavior.segmentLabel,
      behavior: segmentBehavior,
    },
    discountCode: segmentBehavior.discountCode,
    totalGenerationsUsed: generationCount,
    recordGeneration,
    dismissPaywall,
    recordPaywallConversion,
  };
}
