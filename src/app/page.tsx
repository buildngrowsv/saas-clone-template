/**
 * Landing Page — The main marketing page and entry point for all visitors.
 * 
 * WHY THIS PAGE MATTERS:
 * This is the ONLY page that matters for conversion. Every visitor lands here,
 * and they either:
 *   1. Sign up (conversion) — they saw value and want to try
 *   2. Leave (bounce) — we failed to communicate value fast enough
 * 
 * The page is structured as a single scrollable page with sections:
 *   Hero → Demo Area → Pricing → FAQ → Footer
 * 
 * WHY single page (not multi-page):
 * For simple AI tools, a single landing page converts better than a multi-page
 * site because:
 *   - Fewer clicks to conversion
 *   - Users can scroll to see everything without committing to a click
 *   - Works better on mobile (scroll is natural, navigation is friction)
 *   - Easier to track with analytics (scroll depth vs page views)
 * 
 * CUSTOMIZATION PER CLONE:
 * Most of this page works as-is for any AI tool. The main customization point
 * is the demo section in the middle — replace the placeholder with a product-specific
 * before/after demo or interactive preview.
 */

import { LandingHero } from "@/components/LandingHero";
import { PricingCards } from "@/components/PricingCards";
import { LandingFaqSection } from "@/components/LandingFaqSection";
import { LandingFooter } from "@/components/LandingFooter";
import { LandingDemoSection } from "@/components/LandingDemoSection";
import { SeoInternalLinks } from "@/components/SeoInternalLinks";
import { PRODUCT_CONFIG } from "@/lib/config";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* 
        Navigation bar — minimal, just logo and auth button.
        Kept simple because the landing page should focus attention on the CTA,
        not give users navigation options to explore (which delays conversion).
      */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold gradient-text">
            {PRODUCT_CONFIG.name}
          </span>
          <div className="flex items-center gap-6">
            <a
              href="#pricing"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              FAQ
            </a>
          </div>
        </div>
      </nav>

      {/* Hero section — the hook */}
      <LandingHero />

      {/* 
        How It Works — simple 3-step process.
        WHY: Reduces perceived complexity. Users who think "this looks complicated"
        will bounce. Showing 3 simple steps makes it feel effortless.
      */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            How It <span className="gradient-text">Works</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                stepNumber: "01",
                stepTitle: "Upload",
                stepDescription:
                  "Drag and drop your image or click to browse. Supports PNG, JPEG, and WebP.",
              },
              {
                stepNumber: "02",
                stepTitle: "Process",
                stepDescription:
                  "Our AI analyzes and transforms your image in seconds. No manual editing needed.",
              },
              {
                stepNumber: "03",
                stepTitle: "Download",
                stepDescription:
                  "Get your professional result instantly. High quality, ready to use anywhere.",
              },
            ].map((step) => (
              <div key={step.stepNumber} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-brand-400 font-bold text-lg">
                    {step.stepNumber}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.stepTitle}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {step.stepDescription}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo section — product-specific before/after showcase */}
      <LandingDemoSection />

      {/* Pricing section */}
      <PricingCards />

      {/* FAQ section */}
      <LandingFaqSection />

      {/*
        Internal SEO links — mesh linking to all pSEO pages (/vs/, /for/, /use-cases/).
        WHY HERE: The homepage has the highest PageRank of any page on the site.
        Placing internal links here distributes that authority to pSEO pages,
        helping them rank in search. Positioned below FAQ so it doesn't distract
        from conversion flow but is still crawlable and visible to users scrolling.
      */}
      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <SeoInternalLinks />
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </main>
  );
}
