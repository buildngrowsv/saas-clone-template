# Template Drift Audit — saas-clone-template vs ai-background-remover (gold)

**Audited by:** atlas-7842 | **Date:** 2026-04-05 | **BridgeMind:** CLF-04

## Critical Findings (upstream to template)

### 1. Rate Limiting: In-memory Map vs Upstash Redis (HIGH)
- **Template:** In-memory Map resets on Vercel cold start — not production-safe
- **Clone:** `@upstash/ratelimit` + `@upstash/redis` for durable limits with graceful in-memory fallback
- **File:** `ai-background-remover/app/lib/server-ip-rate-limiter.ts` (254 lines)
- **Action:** Add Upstash as optional dependency; keep in-memory as default fallback

### 2. Stripe SDK vs Direct Fetch (HIGH)
- **Template:** Uses `stripe` npm SDK
- **Clone:** Uses direct `fetch()` to Stripe REST API — documents SDK reliability failures on Vercel serverless
- **File:** `ai-background-remover/app/lib/vendors/stripe.ts` (169 lines) — timeout + retry logic
- **Action:** Document SDK issue; offer fetch pattern as alternative

### 3. Request Validation with Zod (MEDIUM)
- **Template:** Manual validation
- **Clone:** `zod` schemas in `app/lib/contracts/stripe-checkout.ts` (65 lines)
- **Action:** Add zod to template package.json; create contracts/ directory

### 4. Token-Based Pro Subscriptions (MEDIUM)
- **Clone:** Redis-backed token lifecycle (pending→active→cancelled) without auth DB
- **File:** `ai-background-remover/app/lib/subscription-store.ts` (201 lines)
- **Action:** Document as alternative to credit-based model for auth-optional products

### 5. fal.ai CDN Pattern (LOW)
- **Template:** `fal.media` + `**.fal.ai`
- **Clone:** adds `v3.fal.media` (newer CDN endpoint)
- **Action:** Add `v3.fal.media` to template remotePatterns

## Dependency Gaps

| Package | Template | Clone | Priority |
|---------|----------|-------|----------|
| `@upstash/ratelimit` | missing | ^2.0.8 | HIGH |
| `@upstash/redis` | missing | ^1.37.0 | HIGH |
| `zod` | missing | ^3.25.76 | MEDIUM |
| `stripe` SDK | ^17.5.0 | not used | Consider replacing |
| `next` | ^15.2.0 | ^15.5.14 | Update template |
| `react` | ^19.0.0 | ^19.1.0 | Update template |
| `@fal-ai/client` | ^1.2.0 | ^1.3.0 | Update template |

## Architecture Divergence

- **Template:** Auth-first (Better Auth + Google OAuth), credit-based usage
- **Clone:** Auth-optional, IP rate-limited free tier, token-based Pro tier
- Both valid — template is feature-complete, clone is leaner for quick iteration

## Not Recommended to Upstream
- `next-intl` — clone-specific i18n routing
- Token model requires hybrid approach with template's existing Better Auth
