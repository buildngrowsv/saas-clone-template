/**
 * Product configuration — pricing plans, credit packs, features, and business logic.
 *
 * WHY THIS FILE EXISTS:
 * This separates product/business configuration from site branding (site.ts).
 * When you clone this template, you customize site.ts for branding and this file
 * for your specific pricing, features, and credit system.
 *
 * PRICING ARCHITECTURE:
 * This template uses a credits-based system where:
 * 1. Users purchase credits via subscription (monthly allocation) or one-time packs
 * 2. Each action/generation costs a configurable number of credits
 * 3. Credits are tracked in the database with a full transaction ledger
 *
 * This is more flexible than feature-gating (free/pro/enterprise) because you can
 * price individual features differently and users pay proportional to usage.
 *
 * STRIPE INTEGRATION:
 * Stripe Price IDs are stored in NEXT_PUBLIC_STRIPE_PRICE_* environment variables.
 * They use the NEXT_PUBLIC_ prefix because the pricing page is a client component
 * that needs to pass the price ID to the checkout API. Stripe Price IDs are NOT
 * secrets — the secret is STRIPE_SECRET_KEY.
 *
 * IMPORTED BY:
 * - src/app/(main)/page.tsx (feature cards, pricing preview on landing page)
 * - src/app/(main)/pricing/page.tsx (full pricing page with checkout)
 * - src/lib/credits.ts (credit costs per action)
 * - src/app/api/stripe/webhook/route.ts (credit allocations on purchase/renewal)
 */

/**
 * SUBSCRIPTION PLANS
 *
 * Each plan maps to a Stripe recurring price. The `priceIdEnvKey` points to
 * the env var holding the Stripe Price ID. Create these in Stripe Dashboard:
 *   1. Create a Product (e.g., "Basic Plan")
 *   2. Add a recurring price ($X/month)
 *   3. Add metadata: { plan: "basic" } to the Price
 *   4. Copy the price_xxx ID to your .env.local
 *
 * The `popular` flag highlights one plan with a badge and colored border.
 * The `credits` field is the monthly credit allocation (renewed on invoice.payment_succeeded).
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    name: "Basic",
    priceMonthly: 9.99,
    credits: 500,
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY",
    description: "Perfect for getting started",
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    priceMonthly: 29.99,
    credits: 2000,
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_STANDARD_MONTHLY",
    description: "Best value for regular users",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 99.99,
    credits: 10000,
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY",
    description: "For power users and teams",
    popular: false,
  },
] as const;

/**
 * CREDIT PACKS
 *
 * One-time purchases for users who don't want a subscription.
 * Each maps to a Stripe one-time price (mode: "payment").
 * Credits from packs never expire.
 *
 * Create these in Stripe Dashboard:
 *   1. Create a Product (e.g., "Starter Credit Pack")
 *   2. Add a one-time price ($X)
 *   3. Add metadata: { pack_type: "starter" } to the Price
 *   4. Copy the price_xxx ID to your .env.local
 */
export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter",
    price: 19.99,
    credits: 1000,
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_STARTER_PACK",
  },
  {
    id: "growth",
    name: "Growth",
    price: 49.99,
    credits: 4000,
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_GROWTH_PACK",
  },
  {
    id: "professional",
    name: "Professional",
    price: 99.99,
    credits: 12000,
    priceIdEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL_PACK",
  },
] as const;

/**
 * PLAN CREDITS MAP
 *
 * Used by the Stripe webhook handler to determine how many credits to allocate
 * when a subscription payment succeeds. The key must match the `plan` metadata
 * on the Stripe Price object.
 *
 * IMPORTANT: Keep these in sync with the SUBSCRIPTION_PLANS array above.
 * If you change the credits in a plan, update both places.
 */
export const PLAN_CREDITS_ALLOCATION: Record<string, number> = {
  basic: 500,
  standard: 2000,
  pro: 10000,
};

/**
 * PACK CREDITS MAP
 *
 * Used by the Stripe webhook handler to determine how many credits to allocate
 * for one-time pack purchases. The key must match the `pack_type` metadata
 * on the Stripe Price object.
 */
export const PACK_CREDITS_ALLOCATION: Record<string, number> = {
  starter: 1000,
  growth: 4000,
  professional: 12000,
};

/**
 * ACTION CREDIT COSTS
 *
 * Maps action slugs to their credit cost. Customize this for your product.
 * For example, if your SaaS generates documents:
 *   "generate-report": 10,
 *   "export-pdf": 5,
 *   "ai-summary": 15,
 *
 * The template comes with placeholder actions — replace with your own.
 * These are imported by src/lib/credits.ts for deduction logic.
 */
export const ACTION_CREDIT_COSTS: Record<string, number> = {
  /** Example: a basic action costs 5 credits */
  "basic-action": 5,
  /** Example: a standard action costs 10 credits */
  "standard-action": 10,
  /** Example: a premium action costs 25 credits */
  "premium-action": 25,
};

/**
 * FEATURES LIST
 *
 * Displayed on the landing page in the features grid section.
 * Each feature has an icon name (from lucide-react), title, and description.
 *
 * The icon is referenced by string name here and resolved in the component
 * because lucide-react icons can't be serialized in a config module that
 * might be imported in both server and client contexts.
 */
export const PRODUCT_FEATURES = [
  {
    iconName: "Zap",
    title: "Lightning Fast",
    description: "Built on Next.js 16 with React 19 for blazing fast page loads and interactions.",
  },
  {
    iconName: "Shield",
    title: "Secure Authentication",
    description: "Google OAuth via Better Auth with session management and middleware protection.",
  },
  {
    iconName: "CreditCard",
    title: "Stripe Payments",
    description: "Subscriptions and one-time purchases with automatic credit allocation via webhooks.",
  },
  {
    iconName: "Database",
    title: "Serverless Database",
    description: "Neon Postgres with Drizzle ORM. Type-safe queries with zero cold-start overhead.",
  },
  {
    iconName: "Cloud",
    title: "Cloud Storage",
    description: "Cloudflare R2 with presigned uploads. Users upload directly to storage, no server bottleneck.",
  },
  {
    iconName: "Coins",
    title: "Credits System",
    description: "Flexible usage-based billing. Users buy credits via subscription or packs, spend per action.",
  },
] as const;

/**
 * VALUE PROPOSITIONS
 *
 * Three value props displayed prominently on the landing page.
 * These should answer "Why choose this product over alternatives?"
 */
export const VALUE_PROPOSITIONS = [
  {
    iconName: "Rocket",
    title: "Ship in Days, Not Months",
    description: "All the infrastructure you need is already built. Auth, payments, database, storage — just add your product logic.",
  },
  {
    iconName: "Code",
    title: "Developer Friendly",
    description: "Clean TypeScript codebase with copious comments. Every file explains what it does, why, and how it connects to the rest.",
  },
  {
    iconName: "TrendingUp",
    title: "Built to Scale",
    description: "Serverless-first architecture. Neon Postgres, Cloudflare R2, and Vercel handle scaling automatically.",
  },
] as const;

/**
 * FAQ ITEMS
 *
 * Displayed on the landing page to address common objections.
 * Customize these for your specific product.
 */
export const FAQ_ITEMS = [
  {
    question: "What are credits?",
    answer: "Credits are the currency for using features on our platform. Each action consumes credits based on its complexity. Subscriptions give you monthly credits, and you can buy additional credit packs anytime.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Subscriptions renew monthly but you can cancel at any time. You'll keep access until the end of your current billing period.",
  },
  {
    question: "Do unused credits roll over?",
    answer: "Subscription credits reset each billing cycle. Credits purchased from credit packs never expire and carry over indefinitely.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use industry-standard encryption, secure authentication via OAuth, and your data is stored in SOC 2 compliant infrastructure.",
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer refunds within 7 days for first-time subscribers if you're not satisfied. Credit packs are non-refundable once credits are used.",
  },
] as const;

/**
 * TESTIMONIALS
 *
 * Displayed on the landing page for social proof.
 * Replace these with real testimonials from your users.
 * If you don't have testimonials yet, you can hide this section by
 * setting SHOW_TESTIMONIALS to false.
 */
export const SHOW_TESTIMONIALS = false;

export const TESTIMONIALS = [
  {
    quote: "This platform completely transformed how we work. What used to take days now takes minutes.",
    name: "Jane Smith",
    title: "CTO",
    company: "Acme Corp",
  },
  {
    quote: "The best developer experience I've encountered. Clean code, great docs, and it just works.",
    name: "John Doe",
    title: "Lead Developer",
    company: "TechStart",
  },
  {
    quote: "We shipped our MVP in a weekend using this template. The Stripe integration alone saved us weeks.",
    name: "Alex Johnson",
    title: "Founder",
    company: "LaunchPad",
  },
] as const;

/**
 * Resolve Stripe Price ID from environment variable.
 *
 * WHY THIS FUNCTION:
 * Price IDs use NEXT_PUBLIC_ prefix so they're available in client components
 * (the pricing page needs them to call the checkout API). Stripe Price IDs
 * are not secrets — the actual secret is STRIPE_SECRET_KEY which is server-only.
 *
 * @param envKey - The environment variable name, e.g., "NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY"
 * @returns The Stripe Price ID string, or undefined if not set
 */
export function getStripePriceId(envKey: string): string | undefined {
  return process.env[envKey];
}
