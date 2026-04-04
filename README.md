# SaaS Clone Template — AI Tool Wrapper

A production-ready Next.js 15 template for building AI tool SaaS products. Includes authentication, payments, credit system, and fal.ai integration out of the box.

## What This Template Includes

- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS 4** with dark theme and glassmorphism design
- **NextAuth** with Google OAuth
- **Stripe** subscription billing (Free / Basic $4.99 / Pro $9.99)
- **fal.ai** serverless AI inference
- **Credit system** with per-tier limits (3/day free, 50/month basic, unlimited pro)
- **Marketing-polished landing page** with hero, pricing, FAQ, footer

## Quick Start — Clone a New AI Tool

1. **Copy this template:**
   ```bash
   cp -r saas-clone-template/ my-new-ai-tool/
   cd my-new-ai-tool/
   ```

2. **Update product config** — edit `src/lib/config.ts`:
   - Change `name`, `tagline`, `description`
   - Set `falModelIdentifier` to your fal.ai model
   - Adjust pricing if needed

3. **Customize the generation route** — edit `src/app/api/generate/route.ts`:
   - Update the fal.ai input parameters for your model
   - Update the result extraction logic if the model returns differently

4. **Set environment variables** — copy `.env.example` to `.env.local` and fill in:
   - Google OAuth credentials
   - Stripe API keys and Price IDs
   - fal.ai API key
   - NextAuth secret

5. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:4837

6. **Deploy to Vercel:**
   ```bash
   npx vercel
   ```

## File Structure

```
src/
  app/
    page.tsx                    # Landing page
    layout.tsx                  # Root layout with auth provider
    dashboard/page.tsx          # Tool interface (upload → process → download)
    api/
      auth/[...nextauth]/       # NextAuth OAuth handler
      stripe/checkout/           # Stripe checkout session creation
      stripe/webhook/            # Stripe webhook handler
      generate/                  # AI generation endpoint (customize this)
  lib/
    config.ts                   # Product configuration (customize this)
    auth.ts                     # NextAuth options
    stripe.ts                   # Stripe client
    credits.ts                  # Credit/usage tracking
  components/
    AuthSessionProvider.tsx     # NextAuth client provider wrapper
    LandingHero.tsx            # Hero section
    LandingDemoSection.tsx     # Before/after demo area
    LandingFaqSection.tsx      # FAQ accordion
    LandingFooter.tsx          # Footer with legal links
    PricingCards.tsx            # 3-tier pricing cards
    UploadZone.tsx             # Drag-and-drop file upload
    ResultDisplay.tsx          # Before/after result comparison
```

## Customization Checklist

- [ ] Edit `src/lib/config.ts` — product name, tagline, fal.ai model
- [ ] Edit `src/app/api/generate/route.ts` — model-specific parameters
- [ ] Add demo images to `public/demo-before.png` and `public/demo-after.png`
- [ ] Create Stripe products/prices and set env vars
- [ ] Create Google OAuth credentials and set env vars
- [ ] Get fal.ai API key and set env var
- [ ] Add Terms of Service page (`src/app/terms/page.tsx`)
- [ ] Add Privacy Policy page (`src/app/privacy/page.tsx`)
- [ ] Add favicon and Open Graph image to `public/`
- [ ] Deploy to Vercel

## Ship quality, email, and compliance (clone factory)

Before launch-ready language in marketing or **`STATUS.md`**, align with the holding-company and fleet gates:

| Topic | Where |
|-------|--------|
| **Output quality & personas** | `docs/OUTPUT-QUALITY-MATRIX.md` (copy to child repo; customize §1–§2.1) |
| **Eval assets** | `tests/evals/README.md` — golden prompts, rubric, gallery manifest |
| **Transactional email (Resend)** | `docs/EMAIL-ONBOARDING-CHECKLIST.md` |
| **Repo truth** | Root **`STATUS.md`** — links the above and current limitations |

**Rules (UserRoot):** `clone-factory-quality-gates.md` · `ui-testing-and-launch-readiness.md` · `holding-company-email-deliverability.md` (via business-operations).

## Dev Server

```bash
npm run dev    # Starts on port 4837
```
