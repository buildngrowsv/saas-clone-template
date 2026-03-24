/**
 * STRIPE CHECKOUT API ROUTE — /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for the UpscaleAI Pro plan ($9.99/month).
 * This endpoint is called by the PricingSectionWithStripeCheckout component
 * when the user clicks "Upgrade to Pro."
 *
 * The flow:
 * 1. Client POSTs to this endpoint
 * 2. We create a Stripe Checkout session with the Pro plan price
 * 3. We return the checkout URL
 * 4. Client redirects the browser to Stripe's hosted checkout
 * 5. User completes payment on Stripe's domain
 * 6. Stripe redirects back to our success/cancel URLs
 *
 * WHY HOSTED CHECKOUT (not embedded):
 * Stripe's hosted checkout is the fastest to implement, handles PCI
 * compliance automatically, supports Apple Pay/Google Pay out of the box,
 * and has the highest conversion rates because users trust the Stripe
 * checkout page. For a v1 SaaS, this is the right choice.
 *
 * TODO: Set up actual Stripe products and prices in the Stripe dashboard.
 * The STRIPE_PRICE_ID environment variable must point to the Pro plan price.
 * Use the script at /scripts/create-stripe-products-and-prices.mjs to
 * create these in Stripe's test mode first.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/checkout — Creates a Stripe Checkout session
 *
 * Accepts: Empty POST body (no data needed — the price is server-configured)
 * Returns: JSON with { checkoutUrl: string }
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)
 * - STRIPE_PRICE_ID: The price ID for the Pro plan (price_...)
 * - NEXT_PUBLIC_APP_URL: The base URL of the app for success/cancel redirects
 */
export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4917";

    if (!stripeSecretKey) {
      console.error("[stripe-checkout] STRIPE_SECRET_KEY is not set");
      return NextResponse.json(
        { error: "Payment service is not configured. Please contact support." },
        { status: 503 }
      );
    }

    if (!stripePriceId) {
      console.error("[stripe-checkout] STRIPE_PRICE_ID is not set");
      return NextResponse.json(
        { error: "Payment plan is not configured. Please contact support." },
        { status: 503 }
      );
    }

    /**
     * Create the Stripe Checkout session using the Stripe API directly.
     * We use fetch instead of the Stripe SDK to keep dependencies minimal.
     * The Stripe API accepts form-urlencoded data for session creation.
     *
     * Key parameters:
     * - mode: "subscription" for recurring monthly billing
     * - line_items: The Pro plan price ID and quantity
     * - success_url: Where to redirect after successful payment
     * - cancel_url: Where to redirect if user cancels
     * - allow_promotion_codes: Let users enter coupon codes
     */
    const stripeSessionResponse = await fetch(
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
          success_url: `${appBaseUrl}?checkout=success`,
          cancel_url: `${appBaseUrl}?checkout=cancelled`,
          allow_promotion_codes: "true",
        }).toString(),
      }
    );

    if (!stripeSessionResponse.ok) {
      const errorData = await stripeSessionResponse.json().catch(() => ({}));
      console.error("[stripe-checkout] Stripe API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create checkout session. Please try again." },
        { status: 500 }
      );
    }

    const sessionData = await stripeSessionResponse.json();

    return NextResponse.json({
      checkoutUrl: sessionData.url,
    });
  } catch (error) {
    console.error("[stripe-checkout] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
