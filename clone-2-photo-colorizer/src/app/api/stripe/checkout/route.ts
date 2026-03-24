/**
 * STRIPE CHECKOUT SESSION API ROUTE — /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for the Pro subscription plan ($9.99/mo).
 * This is the monetization endpoint — it's how free users convert to paying
 * customers when they hit the daily rate limit or want unlimited colorizations.
 *
 * BUSINESS MODEL CONTEXT:
 * - Free tier: 3 photo colorizations per day (enforced in /api/colorize)
 * - Pro tier: $9.99/month for unlimited colorizations with enhanced resolution
 * - The free tier exists to demonstrate the emotional value of colorization;
 *   this endpoint captures payment when users want to colorize entire albums
 *
 * WHY STRIPE CHECKOUT (instead of custom payment form):
 * 1. PCI compliance handled entirely by Stripe (we never touch card numbers)
 * 2. Built-in support for recurring subscriptions
 * 3. Handles SCA/3DS authentication required in EU
 * 4. Mobile-optimized payment form out of the box
 * 5. Supports Apple Pay, Google Pay, Link (one-click checkout)
 * 6. Way faster to implement than Stripe Elements for a v1
 *
 * PRICING DECISION — Why $9.99/month (same as clone-1):
 * - Palette.fm charges $9-15/mo for AI colorization
 * - Other AI image tools in this range: $9.99/mo
 * - $9.99 is affordable enough for individuals with a box of family photos
 * - Profitable: API cost per colorization is ~$0.01-0.05 via fal.ai
 *
 * STRIPE SETUP REQUIREMENTS:
 * Before this endpoint works, you need:
 * 1. A Stripe account (https://dashboard.stripe.com)
 * 2. A Price ID for a $9.99/mo recurring product (create in Stripe Dashboard)
 * 3. STRIPE_SECRET_KEY in environment variables
 * 4. STRIPE_PRICE_ID in environment variables
 * 5. NEXT_PUBLIC_APP_URL for redirect URLs
 *
 * NOTE: This endpoint is nearly identical to clone-1's Stripe checkout route.
 * The only differences are the app URL and port number. The Stripe integration
 * pattern is reusable across all clones because they all use the same
 * subscription model ($9.99/mo Pro tier).
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/checkout — Create a Stripe Checkout Session
 *
 * Accepts: JSON body (optional, currently no required fields)
 * Returns: JSON with { checkoutUrl: string } on success
 *
 * The client redirects the user to checkoutUrl, where Stripe handles
 * the entire payment flow. After payment, Stripe redirects back to
 * our success_url with the session_id as a query parameter.
 */
export async function POST(request: NextRequest) {
  try {
    /**
     * Validate that Stripe is configured.
     *
     * We check for both STRIPE_SECRET_KEY and STRIPE_PRICE_ID because
     * both are required to create a checkout session.
     *
     * STRIPE_SECRET_KEY: Starts with "sk_test_" (test mode) or "sk_live_" (production)
     * STRIPE_PRICE_ID: Starts with "price_" — created in the Stripe Dashboard
     *   under Products > Add Product > Set price to $9.99/mo recurring
     *
     * NOTE: The port 4821 is specific to this clone (clone-2-photo-colorizer).
     * Clone-1 uses port 4793. Each clone gets a unique port to avoid conflicts
     * when multiple clones are running simultaneously during development.
     */
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4821";

    if (!stripeSecretKey) {
      console.error(
        "[stripe/checkout] STRIPE_SECRET_KEY is not set. " +
          "Get your key from https://dashboard.stripe.com/apikeys"
      );
      return NextResponse.json(
        {
          error: "Payment system is not configured. Please contact support.",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    if (!stripePriceId) {
      console.error(
        "[stripe/checkout] STRIPE_PRICE_ID is not set. " +
          "Create a recurring price in the Stripe Dashboard and set the env var."
      );
      return NextResponse.json(
        {
          error: "Payment system is not configured. Please contact support.",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    /**
     * Create the Stripe Checkout Session using the Stripe API directly.
     *
     * We use the Stripe REST API instead of the stripe npm package to
     * keep the bundle size smaller. The stripe package adds ~1MB to
     * the server bundle, which increases cold start time on serverless.
     */
    const checkoutSessionResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          mode: "subscription",
          "line_items[0][price]": stripePriceId,
          "line_items[0][quantity]": "1",
          success_url: `${appBaseUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appBaseUrl}?checkout=cancelled`,
          allow_promotion_codes: "true",
          billing_address_collection: "auto",
        }).toString(),
      }
    );

    /**
     * Handle Stripe API errors.
     * Stripe returns detailed error objects that we can use for debugging.
     * We log the full error server-side but return a generic message to users.
     */
    if (!checkoutSessionResponse.ok) {
      const stripeError = await checkoutSessionResponse.json().catch(() => null);
      console.error("[stripe/checkout] Stripe API error:", {
        status: checkoutSessionResponse.status,
        error: stripeError?.error?.message || "Unknown error",
        type: stripeError?.error?.type,
      });

      return NextResponse.json(
        {
          error: "Failed to create checkout session. Please try again.",
          code: "STRIPE_API_ERROR",
        },
        { status: 500 }
      );
    }

    /**
     * Extract the checkout URL from the Stripe response.
     * The "url" field contains the full Stripe-hosted checkout page URL.
     */
    const checkoutSession = await checkoutSessionResponse.json();

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (unexpectedError) {
    /**
     * Catch-all for network errors, JSON parsing errors, or any other
     * unexpected failures.
     */
    console.error("[stripe/checkout] Unexpected error:", unexpectedError);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
