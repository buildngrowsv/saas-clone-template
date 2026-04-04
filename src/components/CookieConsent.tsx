/**
 * CookieConsent — **canonical component filename** for fleet audits and Coordinator tasks (T018).
 *
 * WHY THIS FILE EXISTS:
 * - The implementation and UX live in `CookieConsentBanner.tsx` (older name, still accurate:
 *   it is a bottom banner). We keep that file as the single source of truth for behavior
 *   (localStorage, gtag consent updates, footer-driven reopen).
 * - Import **`CookieConsent`** from here in `layout.tsx` so documentation and quality gates
 *   can point at one stable path: `src/components/CookieConsent.tsx`.
 *
 * COMPLIANCE:
 * - Pairs with `GoogleAnalytics.tsx`: default `analytics_storage: denied` before `config`,
 *   then `gtag('consent','update',…)` on Accept. See Gate 8 notes in clone-factory-quality-gates.
 */

export { CookieConsentBanner as CookieConsent } from "./CookieConsentBanner";
