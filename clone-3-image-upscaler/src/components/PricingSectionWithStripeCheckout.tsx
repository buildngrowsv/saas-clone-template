"use client";

/**
 * PRICING SECTION WITH STRIPE CHECKOUT — PricingSectionWithStripeCheckout
 *
 * This component renders the pricing comparison (Free vs Pro) and handles
 * the Stripe checkout flow when users click "Upgrade to Pro."
 *
 * It's a Client Component ("use client") because it needs:
 * 1. useState for the loading state during checkout redirect
 * 2. An onClick handler that calls our /api/stripe/checkout endpoint
 * 3. window.location.href to redirect to Stripe's hosted checkout
 *
 * PRICING STRATEGY (decided by the operator):
 * - Free: 3 upscales per day, up to 2x resolution — demonstrates value
 * - Pro: $9.99/month, unlimited upscales, all scale factors (2x/4x/8x), full resolution
 *
 * WHY $9.99/MONTH (same as clone-1):
 * The $9.99 price point is validated by competitors in the image enhancement space:
 * - Let's Enhance: $9/month for 100 images
 * - Upscale.media: $9/month for HD quality
 * - imglarger.com: $9.99/month for premium
 * We're competitive by offering UNLIMITED upscales at this price, which is more
 * generous than most competitors. This creates a value perception advantage.
 *
 * WHY TWO TIERS (not three):
 * Fewer choices = faster decisions. The free tier proves quality, the
 * Pro tier removes all limits. A third tier (e.g., "Enterprise" with API access)
 * would only add confusion at this stage. We can add it later if API demand
 * appears in user feedback or support tickets.
 *
 * VISUAL DESIGN DECISION:
 * The Pro card is highlighted with a primary-colored (teal) border and a
 * "Most Popular" badge. This uses the "decoy effect" — by making the
 * Pro plan visually prominent, we guide users toward it. The Free card
 * is intentionally understated to make Pro feel like the "real" product.
 */

import { useState } from "react";
import { Check, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PricingSectionWithStripeCheckout — Renders pricing cards + handles checkout
 *
 * Called from: src/app/page.tsx (the landing page)
 * Depends on: /api/stripe/checkout route (creates Stripe session)
 *
 * The checkout flow:
 * 1. User clicks "Upgrade to Pro"
 * 2. We POST to /api/stripe/checkout
 * 3. API returns a Stripe checkout URL
 * 4. We redirect the browser to that URL
 * 5. Stripe handles payment collection
 * 6. On success, Stripe redirects back to our success URL
 */
export default function PricingSectionWithStripeCheckout() {
  /**
   * isCheckoutRedirectInProgress — Loading state for the checkout button
   *
   * Set to true when the user clicks "Upgrade to Pro" and we're waiting
   * for the /api/stripe/checkout response. This prevents double-clicks
   * and shows the user that something is happening.
   */
  const [isCheckoutRedirectInProgress, setIsCheckoutRedirectInProgress] =
    useState(false);

  /**
   * initiateStripeCheckoutRedirect — Starts the Stripe checkout flow
   *
   * This function:
   * 1. Sets loading state (disables button, shows spinner)
   * 2. Calls our checkout API to create a Stripe session
   * 3. Redirects to Stripe's hosted checkout page
   * 4. Handles errors gracefully with alert() (simple but effective for v1)
   *
   * We use window.location.href instead of router.push() because we're
   * navigating to an external URL (Stripe's domain), not an internal route.
   */
  const initiateStripeCheckoutRedirect = async () => {
    setIsCheckoutRedirectInProgress(true);

    try {
      const checkoutApiResponse = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!checkoutApiResponse.ok) {
        const errorData = await checkoutApiResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to create checkout session"
        );
      }

      const { checkoutUrl } = await checkoutApiResponse.json();

      if (checkoutUrl) {
        /**
         * Redirect to Stripe's hosted checkout page.
         * Using window.location.href (not router.push) because this is
         * an external URL on Stripe's domain. The user will complete
         * payment there and be redirected back to our success URL.
         */
        window.location.href = checkoutUrl;
      } else {
        throw new Error("No checkout URL returned from API");
      }
    } catch (checkoutError) {
      /**
       * Error handling for checkout failures.
       * Using alert() is simple but effective for v1. In production,
       * we'd use a toast notification component for better UX.
       * Common failure modes:
       * - Stripe not configured (missing env vars)
       * - Network error (user offline)
       * - Stripe API down (rare but possible)
       */
      console.error("[checkout] Failed:", checkoutError);
      alert(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsCheckoutRedirectInProgress(false);
    }
  };

  /**
   * Feature lists for each pricing tier.
   *
   * The free tier features are intentionally limited to create upgrade pressure:
   * - "3 free upscales per day" — enough to try, not enough for real work
   * - "Up to 2x upscaling" — the lowest tier; power users want 4x/8x
   * - "Standard quality" — implies Pro has better quality (it does)
   *
   * The Pro tier features are designed to address every limitation of free:
   * - "Unlimited" removes the daily cap
   * - "All scale factors" unlocks 4x and 8x
   * - "Maximum resolution" beats "standard quality"
   * - "Priority processing" means faster results (important for batch work)
   */
  const freeTierUpscalingFeatures = [
    "3 free upscales per day",
    "Up to 2x upscaling",
    "Standard quality output",
    "PNG & JPEG download",
    "No signup required",
  ];

  const proTierUpscalingFeatures = [
    "Unlimited image upscales",
    "All scale factors (2x, 4x, 8x)",
    "Maximum resolution output",
    "PNG & JPEG download",
    "Priority processing speed",
    "Batch processing (coming soon)",
    "API access (coming soon)",
    "Priority email support",
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>
        </div>

        {/* Pricing cards grid — 2 columns on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* ============================================================
              FREE TIER CARD

              Intentionally understated design — clean white card with
              minimal decoration. This makes the Pro card (with its
              highlighted teal border) stand out more through contrast.

              The free tier exists to:
              1. Let users try before they buy (PLG model)
              2. Drive organic traffic via word of mouth
              3. Create a funnel for Pro upgrades

              For upscaling specifically, the 2x limit on free tier is
              strategic: users can see the AI quality is good, but they'll
              quickly want 4x or 8x for professional work — driving upgrades.
              ============================================================ */}
          <div className="bg-card rounded-2xl border p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Free</h3>
              <p className="text-sm text-muted-foreground">
                Perfect for occasional use
              </p>
            </div>

            {/* Price display */}
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>

            {/* Feature list */}
            <ul className="space-y-3 mb-8 flex-1">
              {freeTierUpscalingFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA — scrolls to the tool (hero section) */}
            <a
              href="#"
              className="inline-flex items-center justify-center w-full h-12 rounded-xl border-2 border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              Get Started Free
            </a>
          </div>

          {/* ============================================================
              PRO TIER CARD

              Highlighted with a teal primary-colored border and shadow,
              plus a "Most Popular" badge. This is the card we want users
              to choose — it's visually prominent by design.

              The "Most Popular" badge uses social proof to reinforce the
              buying decision. Even early on, this label guides users
              toward the paid option by implying it's the standard choice.

              The $9.99 price point was chosen because it's the sweet spot
              in the AI image enhancement market — competitive with
              Let's Enhance, Upscale.media, and imglarger.com while
              offering unlimited usage (which most competitors don't).
              ============================================================ */}
          <div className="bg-card rounded-2xl border-2 border-primary p-8 flex flex-col relative shadow-xl shadow-primary/10">
            {/* "Most Popular" badge — positioned at the top edge of the card */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <p className="text-sm text-muted-foreground">
                For professionals and teams
              </p>
            </div>

            {/* Price display — the $9.99 price point matches the market */}
            <div className="mb-6">
              <span className="text-4xl font-bold">$9.99</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>

            {/* Feature list — more features than free to justify the price */}
            <ul className="space-y-3 mb-8 flex-1">
              {proTierUpscalingFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA — triggers Stripe checkout */}
            <Button
              onClick={initiateStripeCheckoutRedirect}
              disabled={isCheckoutRedirectInProgress}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
            >
              {isCheckoutRedirectInProgress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Money-back guarantee — reduces purchase anxiety */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          30-day money-back guarantee. No questions asked. Cancel anytime from your account settings.
        </p>
      </div>
    </section>
  );
}
