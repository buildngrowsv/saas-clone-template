# Cookie consent + GA4 Consent Mode — fleet rollout

**BridgeMind:** AI Tool Competitor Cloning Factory — `cac0ad1f-41bc-4d56-85b3-650d062abe68`  
**Template source:** `Github/saas-clone-template`

---

## What ships in the template

| Piece | Location |
|-------|----------|
| Consent Mode defaults (denied before config) | `src/components/GoogleAnalytics.tsx` |
| `wait_for_update: 500` | Same (gives client time to replay stored choice) |
| Banner (Accept / Reject) + Privacy link | `src/components/CookieConsent.tsx` → `CookieConsentBanner.tsx` |
| Public GA env (`G-…` ID) | `src/lib/ga4-public-env.ts` (`NEXT_PUBLIC_GA_MEASUREMENT_ID` or `NEXT_PUBLIC_GA_ID`) |
| localStorage persistence | `src/lib/cookie-consent-storage.ts` |
| Footer “Cookie preferences” | `src/components/CookiePreferencesLink.tsx` |

---

## Per-clone rollout (each deployed SKU)

1. Set **`NEXT_PUBLIC_GA_MEASUREMENT_ID`** or **`NEXT_PUBLIC_GA_ID`** in production (Symply GA4 property). Same `G-XXXXXXXXXX` value; do not set both to different IDs.
2. Merge or copy the template files above into the child repo if it predates this change.
3. In **`STATUS.md`**, add one line: *Cookie consent + GA4 Consent Mode: default denied until Accept; banner when GA ID present; see `docs/COOKIE-CONSENT-AND-GA4-FLEET-ROLLOUT.md`.*
4. Confirm **Privacy Policy** mentions analytics cookies (template includes `/privacy-policy`).
5. Smoke: load site with GA ID → banner shows → Accept → Network shows GA requests with consent; Reject → no `analytics_storage` grant.

---

## GDPR / directory stance (summary)

- Non-essential analytics cookies are **not** granted until explicit Accept.
- Reject persists and suppresses repeat prompts (localStorage).
- Users can reopen via **Cookie preferences** in the footer.

This is **not** legal advice; coordinators validate copy per jurisdiction and product.
