/**
 * Lazy Stripe client — avoids crashing at build time when STRIPE_SECRET_KEY is missing.
 *
 * WHY LAZY INITIALIZATION:
 * Stripe's SDK requires the secret key at construction time. During Next.js builds,
 * environment variables are not available (they're only injected at runtime on Vercel).
 * If we created the Stripe instance at module-load time with `new Stripe(process.env.STRIPE_SECRET_KEY!)`,
 * it would either crash the build or pass `undefined` to the constructor, causing
 * a confusing runtime error about invalid API keys.
 *
 * The lazy singleton pattern solves this: the Stripe client is only created on first
 * use (when an API route actually needs it), by which point env vars are available.
 * If the env var is still missing at runtime, we throw a clear error message.
 *
 * IMPORTED BY:
 * - src/app/api/stripe/checkout-session/route.ts (create checkout sessions)
 * - src/app/api/stripe/webhook/route.ts (verify webhook signatures, retrieve subscriptions)
 *
 * SETUP:
 * 1. Create a Stripe account at https://stripe.com
 * 2. Get your Secret Key from Dashboard > Developers > API Keys
 * 3. Add STRIPE_SECRET_KEY to your .env.local
 * 4. For webhooks: create a webhook endpoint in Stripe Dashboard pointing to
 *    https://yourdomain.com/api/stripe/webhook
 * 5. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local
 */
import Stripe from "stripe";

/**
 * Private singleton — holds the created Stripe instance.
 * null until first access at runtime.
 */
let _stripe: Stripe | null = null;

/**
 * Get or create the Stripe client singleton.
 *
 * Validates that STRIPE_SECRET_KEY exists and throws a developer-friendly
 * error if it's missing, rather than passing undefined to the Stripe constructor
 * which would produce a cryptic "Invalid API Key" error at call time.
 *
 * @returns Configured Stripe client instance
 * @throws Error if STRIPE_SECRET_KEY is not set
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "[stripe] STRIPE_SECRET_KEY environment variable is not set. " +
        "Set it in your .env.local or Vercel dashboard."
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      /**
       * Pin the API version to avoid breaking changes from Stripe version bumps.
       * Update this when you're ready to migrate to a newer API version.
       */
      apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}
