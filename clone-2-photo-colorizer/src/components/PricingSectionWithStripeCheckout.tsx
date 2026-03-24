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
 * PRICING STRATEGY (decided by the user/operator):
 * - Free: 3 colorizations per day, standard quality — demonstrates value
 * - Pro: $9.99/month, unlimited colorizations, full resolution — monetizes power users
 *
 * WHY SAME PRICE AS CLONE-1:
 * $9.99/month is validated pricing for AI image tools. Competitors like
 * Palette.fm charge $9-15/month for similar colorization tools. We keep
 * the price point consistent across clones because:
 * 1. It simplifies our Stripe product catalog
 * 2. It's a well-tested price point for individual creators
 * 3. The value proposition (unlimited AI processing) is the same
 *
 * COLORIZATION-SPECIFIC FEATURES:
 * The feature list is adapted for colorization use cases — mentioning
 * "historically accurate colors," "facial detail preservation," and
 * "batch album colorization" which are unique to this product category.
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
   * These are adapted for the colorization use case — emphasizing
   * color accuracy, detail preservation, and the emotional value
   * of restoring old family photos.
   */
  const freeTierFeatures = [
    "3 free colorizations per day",
    "Standard resolution output",
    "JPEG & PNG download",
    "No signup required",
  ];

  /**
   * Pro features emphasize the unique value propositions of colorization:
   * - "Historically accurate" colors matter because users want realistic results
   * - "Facial detail preservation" is a key quality differentiator
   * - "Batch album colorization" targets the power use case (entire photo albums)
   * - "API access" targets developers building on top of our colorization model
   */
  const proTierFeatures = [
    "Unlimited photo colorizations",
    "Full HD resolution output",
    "Historically accurate color palette",
    "Enhanced facial detail preservation",
    "Batch album colorization (coming soon)",
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
            Start free. Upgrade when you need more. Cancel anytime.
          </p>
        </div>

        {/* Pricing cards grid — 2 columns on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* ============================================================
              FREE TIER CARD

              Intentionally understated design — clean white card with
              minimal decoration. This makes the Pro card (with its
              highlighted border) stand out more through contrast.

              The free tier exists to:
              1. Let users experience the emotional impact of colorization
              2. Drive organic traffic via social sharing of colorized photos
              3. Create a funnel for Pro upgrades when they hit the daily limit
              ============================================================ */}
          <div className="bg-card rounded-2xl border p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Free</h3>
              <p className="text-sm text-muted-foreground">
                Perfect for trying it out
              </p>
            </div>

            {/* Price display */}
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>

            {/* Feature list */}
            <ul className="space-y-3 mb-8 flex-1">
              {freeTierFeatures.map((feature) => (
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
              Start Colorizing Free
            </a>
          </div>

          {/* ============================================================
              PRO TIER CARD

              Highlighted with a primary-colored (warm amber) border and
              shadow, plus a "Most Popular" badge. This is the card we
              want users to choose.

              For colorization, the Pro pitch is especially strong because
              people with old photo albums have DOZENS of photos to colorize.
              The 3/day free limit becomes frustrating very quickly when
              you're excited about restoring a whole album.
              ============================================================ */}
          <div className="bg-card rounded-2xl border-2 border-primary p-8 flex flex-col relative shadow-xl shadow-primary/10">
            {/* "Most Popular" badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <p className="text-sm text-muted-foreground">
                For photo enthusiasts and families
              </p>
            </div>

            {/* Price display */}
            <div className="mb-6">
              <span className="text-4xl font-bold">$9.99</span>
              <span className="text-muted-foreground ml-1">/month</span>
            </div>

            {/* Feature list */}
            <ul className="space-y-3 mb-8 flex-1">
              {proTierFeatures.map((feature) => (
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
