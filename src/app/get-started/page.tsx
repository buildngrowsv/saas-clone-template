/**
 * Get Started Page — Dedicated route for the onboarding questionnaire funnel.
 *
 * WHY THIS ROUTE EXISTS:
 * The landing page hero CTA can link here instead of (or in addition to) the
 * direct sign-in flow. By routing users through the questionnaire first, we
 * create psychological investment before showing pricing — research shows this
 * converts 2-5x better than going straight to a paywall or sign-up screen.
 *
 * ARCHITECTURE DECISION — Server component wrapper:
 * This page is a thin server component that renders the client-side
 * OnboardingQuestionnaire. The server component handles metadata (SEO title,
 * description) while the client component handles all interactive state.
 * This is the standard Next.js App Router pattern for pages with heavy
 * client interactivity.
 *
 * NAVIGATION FLOW:
 *   Landing page hero CTA ("Get Started") → /get-started (this page)
 *     → User answers 3 questions
 *     → "Building your plan..." loading screen (2.5s)
 *     → Personalized pricing recommendation
 *     → User clicks a plan CTA → /login or /pricing
 *
 * IMPORTED BY:
 * - Next.js App Router (automatic route registration)
 * - GetStartedCTA component links here via /get-started
 *
 * DEPENDS ON:
 * - src/components/OnboardingQuestionnaire.tsx (the actual questionnaire UI)
 * - src/config/onboarding.ts (question/plan configuration)
 * - src/config/site.ts (site name for metadata)
 * - src/lib/config.ts (product name for metadata)
 */

import type { Metadata } from "next";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";
import { OnboardingQuestionnaire } from "@/components/OnboardingQuestionnaire";
import { ONBOARDING_CONFIG } from "@/config/onboarding";

/**
 * Page metadata — optimized for SEO and social sharing.
 *
 * WHY "Get Started" in the title:
 * "Get Started" is the most universally understood CTA in SaaS. It implies
 * low commitment ("just get started, no purchase required") while moving
 * the user into the funnel. The product name provides brand recognition
 * and the "Personalized Plan" suffix signals that this is worth their time.
 */
export const metadata: Metadata = {
  title: `Get Started with ${PRODUCT_CONFIG.name} — Personalized AI Plan`,
  description: `Answer a few quick questions and get a personalized ${PRODUCT_CONFIG.name} plan tailored to your needs. Free to start, no credit card required.`,
  openGraph: {
    title: `Get Started with ${PRODUCT_CONFIG.name}`,
    description: `Get your personalized ${PRODUCT_CONFIG.name} plan in 30 seconds.`,
    url: `${siteConfig.siteUrl}/get-started`,
  },
};

/**
 * GetStartedPage — Server component that wraps the client-side questionnaire.
 *
 * The page provides:
 * 1. Full-viewport dark background matching the landing page aesthetic
 * 2. Minimal chrome (just the product name as a home link) so the user
 *    stays focused on the questionnaire flow
 * 3. The OnboardingQuestionnaire component with the default config
 *
 * WHY NO FULL NAV BAR:
 * Onboarding flows convert better with minimal navigation. Adding a full
 * header with links to Pricing, FAQ, etc. gives users escape hatches that
 * reduce completion rate. The only escape is the product name link (home)
 * which acts as a subtle "back to safety" option without being distracting.
 */
export default function GetStartedPage() {
  return (
    <main className="min-h-screen bg-surface-primary relative overflow-hidden">
      {/*
        Minimal header — product name as home link only.
        No full navigation bar here because we want the user focused on
        completing the questionnaire, not exploring other pages.
      */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-xl font-bold gradient-text hover:opacity-80 transition-opacity"
          >
            {PRODUCT_CONFIG.name}
          </a>
          <a
            href="/"
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Back to home
          </a>
        </div>
      </nav>

      {/*
        Questionnaire container — vertically centered with top padding for the
        fixed nav bar. The OnboardingQuestionnaire component handles all
        interactive state, transitions, localStorage persistence, and UTM capture.
      */}
      <div className="pt-20">
        <OnboardingQuestionnaire config={ONBOARDING_CONFIG} />
      </div>
    </main>
  );
}
