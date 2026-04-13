/**
 * Onboarding Storage — Persists questionnaire responses and UTM parameters.
 *
 * WHY THIS FILE EXISTS:
 * The onboarding questionnaire collects two categories of data that must survive
 * page navigations and browser refreshes:
 *   1. User responses (use-case, volume, style preferences) — used to personalize
 *      the pricing recommendation and can be sent to analytics pipelines.
 *   2. UTM parameters (source, medium, campaign, etc.) — captured on first landing
 *      and threaded through to the Stripe checkout session so we can attribute
 *      revenue back to specific traffic sources.
 *
 * WHY localStorage (not cookies or session storage):
 * - Cookies: too small (4KB limit), and we don't need server-side access
 * - SessionStorage: clears when the tab closes — we want responses to persist
 *   across tabs and sessions so returning visitors don't re-do the survey
 * - localStorage: 5-10MB, persists indefinitely, client-only — perfect fit
 *
 * IMPORTED BY:
 * - src/components/OnboardingQuestionnaire.tsx (read/write responses)
 * - src/app/api/stripe/checkout/route.ts (could read UTM for Stripe metadata)
 *
 * ANALYTICS INTEGRATION:
 * The stored data is structured for easy forwarding to GA4, Mixpanel, or
 * any analytics tool. Call getOnboardingAnalyticsPayload() to get a
 * ready-to-send object.
 */

/* ============================================================
 * CONSTANTS
 * localStorage key names — namespaced to avoid collisions with
 * other tools or libraries that might use localStorage.
 * ============================================================ */

/** Key for the questionnaire responses object */
const ONBOARDING_RESPONSES_KEY = "onboarding_responses";

/** Key for captured UTM parameters */
const ONBOARDING_UTM_KEY = "onboarding_utm";

/** Key for onboarding completion timestamp */
const ONBOARDING_COMPLETED_KEY = "onboarding_completed_at";

/* ============================================================
 * TYPE DEFINITIONS
 * ============================================================ */

/**
 * Shape of stored questionnaire responses.
 * Keys are step IDs from OnboardingConfig, values are selected option IDs.
 *
 * @example { "use-case": "product-photos", "volume": "10-50", "style": "clean-minimal" }
 */
export interface OnboardingResponses {
  [stepId: string]: string;
}

/**
 * UTM parameters captured from the landing page URL.
 * These standard marketing attribution parameters are used by Google Analytics,
 * Facebook Ads, and virtually every ad platform.
 */
export interface UtmParameters {
  /** Traffic source — e.g., "google", "facebook", "newsletter" */
  utm_source?: string;
  /** Marketing medium — e.g., "cpc", "organic", "email" */
  utm_medium?: string;
  /** Campaign name — e.g., "spring-sale-2026", "product-hunt-launch" */
  utm_campaign?: string;
  /** Specific term or keyword — e.g., "background remover free" */
  utm_term?: string;
  /** A/B test variant or ad creative — e.g., "hero-v2", "video-ad" */
  utm_content?: string;
}

/**
 * Complete analytics payload combining responses, UTM, and metadata.
 * Ready to send to GA4 custom events or any analytics endpoint.
 */
export interface OnboardingAnalyticsPayload {
  responses: OnboardingResponses;
  utm: UtmParameters;
  completedAt: string | null;
  /** ISO timestamp of when the user started the questionnaire */
  startedAt: string;
}

/* ============================================================
 * RESPONSE STORAGE
 * Read/write individual step responses to localStorage.
 * ============================================================ */

/**
 * Save a single step response to localStorage.
 * Merges with any existing responses — does not overwrite the whole object.
 *
 * @param stepId - The step identifier from OnboardingConfig (e.g., "use-case")
 * @param optionId - The selected option identifier (e.g., "product-photos")
 */
export function saveOnboardingResponse(stepId: string, optionId: string): void {
  if (typeof window === "undefined") return;

  try {
    const existingResponsesRaw = localStorage.getItem(ONBOARDING_RESPONSES_KEY);
    const existingResponses: OnboardingResponses = existingResponsesRaw
      ? JSON.parse(existingResponsesRaw)
      : {};

    existingResponses[stepId] = optionId;
    localStorage.setItem(ONBOARDING_RESPONSES_KEY, JSON.stringify(existingResponses));
  } catch (storageError) {
    /**
     * localStorage can throw in private browsing mode or when quota is exceeded.
     * We silently fail because the questionnaire should still work — it just
     * won't persist responses across page reloads. The UX is slightly degraded
     * but not broken.
     */
    console.warn("Failed to save onboarding response:", storageError);
  }
}

/**
 * Retrieve all stored questionnaire responses.
 *
 * @returns Object mapping step IDs to selected option IDs, or empty object if none stored
 */
export function getOnboardingResponses(): OnboardingResponses {
  if (typeof window === "undefined") return {};

  try {
    const storedResponsesRaw = localStorage.getItem(ONBOARDING_RESPONSES_KEY);
    return storedResponsesRaw ? JSON.parse(storedResponsesRaw) : {};
  } catch {
    return {};
  }
}

/**
 * Check whether the user has already completed the onboarding questionnaire.
 * Used to decide whether to show the questionnaire or skip straight to the tool.
 *
 * @returns true if the user completed all steps and saw the results screen
 */
export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Mark the onboarding questionnaire as completed.
 * Called when the user reaches the final results screen.
 */
export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, new Date().toISOString());
  } catch (storageError) {
    console.warn("Failed to mark onboarding complete:", storageError);
  }
}

/**
 * Clear all onboarding data from localStorage.
 * Useful for testing or when the user wants to redo the questionnaire.
 */
export function clearOnboardingData(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(ONBOARDING_RESPONSES_KEY);
    localStorage.removeItem(ONBOARDING_UTM_KEY);
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (storageError) {
    console.warn("Failed to clear onboarding data:", storageError);
  }
}

/* ============================================================
 * UTM PARAMETER CAPTURE
 * Extracts UTM params from the current URL and persists them.
 * Should be called once on the landing page mount.
 * ============================================================ */

/**
 * Capture UTM parameters from the current page URL and store them.
 * Only captures if UTM params are present — does not overwrite existing
 * stored UTMs (first-touch attribution model).
 *
 * WHY FIRST-TOUCH:
 * For SaaS products, first-touch attribution is more useful than last-touch
 * because we want to know what channel BROUGHT the user, not what channel
 * they happened to be on when they finally converted (which is often direct/
 * bookmark). If you need last-touch, remove the early return below.
 */
export function captureUtmParameters(): void {
  if (typeof window === "undefined") return;

  try {
    /* First-touch: if we already have UTMs, keep them */
    const existingUtmRaw = localStorage.getItem(ONBOARDING_UTM_KEY);
    if (existingUtmRaw) return;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const capturedUtmParams: UtmParameters = {};

    const utmSource = urlSearchParams.get("utm_source");
    const utmMedium = urlSearchParams.get("utm_medium");
    const utmCampaign = urlSearchParams.get("utm_campaign");
    const utmTerm = urlSearchParams.get("utm_term");
    const utmContent = urlSearchParams.get("utm_content");

    if (utmSource) capturedUtmParams.utm_source = utmSource;
    if (utmMedium) capturedUtmParams.utm_medium = utmMedium;
    if (utmCampaign) capturedUtmParams.utm_campaign = utmCampaign;
    if (utmTerm) capturedUtmParams.utm_term = utmTerm;
    if (utmContent) capturedUtmParams.utm_content = utmContent;

    /* Only store if at least one UTM param was found */
    if (Object.keys(capturedUtmParams).length > 0) {
      localStorage.setItem(ONBOARDING_UTM_KEY, JSON.stringify(capturedUtmParams));
    }
  } catch (storageError) {
    console.warn("Failed to capture UTM parameters:", storageError);
  }
}

/**
 * Retrieve stored UTM parameters.
 *
 * @returns UTM parameters object, or empty object if none captured
 */
export function getUtmParameters(): UtmParameters {
  if (typeof window === "undefined") return {};

  try {
    const storedUtmRaw = localStorage.getItem(ONBOARDING_UTM_KEY);
    return storedUtmRaw ? JSON.parse(storedUtmRaw) : {};
  } catch {
    return {};
  }
}

/* ============================================================
 * ANALYTICS PAYLOAD
 * Combines responses + UTM into a single object for analytics.
 * ============================================================ */

/**
 * Build a complete analytics payload from stored onboarding data.
 * This is the object you'd send to GA4 custom events, Mixpanel,
 * or your own analytics API endpoint.
 *
 * @returns Complete payload with responses, UTM, and timestamps
 *
 * @example
 * const payload = getOnboardingAnalyticsPayload();
 * // Send to GA4:
 * gtag('event', 'onboarding_complete', payload);
 */
export function getOnboardingAnalyticsPayload(): OnboardingAnalyticsPayload {
  const completedAtValue =
    typeof window !== "undefined"
      ? localStorage.getItem(ONBOARDING_COMPLETED_KEY)
      : null;

  return {
    responses: getOnboardingResponses(),
    utm: getUtmParameters(),
    completedAt: completedAtValue,
    startedAt: new Date().toISOString(),
  };
}
