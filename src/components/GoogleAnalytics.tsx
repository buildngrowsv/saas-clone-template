/**
 * GA4 analytics loader for Next.js App Router templates.
 *
 * HOW IT WORKS:
 * - Load the gtag.js script only after the page is interactive.
 * - Set consent default to 'denied' BEFORE gtag('config') — GDPR / Consent Mode stance.
 *   `CookieConsentBanner` calls `gtag('consent', 'update', …)` on Accept (or replays from localStorage).
 *   `wait_for_update` gives the client a short window to apply a stored choice before hits finalize.
 * - Initialize GA4 using `getPublicGaMeasurementIdForClient()` (NEXT_PUBLIC_GA_MEASUREMENT_ID
 *   or legacy NEXT_PUBLIC_GA_ID — see `ga4-public-env.ts`).
 * - Send page_view hits whenever the pathname changes.
 *
 * CONSENT ORDER (CRITICAL — T190, Builder 3, 2026-04-04):
 * gtag('consent', 'default', { denied }) MUST run before gtag('config').
 * If config runs first, GA4 sets cookies immediately, violating GDPR.
 * Reviewer 5 caught this bug in 4 clones during the pane1775 audit.
 *
 * WHY THIS PATTERN:
 * The template can be cloned and deployed across many projects while keeping
 * analytics integration standardized and centrally controlled through env vars.
 */
"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { getPublicGaMeasurementIdForClient } from "@/lib/ga4-public-env";

type GoogleAnalyticsProps = {
  trackingId: string;
};

function sendPageView(trackingId: string, pathname: string) {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("config", trackingId, {
      page_path: pathname || "/",
    });
  }
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics({ trackingId }: GoogleAnalyticsProps) {
  const pathname = usePathname();

  useEffect(() => {
    sendPageView(trackingId, pathname);
  }, [trackingId, pathname]);

  if (!trackingId) {
    return null;
  }

  return (
    <>
      <Script
        id="google-gtag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingId}`}
      />
      <Script id="google-ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag("consent", "default", {
            analytics_storage: "denied",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied",
            personalization_storage: "denied",
            functionality_storage: "granted",
            security_storage: "granted",
            wait_for_update: 500
          });
          gtag("js", new Date());
          gtag("config", "${trackingId}");
        `}
      </Script>
    </>
  );
}

export default function GoogleAnalyticsLoader() {
  const trackingId = getPublicGaMeasurementIdForClient();

  if (!trackingId) {
    return null;
  }

  return <GoogleAnalytics trackingId={trackingId} />;
}
