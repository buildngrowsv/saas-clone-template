/**
 * LandingHero — The first thing visitors see on the landing page.
 * 
 * WHY THIS COMPONENT EXISTS:
 * The hero section is the single most important piece of the landing page.
 * It must communicate three things in under 5 seconds:
 *   1. What the tool does (tagline)
 *   2. Why it's better than alternatives (social proof / benefit statement)
 *   3. How to get started (CTA button)
 * 
 * DESIGN DECISIONS:
 * - Centered layout with generous whitespace — proven to convert better
 *   than busy hero sections for SaaS tools
 * - Animated gradient background — adds visual polish without being distracting
 * - Large, bold heading with gradient text — draws the eye immediately
 * - Two CTA buttons: primary (Get Started) and secondary (See Pricing)
 *   This gives visitors two paths: impulse users click "Get Started",
 *   analytical users click "See Pricing" to evaluate first
 * 
 * REUSABILITY:
 * All text content comes from PRODUCT_CONFIG, so this component works
 * for any AI tool clone without modification.
 */

"use client";

import { useSession, signIn } from "next-auth/react";
import { PRODUCT_CONFIG } from "@/lib/config";

export function LandingHero() {
  const { data: session } = useSession();

  /**
   * handleGetStartedClick — Routes the user based on auth state.
   * 
   * WHY: If the user is already signed in, take them straight to the
   * dashboard/tool. If not, trigger the Google OAuth flow. This reduces
   * friction — authenticated users skip the sign-in step entirely.
   */
  const handleGetStartedClick = () => {
    if (session) {
      window.location.href = "/dashboard";
    } else {
      signIn("google", { callbackUrl: "/dashboard" });
    }
  };

  /**
   * handleScrollToPricing — Smooth scrolls to the pricing section.
   * WHY: Keeps the user on the same page rather than navigating away.
   * Single-page landing pages convert better for simple SaaS products
   * because they reduce the number of decisions (clicks) needed.
   */
  const handleScrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="animated-gradient-bg relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* 
        Decorative gradient orbs — purely visual, adds depth and premium feel.
        These are positioned absolutely and blurred heavily so they create a
        soft ambient glow behind the text content.
      */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-500/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* 
          Small badge above the heading — adds credibility and visual interest.
          "AI-Powered" is the most recognizable trust signal for this category.
        */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-text-secondary mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          AI-Powered
        </div>

        {/* 
          Main heading — uses gradient text for visual impact.
          The product name is on its own line for emphasis, followed
          by the tagline which explains the benefit.
        */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="gradient-text">{PRODUCT_CONFIG.name}</span>
        </h1>

        <p className="text-xl sm:text-2xl md:text-3xl text-text-secondary font-light mb-4">
          {PRODUCT_CONFIG.tagline}
        </p>

        <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto mb-10">
          {PRODUCT_CONFIG.description}
        </p>

        {/* 
          CTA buttons — two options to capture different user intents.
          Primary button has glow effect to draw attention.
          Gap between buttons is generous for mobile tap targets.
        */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleGetStartedClick}
            className="glow-button relative z-10 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {session ? "Go to Dashboard" : "Get Started Free"}
          </button>

          <button
            onClick={handleScrollToPricing}
            className="px-8 py-4 border border-white/10 hover:border-white/20 text-text-secondary hover:text-text-primary rounded-xl text-lg transition-all duration-200"
          >
            See Pricing
          </button>
        </div>

        {/* 
          Social proof line — shows free tier availability.
          "No credit card required" removes the biggest objection to signing up.
          The usage count creates urgency/social proof.
        */}
        <p className="mt-8 text-sm text-text-muted">
          {PRODUCT_CONFIG.pricing.free.limit} free uses per{" "}
          {PRODUCT_CONFIG.pricing.free.period} — No credit card required
        </p>
      </div>
    </section>
  );
}
