/**
 * PricingCards — Three-tier pricing display for the landing page.
 * 
 * WHY THREE TIERS:
 * Three-tier pricing is the industry standard for SaaS because of the
 * "decoy effect" — the middle tier looks like a good deal compared to
 * the expensive tier, and the free tier lets people try before buying.
 * 
 * Research shows this layout converts 2-3x better than single-price
 * or two-tier pricing. The middle tier (Basic) is our target conversion
 * tier — it's where most revenue comes from.
 * 
 * DESIGN DECISIONS:
 * - Pro tier is visually highlighted (gradient border, "Popular" badge)
 *   even though Basic is our target tier. WHY? Because highlighting Pro
 *   makes Basic look like a better deal (anchoring effect). Users think
 *   "I don't need Pro, but Basic is reasonable" and convert.
 * - Feature lists use checkmarks — universally understood as "included"
 * - Prices are displayed prominently with the period ("/mo") next to them
 * - CTA text changes based on tier: "Start Free" vs "Subscribe" vs "Go Pro"
 * 
 * REUSABILITY:
 * Pricing values come from PRODUCT_CONFIG, so this works for any clone.
 * Only the feature lists need to be customized per product (and even those
 * are generic enough to work for most AI tools).
 */

"use client";

import { useSession, signIn } from "next-auth/react";
import { PRODUCT_CONFIG } from "@/lib/config";

/**
 * Feature list for each tier — describes what's included.
 * These are generic enough for any AI tool. If a specific clone needs
 * different features, override this array in the cloned project.
 */
const TIER_FEATURES = {
  free: [
    `${PRODUCT_CONFIG.pricing.free.limit} uses per ${PRODUCT_CONFIG.pricing.free.period}`,
    "Standard quality output",
    "Basic file formats",
    "Community support",
  ],
  basic: [
    `${PRODUCT_CONFIG.pricing.basic.limit} uses per ${PRODUCT_CONFIG.pricing.basic.period}`,
    "HD quality output",
    "All file formats",
    "Priority processing",
    "Email support",
  ],
  pro: [
    "Unlimited uses",
    "Maximum quality output",
    "All file formats + API access",
    "Fastest processing",
    "Priority support",
    "Commercial license",
  ],
};

/**
 * Individual pricing card component.
 * 
 * WHY a sub-component: Each card has identical structure but different data.
 * Extracting it avoids repetition and makes the code easier to maintain.
 * If we need to change the card layout, we change it once here.
 */
function PricingCard({
  tierName,
  tierDisplayName,
  pricePerMonth,
  features,
  isHighlighted,
  ctaText,
  onCtaClick,
}: {
  tierName: string;
  tierDisplayName: string;
  pricePerMonth: number;
  features: string[];
  isHighlighted: boolean;
  ctaText: string;
  onCtaClick: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl p-[1px] transition-all duration-300 hover:scale-[1.02] ${
        isHighlighted
          ? "bg-gradient-to-b from-brand-400 via-purple-500 to-pink-500"
          : "bg-white/10"
      }`}
    >
      {/* 
        Popular badge — only shown on the highlighted tier.
        Positioned absolutely at the top of the card.
      */}
      {isHighlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-500 to-purple-500 rounded-full text-sm font-semibold text-white">
          Most Popular
        </div>
      )}

      <div className="glass-card p-8 h-full flex flex-col">
        {/* Tier name and price */}
        <h3 className="text-lg font-semibold text-text-secondary mb-2">
          {tierDisplayName}
        </h3>

        <div className="mb-6">
          {pricePerMonth === 0 ? (
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-text-primary">Free</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-text-primary">
                ${pricePerMonth.toFixed(2)}
              </span>
              <span className="text-text-muted">/mo</span>
            </div>
          )}
        </div>

        {/* Feature list with checkmarks */}
        <ul className="space-y-3 mb-8 flex-grow">
          {features.map((feature, featureIndex) => (
            <li key={featureIndex} className="flex items-start gap-3">
              <svg
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isHighlighted ? "text-brand-400" : "text-green-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-text-secondary text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA button — styled differently for highlighted tier */}
        <button
          onClick={onCtaClick}
          className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
            isHighlighted
              ? "bg-gradient-to-r from-brand-500 to-purple-500 text-white hover:from-brand-400 hover:to-purple-400"
              : "bg-white/10 text-text-primary hover:bg-white/15 border border-white/10"
          }`}
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
}

export function PricingCards() {
  const { data: session } = useSession();

  /**
   * handleTierSelection — Handles click on a pricing card CTA.
   * 
   * For free tier: sign in (or go to dashboard if already signed in)
   * For paid tiers: redirect to Stripe checkout (must be signed in first)
   * 
   * WHY we require sign-in before checkout:
   * We need the user's ID to associate the Stripe subscription with their account.
   * If they're not signed in, we trigger sign-in first with a callback URL
   * that includes the selected tier, so we can redirect to checkout after auth.
   */
  const handleFreeTierClick = () => {
    if (session) {
      window.location.href = "/dashboard";
    } else {
      signIn("google", { callbackUrl: "/dashboard" });
    }
  };

  const handlePaidTierClick = async (tier: "basic" | "pro") => {
    if (!session) {
      signIn("google", { callbackUrl: `/dashboard?upgrade=${tier}` });
      return;
    }

    /**
     * Call our Stripe checkout API route to create a checkout session,
     * then redirect the user to Stripe's hosted checkout page.
     * WHY hosted checkout: It's PCI compliant out of the box, handles
     * card validation, 3D Secure, and all payment edge cases. Building
     * our own checkout form would be a security liability.
     */
    try {
      const checkoutResponse = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const { checkoutUrl } = await checkoutResponse.json();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (checkoutError) {
      console.error("Failed to create checkout session:", checkoutError);
    }
  };

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple,{" "}
            <span className="gradient-text">Transparent Pricing</span>
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, cancel
            anytime.
          </p>
        </div>

        {/* Pricing cards grid — 3 columns on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingCard
            tierName="free"
            tierDisplayName="Free"
            pricePerMonth={0}
            features={TIER_FEATURES.free}
            isHighlighted={false}
            ctaText="Start Free"
            onCtaClick={handleFreeTierClick}
          />

          <PricingCard
            tierName="basic"
            tierDisplayName="Basic"
            pricePerMonth={PRODUCT_CONFIG.pricing.basic.price}
            features={TIER_FEATURES.basic}
            isHighlighted={false}
            ctaText="Subscribe"
            onCtaClick={() => handlePaidTierClick("basic")}
          />

          <PricingCard
            tierName="pro"
            tierDisplayName="Pro"
            pricePerMonth={PRODUCT_CONFIG.pricing.pro.price}
            features={TIER_FEATURES.pro}
            isHighlighted={true}
            ctaText="Go Pro"
            onCtaClick={() => handlePaidTierClick("pro")}
          />
        </div>
      </div>
    </section>
  );
}
