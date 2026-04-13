/**
 * useUtmCapture — React Hook for Capturing UTM Parameters on Page Load
 *
 * WHY THIS HOOK EXISTS:
 * UTM parameters arrive in the URL when a user clicks an ad, social post,
 * or tracked link. They're only present in the URL for that first navigation —
 * as soon as the user clicks to another page, the UTMs vanish from the URL.
 * This hook captures them on first render (before the user navigates away)
 * and persists them for the entire user journey.
 *
 * WHERE TO USE IT:
 * Add this hook to the root layout's client component (e.g., AuthSessionProvider
 * or a dedicated UtmCaptureProvider) so it runs exactly once when the app loads.
 * It's idempotent — calling it multiple times won't overwrite first-touch data
 * because the underlying captureUtmFromCurrentUrl() enforces first-touch attribution.
 *
 * WHAT IT RETURNS:
 * The stored UTM parameters (or null for organic/direct visitors). Components
 * can use this to conditionally render attribution-aware UI, but most consumers
 * should use useUsageTracking() instead, which combines UTMs with paywall logic.
 *
 * GA4 INTEGRATION:
 * On capture, this hook does NOT fire a GA4 event because GA4 already captures
 * UTMs on the initial page_view hit automatically. The sendGa4EventWithUtmAttribution()
 * utility is for CUSTOM events (paywall_shown, generation_completed) that happen
 * later in the session.
 *
 * IMPORTED BY:
 * - src/components/AuthSessionProvider.tsx (or a UtmCaptureProvider) — root-level mount
 * - Any component that needs raw UTM data (rare — prefer useUsageTracking)
 *
 * DEPENDS ON:
 * - src/lib/utm-capture.ts (captureUtmFromCurrentUrl, readStoredUtmParameters)
 */
"use client";

import { useEffect, useState } from "react";
import {
  captureUtmFromCurrentUrl,
  readStoredUtmParameters,
  type UtmParameters,
} from "@/lib/utm-capture";

/**
 * Captures UTM parameters from the URL on first render, persists them
 * to localStorage and cookie, and returns the stored attribution data.
 *
 * LIFECYCLE:
 * 1. On mount: reads any existing stored UTMs (fast, synchronous)
 * 2. In useEffect: calls captureUtmFromCurrentUrl() which:
 *    a. Checks if the current URL has UTM params
 *    b. If so and no prior attribution exists, persists them
 *    c. Returns the effective UTMs (new or previously stored)
 * 3. Updates state with the result so consuming components re-render
 *
 * WHY useState + useEffect (not useMemo):
 * UTM capture has side effects (writing to localStorage + cookie),
 * so it must run in useEffect, not during render. The initial state
 * reads from localStorage synchronously to avoid a flash of "no UTMs"
 * on pages that read the UTM data for conditional rendering.
 *
 * @returns The user's first-touch UTM parameters, or null for organic/direct traffic.
 */
export function useUtmCapture(): UtmParameters | null {
  /**
   * Initialize from localStorage synchronously to avoid UI flicker.
   * If the user previously arrived via a tagged URL, their UTMs are
   * already in localStorage and we can read them immediately.
   */
  const [capturedUtmParameters, setCapturedUtmParameters] =
    useState<UtmParameters | null>(() => readStoredUtmParameters());

  useEffect(() => {
    /**
     * Run the full capture flow: check URL, persist if new, return effective UTMs.
     * This is safe to call on every page load because:
     *   - If UTMs are already stored, it returns them without writing
     *   - If the URL has UTMs but storage already has data, first-touch wins
     *   - If there are no UTMs anywhere, it returns null
     */
    const effectiveUtmParams = captureUtmFromCurrentUrl();
    setCapturedUtmParameters(effectiveUtmParams);
  }, []);

  return capturedUtmParameters;
}
