/**
 * UTM Parameter Capture and Persistence — Traffic Source Attribution
 *
 * WHY THIS FILE EXISTS:
 * The portfolio runs 40+ AI tool clones, many of which receive paid traffic
 * (Google Ads, Product Hunt, Reddit, Twitter/X). Knowing where a user came
 * from is critical for two things:
 *   1. PAYWALL OPTIMIZATION: Paid-traffic users (high intent, high CPA) see a
 *      tighter paywall. Organic users get more free usage to build habit.
 *   2. STRIPE METADATA: When a user converts to a paid subscriber, their
 *      acquisition source is attached to the Stripe checkout metadata so we
 *      can compute per-channel ROAS and LTV without external analytics.
 *
 * HOW IT WORKS:
 * On first page load, this module reads UTM parameters from the URL (the
 * standard set: utm_source, utm_medium, utm_campaign, utm_content, utm_term).
 * It persists them in two stores:
 *   - **Cookie** (`_utm_params`): survives browser restart, accessible server-side
 *     in middleware and API routes. 30-day expiry matches the session length.
 *   - **localStorage** (`saas_clone_utm_v1`): survives cookie clearing, used by
 *     client-side hooks (paywall logic, GA4 event enrichment).
 *
 * FIRST-TOUCH ATTRIBUTION:
 * We use **first-touch** attribution: if UTM params already exist in storage,
 * new URL parameters do NOT overwrite them. This is deliberate because:
 *   - We want to credit the channel that originally acquired the user
 *   - Without this, a user who arrives via Google Ads and later clicks an
 *     organic link would lose their paid attribution
 *   - For last-touch, GA4 already handles that natively
 *
 * IMPORTED BY:
 * - src/hooks/useUtmCapture.ts (React hook that calls captureUtmFromUrl on mount)
 * - src/hooks/useUsageTracking.ts (reads stored UTMs for segment matching)
 * - src/app/api/stripe/checkout/route.ts (reads cookie for Stripe metadata)
 * - src/lib/paywall-config.ts (uses UTM types for segment matching)
 *
 * DEPENDS ON:
 * - Browser APIs (document.cookie, localStorage, URL) — client-side only
 * - No external packages
 */

/* ─── Types ──────────────────────────────────────────────────────────── */

/**
 * Standard UTM parameter set. All fields are optional because a visitor
 * may arrive with partial UTMs (e.g., only utm_source and utm_medium from
 * a Google Ads autotagged link).
 */
export interface UtmParameters {
  readonly utm_source?: string;
  readonly utm_medium?: string;
  readonly utm_campaign?: string;
  readonly utm_content?: string;
  readonly utm_term?: string;
}

/**
 * The five standard UTM query param names. Used for URL parsing and
 * validation so we don't accidentally capture unrelated query params.
 */
const UTM_PARAM_NAMES: ReadonlyArray<keyof UtmParameters> = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

/* ─── Storage Keys ───────────────────────────────────────────────────── */

/**
 * localStorage key for UTM persistence. Versioned with _v1 so we can
 * change the schema later without misinterpreting old data (same pattern
 * as cookie-consent-storage.ts).
 */
export const UTM_LOCALSTORAGE_KEY = "saas_clone_utm_v1";

/**
 * Cookie name for server-accessible UTM data. Prefixed with underscore
 * to signal it's an analytics/attribution cookie, not a session cookie.
 * Not prefixed with __Secure- because it needs to work on HTTP localhost.
 */
export const UTM_COOKIE_NAME = "_utm_params";

/**
 * Cookie lifetime in days. Matches the Better Auth session length (30 days)
 * so UTM data persists as long as the user's session does.
 */
const UTM_COOKIE_EXPIRY_DAYS = 30;

/* ─── URL Parsing ────────────────────────────────────────────────────── */

/**
 * Extracts UTM parameters from a URL string or the current window.location.
 *
 * Returns null if no UTM parameters are present in the URL, which means
 * the visitor arrived without campaign tracking (direct traffic, bookmark,
 * untagged referral). The caller should NOT store empty objects.
 *
 * WHY we return null instead of an empty object:
 * Downstream consumers (paywall segment matching, GA4 event enrichment)
 * need to distinguish "no UTMs captured" from "UTMs captured but all empty".
 * null means "organic/direct", an object means "tagged traffic".
 */
export function extractUtmParametersFromUrl(
  urlString?: string
): UtmParameters | null {
  if (typeof window === "undefined" && !urlString) {
    return null;
  }

  const url = new URL(urlString || window.location.href);
  const extractedParams: Record<string, string> = {};
  let foundAtLeastOneUtmParam = false;

  for (const paramName of UTM_PARAM_NAMES) {
    const rawValue = url.searchParams.get(paramName);
    if (rawValue && rawValue.trim().length > 0) {
      /**
       * Normalize to lowercase for consistent segment matching.
       * Google Ads sometimes sends utm_medium as "CPC" or "cpc" depending
       * on the campaign configuration. Normalizing here prevents the
       * paywall segment matcher from needing case-insensitive comparisons.
       */
      extractedParams[paramName] = rawValue.trim().toLowerCase();
      foundAtLeastOneUtmParam = true;
    }
  }

  return foundAtLeastOneUtmParam ? (extractedParams as UtmParameters) : null;
}

/* ─── localStorage Persistence ───────────────────────────────────────── */

/**
 * Reads stored UTM parameters from localStorage.
 *
 * Returns null if no UTMs have been stored (first visit without UTMs,
 * or storage was cleared). Callers should treat null as "organic/direct".
 *
 * WHY try/catch:
 * localStorage can throw in private browsing mode on some older browsers
 * (notably iOS Safari < 15). We fail silently because UTM capture is a
 * nice-to-have, not a critical path.
 */
export function readStoredUtmParameters(): UtmParameters | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedJson = window.localStorage.getItem(UTM_LOCALSTORAGE_KEY);
    if (!storedJson) {
      return null;
    }

    const parsed = JSON.parse(storedJson) as UtmParameters;

    /**
     * Validate that the parsed object has at least one UTM field.
     * Protects against corrupted localStorage data returning an empty object
     * that would be mistaken for "has attribution".
     */
    const hasAnyUtm = UTM_PARAM_NAMES.some(
      (key) => parsed[key] && parsed[key]!.length > 0
    );

    return hasAnyUtm ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Writes UTM parameters to localStorage.
 *
 * FIRST-TOUCH RULE: This function does NOT check for existing data.
 * The caller (captureUtmFromCurrentUrl) must enforce first-touch by
 * checking readStoredUtmParameters() before calling this.
 */
export function writeUtmParametersToLocalStorage(
  utmParams: UtmParameters
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      UTM_LOCALSTORAGE_KEY,
      JSON.stringify(utmParams)
    );
  } catch {
    /**
     * Silently fail — quota exceeded or private browsing.
     * The cookie fallback still works.
     */
  }
}

/* ─── Cookie Persistence ─────────────────────────────────────────────── */

/**
 * Writes UTM parameters as a JSON-encoded cookie.
 *
 * WHY cookies in addition to localStorage:
 * Server-side code (Next.js API routes, middleware) cannot read localStorage.
 * The Stripe checkout route needs UTM data to attach as metadata, and the
 * paywall middleware may need to read traffic source for server-rendered
 * paywall decisions.
 *
 * Cookie attributes:
 * - path=/: accessible on all routes
 * - max-age: 30 days in seconds
 * - SameSite=Lax: prevents CSRF while allowing top-level navigations
 *   (so the cookie survives redirect-back from OAuth or Stripe checkout)
 * - NOT Secure-prefixed: needs to work on localhost during development
 */
export function writeUtmParametersToCookie(utmParams: UtmParameters): void {
  if (typeof document === "undefined") {
    return;
  }

  const maxAgeSeconds = UTM_COOKIE_EXPIRY_DAYS * 24 * 60 * 60;
  const encodedValue = encodeURIComponent(JSON.stringify(utmParams));

  document.cookie = `${UTM_COOKIE_NAME}=${encodedValue}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

/**
 * Reads UTM parameters from the cookie.
 *
 * Used by client-side code as a fallback when localStorage is unavailable,
 * and by server-side code (pass the raw cookie string from request headers).
 *
 * @param rawCookieString - Optional raw Cookie header value for server-side use.
 *   If omitted, reads from document.cookie (client-side).
 */
export function readUtmParametersFromCookie(
  rawCookieString?: string
): UtmParameters | null {
  const cookieSource =
    rawCookieString ??
    (typeof document !== "undefined" ? document.cookie : "");

  if (!cookieSource) {
    return null;
  }

  /**
   * Parse the cookie string to find our UTM cookie.
   * Cookie strings are semicolon-separated "name=value" pairs.
   */
  const cookies = cookieSource.split(";").map((c) => c.trim());
  const utmCookie = cookies.find((c) => c.startsWith(`${UTM_COOKIE_NAME}=`));

  if (!utmCookie) {
    return null;
  }

  try {
    const encodedValue = utmCookie.substring(UTM_COOKIE_NAME.length + 1);
    const parsed = JSON.parse(decodeURIComponent(encodedValue)) as UtmParameters;

    const hasAnyUtm = UTM_PARAM_NAMES.some(
      (key) => parsed[key] && parsed[key]!.length > 0
    );

    return hasAnyUtm ? parsed : null;
  } catch {
    return null;
  }
}

/* ─── Main Capture Function ──────────────────────────────────────────── */

/**
 * The primary capture function — call once on first page load.
 *
 * FLOW:
 * 1. Extract UTM params from the current URL
 * 2. If no UTMs in URL, do nothing (visitor is organic/direct)
 * 3. Check if we already have stored UTMs (first-touch rule)
 * 4. If no existing UTMs, persist to both localStorage and cookie
 * 5. Return the captured (or previously stored) UTMs for immediate use
 *
 * FIRST-TOUCH ATTRIBUTION:
 * If UTMs already exist in storage, we do NOT overwrite them.
 * The rationale: the first channel that brought the user to the site
 * deserves the credit. GA4 handles session-level / last-touch attribution
 * natively, so we don't need to duplicate that here.
 *
 * RETURNS:
 * The effective UTM parameters (either freshly captured or previously stored),
 * or null if the user has never arrived via a tagged URL.
 */
export function captureUtmFromCurrentUrl(): UtmParameters | null {
  const urlUtmParams = extractUtmParametersFromUrl();
  const existingStoredUtmParams = readStoredUtmParameters();

  /**
   * First-touch rule: if we already have attribution data, keep it.
   * Return the existing data so the caller can use it immediately
   * (e.g., for segment matching or GA4 enrichment).
   */
  if (existingStoredUtmParams) {
    return existingStoredUtmParams;
  }

  /**
   * No URL UTMs and no stored UTMs = organic/direct visitor.
   * Nothing to capture or return.
   */
  if (!urlUtmParams) {
    return null;
  }

  /**
   * New tagged visitor — persist to both stores.
   * Cookie goes first because it's the more reliable store
   * (localStorage can fail in private browsing on some browsers).
   */
  writeUtmParametersToCookie(urlUtmParams);
  writeUtmParametersToLocalStorage(urlUtmParams);

  return urlUtmParams;
}

/* ─── GA4 Event Helper ───────────────────────────────────────────────── */

/**
 * Sends a GA4 event with UTM parameters attached as custom event parameters.
 *
 * WHY: GA4 captures UTMs on the first hit automatically, but custom events
 * fired later (paywall_shown, paywall_converted) don't carry the original
 * UTMs. By attaching stored UTMs to these events, we can build GA4 reports
 * that show "paywall conversion rate by acquisition source" without needing
 * BigQuery exports.
 *
 * GA4 CUSTOM PARAMETERS:
 * These show up in the GA4 Events > Parameters panel. You must register them
 * as custom dimensions in the GA4 admin (Admin > Custom definitions > Create)
 * for them to appear in reports. Registration is a one-time manual step per
 * GA4 property.
 *
 * @param eventName - GA4 event name (e.g., "paywall_shown", "generation_completed")
 * @param additionalParams - Any extra event parameters beyond UTMs
 */
export function sendGa4EventWithUtmAttribution(
  eventName: string,
  additionalParams?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") {
    return;
  }

  /**
   * Access gtag via bracket notation to avoid TypeScript conflicts with the
   * global Window augmentation in GoogleAnalytics.tsx. Both files declare
   * window.gtag but with slightly different signatures; bracket access
   * sidesteps the conflict cleanly.
   */
  const gtagFn = (window as unknown as Record<string, unknown>)["gtag"];
  if (typeof gtagFn !== "function") {
    return;
  }

  const storedUtms = readStoredUtmParameters();

  /**
   * Build the event parameter object. UTM fields are prefixed with "acq_"
   * (acquisition) to avoid colliding with GA4's built-in utm_* dimensions
   * which are session-scoped and auto-populated. Our acq_* fields are
   * event-scoped, representing the FIRST-TOUCH source.
   */
  const eventParams: Record<string, string | number | boolean> = {
    ...additionalParams,
  };

  if (storedUtms) {
    if (storedUtms.utm_source) eventParams.acq_source = storedUtms.utm_source;
    if (storedUtms.utm_medium) eventParams.acq_medium = storedUtms.utm_medium;
    if (storedUtms.utm_campaign)
      eventParams.acq_campaign = storedUtms.utm_campaign;
    if (storedUtms.utm_content)
      eventParams.acq_content = storedUtms.utm_content;
    if (storedUtms.utm_term) eventParams.acq_term = storedUtms.utm_term;
  }

  gtagFn("event", eventName, eventParams);
}

/* ─── Stripe Metadata Helper ─────────────────────────────────────────── */

/**
 * Formats stored UTM parameters for Stripe checkout session metadata.
 *
 * Stripe metadata has a 500-character limit per value, so we store
 * individual UTM fields as separate metadata keys rather than one JSON blob.
 * This also makes Stripe Dashboard filtering easier (filter by metadata.utm_source).
 *
 * CALLED BY:
 * - src/app/api/stripe/checkout/route.ts — attaches these to the checkout
 *   session metadata so every subscriber has their acquisition source recorded
 *   in Stripe, enabling per-channel LTV and ROAS analysis directly in Stripe
 *   Dashboard or via the Stripe API.
 *
 * @param utmParams - UTM parameters to format, or null for organic traffic
 * @returns Record suitable for Stripe metadata (all values are strings)
 */
export function formatUtmParametersForStripeMetadata(
  utmParams: UtmParameters | null
): Record<string, string> {
  if (!utmParams) {
    return { acquisition_channel: "organic" };
  }

  const metadata: Record<string, string> = {};

  if (utmParams.utm_source) metadata.utm_source = utmParams.utm_source;
  if (utmParams.utm_medium) metadata.utm_medium = utmParams.utm_medium;
  if (utmParams.utm_campaign) metadata.utm_campaign = utmParams.utm_campaign;
  if (utmParams.utm_content) metadata.utm_content = utmParams.utm_content;
  if (utmParams.utm_term) metadata.utm_term = utmParams.utm_term;

  /**
   * Composite acquisition_channel for quick Stripe Dashboard filtering.
   * Format: "source / medium" (matches GA4's default channel grouping display).
   */
  metadata.acquisition_channel = [
    utmParams.utm_source || "direct",
    utmParams.utm_medium || "none",
  ].join(" / ");

  return metadata;
}
