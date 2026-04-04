# SaaS Clone Template — Status

## Current State: MVP Complete (Template, Not Buyer-Ready Yet)

### Publish Readiness Warning
- Stripe checkout exists, but durable post-payment subscription fulfillment is still incomplete.
- The webhook now verifies Stripe signatures and fails closed with `503` for entitlement-changing events until real persistence and credit allocation exist.
- This template should not be described as shipping automated paid-access fulfillment yet.
- Current repo verification also surfaces auth/env debt: build warns when `BETTER_AUTH_URL` is unset and when the default `BETTER_AUTH_SECRET` is still in use.
- The repo does not currently expose an `npm test` script, and Next's build-time lint step warns that `eslint` is not installed in repo state.

The template includes all core features needed to clone an AI tool SaaS:

### Completed
- Next.js 15 project structure with TypeScript
- Tailwind CSS 4 dark theme with glassmorphism design
- NextAuth Google OAuth authentication
- Stripe subscription checkout + signature-verified webhook route
- fal.ai AI model inference integration
- Credit system with per-tier limits
- Marketing landing page (hero, how it works, demo, pricing, FAQ, footer)
- Dashboard with upload, processing, and result display
- Drag-and-drop file upload component
- Before/after result comparison component

### Cookie consent & GA4 (Compliance Mode)

- **Implementation:** `src/components/GoogleAnalytics.tsx` (Consent Mode defaults + `wait_for_update`), `CookieConsent.tsx` / `CookieConsentBanner.tsx`, `ga4-public-env.ts`, `cookie-consent-storage.ts`, footer `CookiePreferencesLink.tsx`.
- **Env:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` **or** legacy `NEXT_PUBLIC_GA_ID` — when either is set, the banner appears until the user accepts or rejects analytics; choice is stored in `localStorage`.
- **Fleet rollout (org-wide):** `Github/business-operations/general-sops/COOKIE-CONSENT-FLEET-ROLLOUT-PLAN.md` — priority list + migration. Template doc: `docs/COOKIE-CONSENT-AND-GA4-FLEET-ROLLOUT.md`.

### Not Yet Implemented (Per-Clone Tasks)
- Database integration (credits use in-memory store)
- Durable Stripe subscription persistence and webhook-driven entitlement fulfillment
- User subscription status lookup from database
- Email notifications
- Rate limiting beyond credit system

### Legal / policy pages

- Privacy Policy, Terms, and Refund routes exist under `src/app/` — replace placeholder copy per product before buyer-ready claims.

### Output quality & evals (portfolio rollout)

- **Rubric:** `docs/OUTPUT-QUALITY-MATRIX.md` — dimensions, severity, and how to score generative outputs before shipping a new SKU.
- **Scaffold:** `tests/evals/README.md` — where to drop golden inputs and expected behaviors for automated or manual eval passes.
- **Fleet note:** `PORTFOLIO-OUTPUT-QUALITY-ROLLOUT.md` (UserRoot) tracks Tier 1 repos; this template is the **source** for matrix + eval layout.

### Email onboarding (Resend / holding company)

- **Checklist:** `docs/EMAIL-ONBOARDING-CHECKLIST.md` — verified domain, `RESEND_API_KEY`, transactional flows (verify, reset, receipt), optional marketing, test procedure.
- **Do not** treat Gmail or Cloudflare Email Routing alone as “the app sends mail.” Outbound path is **Resend** per `Github/business-operations/general-sops/HOLDING-COMPANY-TRANSACTIONAL-AND-MARKETING-EMAIL-STANDARD.md`.

### Known Limitations
- Credit system resets on server restart (in-memory, not persisted)
- Subscription tier always returns "free" (no DB lookup)
- Verified Stripe entitlement events fail closed with `503` because the template does not yet persist subscription/credit state
- Better Auth still requires real `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` configuration for production-safe callbacks and sessions
- Repo verification is build-only right now; there is no first-class `npm test` script
- Demo section has placeholder images (needs real before/after per product)

## Next Action
Use this template to create the first AI tool clone. Candidate products:
1. Background Remover (fal-ai/birefnet)
2. Image Upscaler (fal-ai/clarity-upscaler)
3. QR Art Generator (fal-ai/qr-code-generator)
