# SaaS Clone Template

Production-ready SaaS boilerplate with authentication, payments, database, file storage, and a credits-based billing system. Built with the latest stack: **Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui**.

## What's Included

| Feature | Implementation |
|---------|---------------|
| **Authentication** | Better Auth with Google OAuth, session management, middleware protection |
| **Payments** | Stripe Checkout (subscriptions + one-time packs), webhook handler, customer management |
| **Database** | Neon Postgres (serverless) + Drizzle ORM with type-safe queries |
| **File Storage** | Cloudflare R2 with presigned upload URLs (direct client-to-storage) |
| **Credits System** | Usage-based billing with transaction audit log, atomic deductions |
| **UI Components** | shadcn/ui (14 components), dark/light theme, responsive design |
| **Landing Page** | Hero, features grid, value props, pricing preview, FAQ, testimonials, final CTA |
| **Dashboard** | Credit balance, plan display, quick actions |
| **Pricing Page** | Subscription plans, credit packs, Stripe Checkout integration |
| **SEO** | JSON-LD structured data, meta tags, sitemap-ready, robots.txt |
| **Config-Driven** | All branding in `site.ts`, all product config in `product.ts` |

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-username/saas-clone-template.git my-saas
cd my-saas
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your service credentials
```

### 3. Set up external services

**Neon Postgres:**
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the pooled connection string to `DATABASE_URL`

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add redirect URI: `http://localhost:4738/api/auth/callback/google`
4. Copy Client ID and Secret to `.env.local`

**Stripe:**
1. Create an account at [stripe.com](https://stripe.com)
2. Copy Secret Key to `STRIPE_SECRET_KEY`
3. Run `npm run stripe:setup` to create products and prices
4. Copy the output price IDs to `.env.local`
5. For local webhooks: `stripe listen --forward-to localhost:4738/api/stripe/webhook`
6. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

**Cloudflare R2** (optional — only needed if your product uses file uploads):
1. Create an R2 bucket in the Cloudflare dashboard
2. Create an API token with read/write permissions
3. Set R2 env vars in `.env.local`

### 4. Push database schema

```bash
npm run db:push
```

### 5. Run the dev server

```bash
npm run dev
# Open http://localhost:4738
```

## Customization

### Rebrand the app

Edit two files:

- **`src/config/site.ts`** — Brand name, colors, description, URLs, navigation, footer
- **`src/config/product.ts`** — Pricing plans, credit packs, features, FAQ, testimonials

The entire app reads from these configs. No need to find-and-replace across files.

### Change the color scheme

The `themeColors` object in `site.ts` controls all brand colors (gradients, accents, badges). Change it to match your brand:

```typescript
themeColors: {
  gradientFrom: "from-emerald-400",
  gradientVia: "via-teal-500",
  gradientTo: "to-emerald-600",
  // ... etc
}
```

### Add product features

1. Create your product pages in `src/app/(main)/your-feature/`
2. Add API routes in `src/app/api/your-feature/`
3. Use `deductCredits()` from `src/lib/credits.ts` for billable actions
4. Update `ACTION_CREDIT_COSTS` in `src/config/product.ts`

### Add more auth providers

1. Add the provider to `src/lib/auth.ts` > `socialProviders`
2. Set the provider's env vars
3. Add a sign-in button in `src/app/login/page.tsx`

## Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, theme, SEO)
│   ├── globals.css               # Tailwind + shadcn theme variables
│   ├── login/                    # Auth pages (no header/footer)
│   ├── (main)/                   # Route group with header/footer
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/page.tsx      # Full pricing page
│   │   └── dashboard/page.tsx    # User dashboard
│   └── api/
│       ├── auth/[...all]/        # Better Auth handler
│       ├── stripe/               # Checkout + webhook
│       ├── upload/               # R2 presigned URLs
│       └── dashboard/            # Dashboard data API
├── components/
│   ├── layout/                   # Header, Footer
│   └── ui/                       # shadcn/ui components
├── config/
│   ├── site.ts                   # Branding, colors, URLs
│   └── product.ts                # Pricing, features, FAQ
├── db/
│   ├── index.ts                  # Drizzle client (lazy singleton)
│   └── schema/                   # Database tables
├── lib/
│   ├── auth.ts                   # Better Auth server config
│   ├── auth-client.ts            # Better Auth React client
│   ├── stripe.ts                 # Stripe client (lazy singleton)
│   ├── credits.ts                # Credit management utilities
│   ├── r2.ts                     # Cloudflare R2 client
│   └── utils.ts                  # shadcn cn() utility
└── middleware.ts                  # Route protection
```

## Key Design Decisions

- **Lazy singletons** — All env-dependent clients (DB, Stripe, R2, Auth) use lazy initialization via Proxy to avoid build-time crashes
- **Credits over feature gates** — More flexible billing that scales with usage
- **Presigned uploads** — Files go directly to R2, never through serverless functions
- **Config-driven branding** — Rebrand the entire app by editing two config files
- **Copious comments** — Every file explains what, why, and how for future developers and AI agents

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui (New York style)
- **Auth**: Better Auth + Google OAuth
- **Payments**: Stripe (Checkout + Webhooks)
- **Database**: Neon Postgres + Drizzle ORM
- **Storage**: Cloudflare R2 (S3-compatible)
- **Deployment**: Vercel (optimized with vercel.json)
- **Dev Port**: 4738

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server on port 4738 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:generate` | Generate migration SQL files |
| `npm run db:migrate` | Run pending migrations |
| `npm run stripe:setup` | Create Stripe products/prices |
| `npm run env:validate` | Check all env vars are set |
| `npm run lint` | Run ESLint |
