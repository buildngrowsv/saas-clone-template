/**
 * Small client-only control so the server-rendered footer can offer "Cookie preferences"
 * without turning the entire footer into a client component.
 *
 * WHY SEPARATE FILE:
 * - Keeps `SiteFooter` as a React Server Component for static HTML + SEO.
 * - One responsibility: bridge click → `dispatchOpenCookieConsent` from `CookieConsentBanner`.
 *
 * VISIBILITY:
 * - If GA is not configured, we hide the link because there is no analytics consent to change.
 */

"use client";

import { dispatchOpenCookieConsent } from "@/lib/cookie-consent-storage";
import { isPublicGaMeasurementConfigured } from "@/lib/ga4-public-env";

export function CookiePreferencesLink() {
  const hasGa = isPublicGaMeasurementConfigured();

  if (!hasGa) {
    return null;
  }

  return (
    <>
      {" · "}
      <button
        type="button"
        onClick={() => dispatchOpenCookieConsent()}
        className="hover:text-gray-200 transition-colors"
      >
        Cookie preferences
      </button>
    </>
  );
}
