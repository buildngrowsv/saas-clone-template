/**
 * Cookie + analytics consent banner — pairs with GA4 Consent Mode in `GoogleAnalytics.tsx`.
 *
 * PRODUCT / COMPLIANCE STORY:
 * - Directory listings and EU visitors expect a visible choice before non-essential cookies.
 * - We only gate **Google Analytics** (measurement) here; auth/session cookies are separate
 *   and documented in Privacy Policy. This matches the BridgeMind task: default denied until accept.
 *
 * FLOW:
 * 1. If no GA4 measurement ID is set in public env (see `ga4-public-env.ts`), we render nothing.
 * 2. On first visit, show a fixed bottom bar: Accept / Reject + Privacy Policy link.
 * 3. Accept → `gtag('consent', 'update', { analytics_storage: 'granted' })` + localStorage.
 * 4. Reject → keep denied + localStorage so we do not nag on every page load.
 * 5. Returning users: read localStorage in `useEffect` and call `update` immediately so hits
 *    align with their prior choice (still after gtag loads — `wait_for_update` in GA script helps).
 *
 * RE-OPEN FROM FOOTER:
 * - `CookiePreferencesLink` dispatches `cookie-consent:open` on the window; we listen here
 *   so users can change their mind without clearing site data.
 *
 * DEPENDENCY ORDER:
 * - Root `layout.tsx` mounts `GoogleAnalyticsLoader` **before** this component so `dataLayer`
 *   and `gtag` exist by the time effects run (both are `afterInteractive`).
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  COOKIE_CONSENT_OPEN_EVENT,
  readStoredCookieConsent,
  writeStoredCookieConsent,
  type CookieConsentChoice,
} from "@/lib/cookie-consent-storage";
import { isPublicGaMeasurementConfigured } from "@/lib/ga4-public-env";

/**
 * Applies Consent Mode v2 update for all four Google consent surfaces.
 *
 * Google Consent Mode v2 (required since March 2024 for EEA measurement)
 * needs ad_storage, ad_user_data, and ad_personalization alongside
 * analytics_storage. Even without Google Ads today, setting these correctly
 * prevents measurement gaps if ads are added later and satisfies Google's
 * Consent Mode v2 diagnostic checks.
 *
 * FIX: argon-scout-6381, 2026-04-08 — was only updating analytics_storage.
 */
function applyAnalyticsConsentToGtag(choice: CookieConsentChoice): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  const value = choice === "accepted" ? "granted" : "denied";
  window.gtag("consent", "update", {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
}

export function CookieConsentBanner() {
  const hasGa = isPublicGaMeasurementConfigured();
  const [visible, setVisible] = useState(false);

  const syncFromStorage = useCallback(() => {
    const stored = readStoredCookieConsent();
    if (stored !== null) {
      applyAnalyticsConsentToGtag(stored);
    }
    return stored;
  }, []);

  /**
   * On mount: replay stored consent so returning users get correct `update` without clicking.
   * Show banner only when GA is configured and there is no stored decision.
   */
  useEffect(() => {
    if (!hasGa) {
      return;
    }
    const stored = syncFromStorage();
    if (stored === null) {
      setVisible(true);
    }
  }, [hasGa, syncFromStorage]);

  useEffect(() => {
    if (!hasGa) {
      return;
    }
    const onOpen = () => {
      setVisible(true);
    };
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
  }, [hasGa]);

  const handleAccept = () => {
    writeStoredCookieConsent("accepted");
    applyAnalyticsConsentToGtag("accepted");
    setVisible(false);
  };

  const handleReject = () => {
    writeStoredCookieConsent("rejected");
    applyAnalyticsConsentToGtag("rejected");
    setVisible(false);
  };

  if (!hasGa || !visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie and analytics consent"
      className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none border-t border-white/10 bg-gray-950/95 px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      <div className="pointer-events-auto container mx-auto flex max-w-screen-xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-300">
          We use analytics cookies (Google Analytics) to understand traffic and improve the product.
          You can accept or reject non-essential analytics. See our{" "}
          <Link href="/privacy" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReject}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 transition hover:bg-gray-800"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}

