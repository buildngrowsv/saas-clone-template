/**
 * Stripe Client Initialization
 * 
 * WHY: Stripe handles all payment processing for our SaaS subscriptions.
 * We initialize a single Stripe instance here and export it so all API routes
 * can share the same client. This avoids creating multiple Stripe instances
 * (each of which opens its own connection pool).
 * 
 * IMPORTANT: This file should ONLY be imported in server-side code (API routes,
 * server components). The STRIPE_SECRET_KEY must never be exposed to the client.
 * Next.js enforces this — env vars without NEXT_PUBLIC_ prefix are server-only.
 */

import Stripe from "stripe";

/**
 * Validate that the Stripe secret key is present at startup.
 * We throw early and loudly rather than letting requests fail silently,
 * because a missing Stripe key means the entire payment flow is broken
 * and we want to catch this during deployment, not when a user tries to pay.
 */
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set in environment variables. " +
      "Get your key from https://dashboard.stripe.com/apikeys and add it to .env.local"
  );
}

/**
 * Singleton Stripe client instance.
 * 
 * WHY these specific options:
 * - apiVersion: Pin to a specific API version so Stripe doesn't surprise us
 *   with breaking changes when they release a new version. We tested against
 *   this version and know our webhook handlers work with its payload shapes.
 * - typescript: true enables TypeScript-aware response types from the SDK.
 */
export const stripeServerClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

/**
 * Helper to get the Stripe publishable key for client-side usage.
 * This is safe to expose to the browser — it can only be used to
 * create tokens and confirm payments, not to charge cards directly.
 */
export function getStripePublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
  }
  return publishableKey;
}
