/**
 * Cookie consent persistence — localStorage bridge for GA4 Consent Mode.
 *
 * WHY localStorage (not cookies):
 * - The banner decision is UX state; we do not need server round-trips.
 * - GA4 Consent Mode reads the choice on the client and calls `gtag('consent', 'update', …)`.
 * - Storing the string "accepted" | "rejected" lets returning visitors skip the banner while
 *   still honoring "reject" across sessions (no analytics_storage grant).
 *
 * VERSIONING:
 * - Key suffix `_v1` — if we ever change semantics, bump the key so old values do not
 *   silently mis-apply. Child clones inherit this file from the template.
 *
 * CALLED FROM:
 * - `CookieConsentBanner` on mount (read + optional immediate gtag update)
 * - Same component on Accept / Reject (write)
 *
 * GDPR / DIRECTORY STANCE:
 * - Default consent is **denied** in `GoogleAnalytics.tsx` before `gtag('config')`.
 * - Until the user accepts, analytics_storage stays denied (cookieless / modeled behavior per Google).
 */

export const COOKIE_CONSENT_STORAGE_KEY = "saas_clone_cookie_consent_v1";

export type CookieConsentChoice = "accepted" | "rejected";

/**
 * Returns the last explicit choice, or null if the user has not decided yet
 * (first visit or cleared storage).
 */
export function readStoredCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (raw === "accepted" || raw === "rejected") {
    return raw;
  }
  return null;
}

/**
 * Persists Accept or Reject so the banner does not reappear on every navigation.
 */
export function writeStoredCookieConsent(choice: CookieConsentChoice): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
}

/**
 * Custom event name so `SiteFooter` can reopen the banner without shared React context.
 * Dispatched from `CookiePreferencesLink`; listened in `CookieConsentBanner`.
 */
export const COOKIE_CONSENT_OPEN_EVENT = "cookie-consent:open";

export function dispatchOpenCookieConsent(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
}
