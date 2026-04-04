/**
 * GA4 measurement ID resolution for **browser-exposed** Next.js env vars.
 *
 * WHY TWO VARIABLE NAMES:
 * - **`NEXT_PUBLIC_GA_MEASUREMENT_ID`** is the explicit name we prefer in this template
 *   because it matches Google’s own wording (“Measurement ID”) and avoids confusion with
 *   other Google IDs.
 * - **`NEXT_PUBLIC_GA_ID`** appears across older Symply portfolio repos (e.g. banananano2pro)
 *   and some clone SKUs. Coordinator task T018 required honoring it so we do not force a
 *   fleet-wide rename just to show the cookie banner.
 *
 * PRECEDENCE:
 * - If both are set, `NEXT_PUBLIC_GA_MEASUREMENT_ID` wins (template-native convention).
 *
 * WHERE USED:
 * - `GoogleAnalytics.tsx` — only loads gtag when a non-empty ID exists.
 * - `CookieConsentBanner.tsx` / `CookiePreferencesLink.tsx` — banner and footer link only
 *   when GA is configured; otherwise we show nothing (no consent UX without analytics).
 *
 * NEXT.JS NOTE:
 * - Both env keys must remain literal `process.env.NEXT_PUBLIC_*` reads so the bundler
 *   inlines them for the client bundle; do not hide them behind dynamic key lookup.
 */

/**
 * Returns the GA4 Measurement ID string (e.g. `G-XXXXXXXXXX`) for gtag config, or "".
 */
export function getPublicGaMeasurementIdForClient(): string {
  const primary = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const legacyGaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return primary || legacyGaId || "";
}

/**
 * True when either supported public env var supplies a non-empty measurement ID.
 */
export function isPublicGaMeasurementConfigured(): boolean {
  return getPublicGaMeasurementIdForClient().length > 0;
}
