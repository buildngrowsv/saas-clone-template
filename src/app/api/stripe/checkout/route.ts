/**
 * Stripe Checkout Session Creation — POST /api/stripe/checkout
 * 
 * WHY THIS ROUTE:
 * When a user clicks "Subscribe" or "Go Pro" on the pricing cards, the frontend
 * calls this endpoint to create a Stripe Checkout Session. We then redirect the
 * user to Stripe's hosted checkout page where they enter payment details.
 * 
 * WHY STRIPE HOSTED CHECKOUT (not custom form):
 * 1. PCI compliance — Stripe handles all card data, we never touch it
 * 2. 3D Secure support — required in EU, handled automatically
 * 3. Apple Pay / Google Pay — enabled with zero additional code
 * 4. Fraud prevention — Stripe Radar is built in
 * 5. Localization — Stripe auto-translates to the user's language
 * 
 * The cost is that users briefly leave our site, but the conversion benefit
 * of a trusted checkout experience far outweighs this friction.
 * 
 * FLOW:
 * 1. Frontend sends { tier: "basic" | "pro" } in POST body
 * 2. We verify the user is authenticated
 * 3. We create a Stripe Checkout Session with the matching price ID
 * 4. We return the checkout URL for the frontend to redirect to
 * 5. After payment, Stripe redirects back to our success URL
 * 6. The webhook route handles subscription activation asynchronously
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { stripeServerClient } from "@/lib/stripe";
import {
  readUtmParametersFromCookie,
  formatUtmParametersForStripeMetadata,
} from "@/lib/utm-capture";

/**
 * Maps tier names to Stripe Price IDs from environment variables.
 * 
 * WHY env vars instead of hardcoded:
 * Price IDs are different between Stripe test mode and live mode.
 * By using env vars, we can deploy the same code to staging (test mode)
 * and production (live mode) with different .env files.
 */
/**
 * FLEET COMPATIBILITY (Builder 3, 2026-04-14):
 * 29/42 fleet clones use `STRIPE_PRICE_ID_PRO` instead of the template's
 * `STRIPE_PRICE_PRO`. Rather than updating 29 repos, the template now
 * checks both names with the template-standard name taking priority.
 * This means fleet automation can set EITHER name and checkout will work.
 *
 * Single-tier clones that only have a "pro" plan also work: when `basic`
 * is unset they'll get a 500 on that tier only, which is correct — those
 * clones don't offer a basic tier.
 */
function getStripePriceIdForTier(
  subscriptionTier: "basic" | "pro"
): string | undefined {
  const tierToPriceIdMapping: Record<string, string | undefined> = {
    basic: process.env.STRIPE_PRICE_BASIC || process.env.STRIPE_PRICE_ID,
    pro: process.env.STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_ID_PRO,
  };

  return tierToPriceIdMapping[subscriptionTier];
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:4837";
}

export async function POST(request: NextRequest) {
  try {
    const appUrl = getAppUrl();

    /**
     * Step 1: Verify authentication.
     * We MUST know who the user is before creating a checkout session,
     * because we need to associate the Stripe subscription with their account.
     */
    /**
     * MIGRATION NOTE: Changed from NextAuth's getServerSession(authOptions)
     * to Better Auth's auth.api.getSession({ headers }). This gives us the
     * authenticated user's email and ID for associating with the Stripe checkout.
     */
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in first." },
        { status: 401 }
      );
    }

    /**
     * Step 2: Parse and validate the request body.
     * Only "basic" and "pro" are valid tiers — "free" doesn't need checkout.
     */
    const requestBody = await request.json();
    const { tier: requestedTier } = requestBody;

    if (requestedTier !== "basic" && requestedTier !== "pro") {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "basic" or "pro".' },
        { status: 400 }
      );
    }

    /**
     * Step 3: Look up the Stripe Price ID for the requested tier.
     * If not configured, the operator hasn't set up Stripe products yet.
     */
    const stripePriceId = getStripePriceIdForTier(requestedTier);

    if (!stripePriceId) {
      return NextResponse.json(
        {
          error: `Stripe Price ID not configured for "${requestedTier}" tier. Set STRIPE_PRICE_${requestedTier.toUpperCase()} in .env.local.`,
        },
        { status: 500 }
      );
    }

    /**
     * Step 3.5: Read UTM attribution from the cookie for Stripe metadata.
     *
     * WHY: Attaching acquisition source to every Stripe checkout lets us
     * compute per-channel ROAS and LTV directly in Stripe Dashboard or via
     * the Stripe API, without needing GA4 BigQuery exports.
     *
     * The UTM cookie was set by the useUtmCapture hook on first page load.
     * We read it server-side here because this is an API route, not a
     * client component — localStorage is not available.
     */
    const requestHeaders = await headers();
    const rawCookieHeader = requestHeaders.get("cookie") || "";
    const utmParams = readUtmParametersFromCookie(rawCookieHeader);
    const utmStripeMetadata = formatUtmParametersForStripeMetadata(utmParams);

    /**
     * Step 4: Create the Stripe Checkout Session.
     *
     * WHY these specific options:
     * - mode: "subscription" — we want recurring monthly billing, not one-time
     * - customer_email: pre-fills the email field so users don't have to type it
     * - allow_promotion_codes: lets us create coupon codes for marketing campaigns
     * - success_url: where Stripe redirects after successful payment
     * - cancel_url: where Stripe redirects if the user cancels checkout
     * - metadata: stores the tier, user email, AND acquisition source so our
     *   webhook can read them when processing checkout.session.completed.
     *   UTM metadata enables per-channel LTV analysis in Stripe Dashboard.
     */
    const stripeCheckoutSession =
      await stripeServerClient.checkout.sessions.create({
        mode: "subscription",
        customer_email: session.user.email,
        allow_promotion_codes: true,
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/#pricing`,
        metadata: {
          userEmail: session.user.email,
          subscriptionTier: requestedTier,
          ...utmStripeMetadata,
        },
      });

    return NextResponse.json({ checkoutUrl: stripeCheckoutSession.url });
  } catch (stripeCheckoutError) {
    console.error(
      "Stripe checkout session creation failed:",
      stripeCheckoutError
    );
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
