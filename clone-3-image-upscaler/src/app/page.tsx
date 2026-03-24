/**
 * LANDING PAGE — UpscaleAI (AI Image Upscaler — Clone #3)
 *
 * This is the primary entry point and the page that drives all traffic,
 * conversions, and revenue for UpscaleAI. It's structured as a single-page
 * marketing site with an integrated tool — users can upscale images
 * directly on this page without navigating anywhere else.
 *
 * PAGE STRUCTURE (in scroll order):
 * 1. HEADER — Logo + CTA button (sticky nav)
 * 2. HERO — Headline, subheadline, trust badges
 * 3. UPLOAD TOOL — The interactive upscale dropzone with scale selector (above the fold on desktop)
 * 4. HOW IT WORKS — 3-step process: Upload → Select Scale → Download HD
 * 5. SOCIAL PROOF — Stats and trust signals
 * 6. PRICING — Free vs Pro comparison
 * 7. FAQ — SEO-rich content about upscaling + objection handling
 * 8. FOOTER — Legal links, copyright
 *
 * SEO STRATEGY:
 * Primary keyword: "upscale image free AI"
 * Secondary keywords: "AI image enhancer", "image upscaler online", "enlarge photo AI"
 * The heading, meta description, FAQ answers, and page copy all naturally
 * incorporate these keywords and related terms. The FAQ section is especially
 * important for SEO because it targets long-tail queries that people actually
 * search for (e.g., "how to upscale image with AI for free").
 *
 * CONVERSION STRATEGY:
 * The tool is placed directly in the hero section so users can try it
 * immediately. No signup required for the free tier. The pricing section
 * appears after they've already experienced the quality, creating a
 * natural "I want more of this" moment. This is the PLG (product-led
 * growth) approach used by Topaz Labs, Let's Enhance, and similar tools.
 *
 * DIFFERENTIATION FROM CLONE-1 (BG Remover):
 * While the page structure is identical (proven conversion template), the
 * content, colors, and interactive component are completely different.
 * The upscaler features a scale selector (2x/4x/8x), a before/after
 * comparison view, and teal/cyan branding that evokes "sharpness."
 */

import ImageUpscaleDropzone from "@/components/ImageUpscaleDropzone";
import PricingSectionWithStripeCheckout from "@/components/PricingSectionWithStripeCheckout";
import FrequentlyAskedQuestionsSection from "@/components/FrequentlyAskedQuestionsSection";
import {
  ArrowUpCircle,
  Upload,
  Download,
  Zap,
  Shield,
  Clock,
  Image as ImageIcon,
  Star,
  Maximize,
} from "lucide-react";

/**
 * Home — The landing page component
 *
 * This is a Server Component (no "use client" directive) because most of
 * the page is static marketing content. The interactive parts (dropzone,
 * pricing buttons) are Client Components imported above.
 *
 * Server Components render faster, produce smaller JS bundles, and are
 * better for SEO because the content is available at initial page load
 * without waiting for JavaScript to hydrate.
 */
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ============================================================
          SECTION 1: STICKY HEADER / NAVIGATION

          The header is minimal — just the logo and a single CTA button.
          We don't need complex navigation because this is a single-page
          tool. The CTA scrolls to the pricing section, which is the
          primary conversion action we want from returning visitors.

          Sticky positioning (sticky top-0) keeps the brand visible
          and the CTA accessible as the user scrolls. The backdrop-blur
          gives a modern frosted glass effect that works on all content.

          BRAND ICON: ArrowUpCircle from lucide-react represents the
          "upscaling" concept — an upward arrow suggests enlargement,
          improvement, and enhancement. This is more intuitive than
          a generic "maximize" icon for this use case.
          ============================================================ */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand mark — clicking it scrolls to top.
              The teal icon with ArrowUpCircle immediately communicates
              "upscaling" at a glance, even before reading the brand name. */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <ArrowUpCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Upscale<span className="text-primary">AI</span>
            </span>
          </a>

          {/* Primary CTA — goes to pricing section.
              Uses Zap icon to convey speed and power, which are the
              two main value props of AI upscaling vs manual methods. */}
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 hover:shadow-primary/35"
          >
            <Zap className="w-4 h-4" />
            Go Pro
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* ============================================================
            SECTION 2: HERO — The "above the fold" experience

            This is the most important section of the entire page.
            It must accomplish three things in under 3 seconds:
            1. Communicate what the tool does (headline about upscaling)
            2. Communicate it's free/easy (subheadline)
            3. Invite action (the upload dropzone below)

            The hero-pattern background adds subtle dot patterns that
            evoke "pixels" — fitting for an image upscaling tool.
            The gradient text on the headline draws the eye and signals
            "premium/innovative."

            IMPORTANT: The upload tool is placed INSIDE the hero section
            (not below it) so it appears above the fold on desktop screens.
            Users should be able to start using the tool without scrolling.

            KEYWORD TARGETING: The h1 includes "Upscale" and "AI" which
            are the core terms in our primary keyword "upscale image free AI."
            The subheadline adds "free" and "no signup" to complete coverage.
            ============================================================ */}
        <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-20 hero-pattern">
          {/* Subtle gradient overlay at the top for visual depth —
              uses teal/cyan tint to reinforce the brand color. */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              {/* Pill badge — adds credibility and visual hierarchy.
                  The Maximize icon represents "enlarging" which is the
                  core function of an image upscaler. */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/15">
                <Maximize className="w-4 h-4" />
                AI-Powered Image Upscaling
              </div>

              {/* Main headline — targets "upscale image" search intent.
                  The gradient-text class makes it visually striking while
                  the actual text is SEO-optimized with the target keyword.
                  "Enhance & Upscale" covers both search intents — users
                  looking to improve quality AND users looking to enlarge. */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Enhance & Upscale Images{" "}
                <span className="gradient-text">with AI Precision</span>
              </h1>

              {/* Subheadline — addresses the three main concerns:
                  1. "Free" — no cost barrier
                  2. "No signup" — no friction barrier
                  3. "2x, 4x, 8x" — specific capability promise
                  The scale factors are mentioned explicitly because they're
                  common search terms and set clear expectations. */}
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload any image and upscale it 2x, 4x, or 8x with stunning
                clarity. Free to use, no signup required. AI-powered enhancement
                that brings every detail to life.
              </p>
            </div>

            {/* THE UPLOAD TOOL — This is the core interactive element.
                ImageUpscaleDropzone is a Client Component that handles:
                - Drag/drop image upload
                - Scale factor selection (2x, 4x, 8x)
                - API call to /api/upscale
                - Before/after comparison display
                - Download of the upscaled result
                Placed prominently in the hero section so users can try
                the tool immediately without scrolling. */}
            <ImageUpscaleDropzone />
          </div>
        </section>

        {/* ============================================================
            SECTION 3: HOW IT WORKS — 3-step process

            This section reduces anxiety for users who haven't tried the
            tool yet. By showing a simple 3-step process, we communicate
            that it's easy and fast. The steps are specific to upscaling:
            1. Upload (same as any image tool)
            2. Select Scale (unique to upscaling — 2x/4x/8x choice)
            3. Download HD (emphasizes the "higher resolution" output)

            The numbered steps create a clear mental model of the experience.
            Each step uses an icon for visual scanning — users who scroll
            quickly can understand the flow from icons alone.
            ============================================================ */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Upscale images in three simple steps. No design skills or software required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Step 1: Upload — universal first step for any image tool.
                  We keep the messaging simple and familiar because users
                  already know how upload works from other image tools. */}
              <div className="text-center group">
                <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <Upload className="w-9 h-9 text-primary" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    1
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Image</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Drag and drop or click to upload. Supports JPEG, PNG, and WebP up to 10MB.
                </p>
              </div>

              {/* Step 2: Select Scale — this is the step unique to upscaling.
                  Unlike bg-removal (which is one-click), upscaling requires
                  a choice: how much do you want to enlarge? The 2x/4x/8x
                  options are industry-standard scale factors used by
                  Topaz Labs, Let's Enhance, and other upscaling tools. */}
              <div className="text-center group">
                <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <Maximize className="w-9 h-9 text-primary" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    2
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Select Scale</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Choose your upscale factor: 2x, 4x, or 8x. Our AI enhances details and sharpness at every scale level.
                </p>
              </div>

              {/* Step 3: Download HD — emphasizes the outcome (higher resolution).
                  Using "HD" in the label sets quality expectations and
                  differentiates from basic resize tools that just stretch pixels. */}
              <div className="text-center group">
                <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <Download className="w-9 h-9 text-primary" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    3
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Download HD</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get your enhanced, high-resolution image instantly. Perfect for printing, e-commerce, social media, or any project.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION 4: SOCIAL PROOF / TRUST SIGNALS

            Numbers and trust badges reduce purchase anxiety. Even if
            these are aspirational at launch, the structure is in place
            for real metrics. The stats communicate scale, speed, quality,
            and security — the four things image upscaling users care about.

            We use upscaling-specific stats:
            - "Images Upscaled" (not "processed") — reinforces the value prop
            - "Average Time" — upscaling is compute-heavy, so speed matters
            - "4.8/5 Rating" — quality perception is CRITICAL for upscaling
            - "Secure & Private" — users upload personal/professional photos

            NOTE: Update these numbers with real data as the app grows.
            ============================================================ */}
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                    5M+
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">Images Upscaled</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                    ~8s
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">Average Upscale Time</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                    4.8/5
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">User Satisfaction</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                    100%
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">Secure & Private</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION 5: PRICING — Client Component with Stripe integration
            ============================================================ */}
        <PricingSectionWithStripeCheckout />

        {/* ============================================================
            SECTION 6: FAQ — SEO content + objection handling
            ============================================================ */}
        <FrequentlyAskedQuestionsSection />
      </main>

      {/* ============================================================
          SECTION 7: FOOTER

          Minimal footer with legal links required for Stripe compliance,
          GDPR, and general business credibility. Uses the UpscaleAI
          brand name and teal color scheme throughout.
          ============================================================ */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Footer branding — smaller version of the header logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <ArrowUpCircle className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm tracking-tight">
                Upscale<span className="text-primary">AI</span>
              </span>
            </div>

            {/* Legal navigation links — required for Stripe/payment compliance */}
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="/refund" className="hover:text-foreground transition-colors">
                Refund Policy
              </a>
              <a href="mailto:support@upscaleai.app" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground/60">
              &copy; 2026 UpscaleAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
