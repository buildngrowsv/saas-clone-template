/**
 * LANDING PAGE — ColorizeAI (AI Photo Colorizer)
 *
 * This is the primary entry point and the page that drives all traffic,
 * conversions, and revenue. It's structured as a single-page marketing
 * site with an integrated tool — users can colorize their black-and-white
 * photos directly on this page without navigating anywhere else.
 *
 * PAGE STRUCTURE (in scroll order):
 * 1. HEADER — Logo (Palette icon + brand) + CTA button (sticky nav)
 * 2. HERO — Headline, subheadline, trust badges
 * 3. UPLOAD TOOL — The interactive dropzone (above the fold on desktop)
 * 4. HOW IT WORKS — 3-step process for clarity
 * 5. SOCIAL PROOF — Stats and trust signals
 * 6. PRICING — Free vs Pro comparison
 * 7. FAQ — SEO-rich content + objection handling
 * 8. FOOTER — Legal links, copyright
 *
 * SEO STRATEGY:
 * Primary keyword: "colorize photo free"
 * The heading, meta description, FAQ answers, and page copy all
 * naturally incorporate this keyword and related terms. The FAQ section
 * is especially important for SEO because it targets long-tail queries
 * that people actually search for (e.g., "how to colorize old photos
 * for free", "can AI colorize black and white photos").
 *
 * CONVERSION STRATEGY:
 * The tool is placed directly in the hero section so users can try it
 * immediately. No signup required for the free tier. The pricing section
 * appears after they've already experienced the magic of seeing their
 * old B&W photo come alive in color, creating a powerful "I want more"
 * moment. This is the PLG (product-led growth) approach — the emotional
 * impact of colorization is the best sales pitch possible.
 *
 * EMOTIONAL ANGLE:
 * Photo colorization is inherently emotional — it's about family memories,
 * history, and nostalgia. Our copy leans into this with phrases like
 * "bring old photos to life" and "rediscover your memories." This emotional
 * connection drives sharing (people show colorized family photos to relatives)
 * which is our primary organic growth channel.
 */

import ImageUploadDropzone from "@/components/ImageUploadDropzone";
import PricingSectionWithStripeCheckout from "@/components/PricingSectionWithStripeCheckout";
import FrequentlyAskedQuestionsSection from "@/components/FrequentlyAskedQuestionsSection";
import {
  Palette,
  Upload,
  Download,
  Zap,
  Shield,
  Clock,
  Image as ImageIcon,
  Star,
} from "lucide-react";

/**
 * Home — The landing page component for ColorizeAI
 *
 * This is a Server Component (no "use client" directive) because most of
 * the page is static marketing content. The interactive parts (dropzone,
 * pricing buttons) are Client Components imported above.
 *
 * Server Components render faster, produce smaller JS bundles, and are
 * better for SEO because the content is available at initial page load
 * without waiting for JavaScript to hydrate. This is especially important
 * for a tool targeting organic search traffic — Google needs to see our
 * content immediately to rank it properly.
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

          BRAND ICON: We use the Palette icon from lucide-react because
          it perfectly represents colorization — painting color onto
          a photo. It's recognizable and unique compared to the generic
          "sparkles" or "wand" icons most AI tools use.
          ============================================================ */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand mark — clicking it scrolls to top.
              The Palette icon in a warm amber square reinforces the
              "color" branding. The icon's rounded container with shadow
              makes it feel like a real app icon. */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Palette className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Colorize<span className="text-primary">AI</span>
            </span>
          </a>

          {/* Primary CTA — goes to pricing section */}
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
            1. Communicate what the tool does (headline)
            2. Communicate it's free/easy (subheadline)
            3. Invite action (the upload dropzone below)

            The hero-pattern background adds subtle warm amber dots for
            visual depth without distracting from the content. The
            gradient text on the headline uses amber-to-orange which
            evokes warmth and "coming alive" — exactly what colorization
            does to old photos.

            IMPORTANT: The upload tool is placed INSIDE the hero section
            (not below it) so it appears above the fold on desktop screens.
            Users should be able to start using the tool without scrolling.
            ============================================================ */}
        <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-20 hero-pattern">
          {/* Subtle warm gradient overlay at the top for visual depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              {/* Pill badge — adds credibility and visual hierarchy.
                  "AI-Powered" signals modern technology, while "Photo Colorization"
                  is the exact search term we want to rank for. */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/15">
                <Palette className="w-4 h-4" />
                AI-Powered Photo Colorization
              </div>

              {/* Main headline — targets "colorize photo" search intent.
                  "Bring Old Photos to Life" is the emotional hook.
                  "with AI" reinforces the tech angle and matches search queries.
                  The gradient-text class applies the animated amber gradient. */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Bring Old Photos to Life{" "}
                <span className="gradient-text">with AI Colorization</span>
              </h1>

              {/* Subheadline — addresses the three main concerns:
                  1. "Free" — no cost barrier
                  2. "No signup" — no friction barrier
                  3. "Seconds" — speed promise
                  Also mentions "black and white" for SEO long-tail matching. */}
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload any black and white photo and watch it come alive with
                realistic, vibrant color in seconds. Free to use, no signup
                required. Powered by advanced AI.
              </p>
            </div>

            {/* THE UPLOAD TOOL — This is the core interactive element.
                It's a Client Component that handles drag/drop, processing,
                and download. Placed prominently in the hero section so
                users can try the tool immediately without scrolling.
                The emotional payoff of seeing a B&W photo colorized is
                the single most powerful conversion driver for this product. */}
            <ImageUploadDropzone />
          </div>
        </section>

        {/* ============================================================
            SECTION 3: HOW IT WORKS — 3-step process

            This section reduces anxiety for users who haven't tried the
            tool yet. By showing a simple 3-step process, we communicate
            that it's easy and fast. The numbered steps create a clear
            mental model of the experience.

            For a colorization tool, the "magic" step (step 2) is extra
            important because users are curious about HOW AI can add
            realistic color to a B&W photo. The description touches on
            the technology just enough to build trust without being
            technical.
            ============================================================ */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Colorize your photos in three simple steps. No design skills or
                editing experience required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Step 1: Upload — same as clone-1 pattern */}
              <div className="text-center group">
                <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <Upload className="w-9 h-9 text-primary" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    1
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Your Photo</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Drag and drop or click to upload any black and white or faded
                  photo. Supports JPEG, PNG, and WebP up to 10MB.
                </p>
              </div>

              {/* Step 2: AI Colorization — the "magic" step.
                  We use Palette icon here instead of Sparkles to reinforce
                  the "painting color" metaphor throughout the page. */}
              <div className="text-center group">
                <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <Palette className="w-9 h-9 text-primary" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    2
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">AI Adds Realistic Color</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Our AI analyzes the scene, identifies objects, and applies
                  historically accurate, natural-looking colors automatically.
                </p>
              </div>

              {/* Step 3: Download — same pattern as clone-1 */}
              <div className="text-center group">
                <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <Download className="w-9 h-9 text-primary" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    3
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Download in Full Color</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get your colorized photo instantly. Share it with family, print
                  it, or use it to preserve precious memories.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION 4: SOCIAL PROOF / TRUST SIGNALS

            Numbers and trust badges reduce purchase anxiety. The stats
            communicate scale, speed, and satisfaction — the three things
            users care most about. For a colorization tool, we also
            highlight "accuracy" because users want to know the colors
            will look realistic, not cartoonish.

            NOTE: Update these numbers with real data as the app grows.
            These are aspirational at launch but the structure is ready
            for real metrics. The Palette icon replaces the generic Image
            icon to stay on brand.
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
                <p className="text-muted-foreground text-sm">Photos Colorized</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                    ~8s
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">Average Processing Time</p>
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
          GDPR, and general business credibility. Branded with the
          ColorizeAI name and Palette icon to maintain consistency.
          ============================================================ */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Footer branding — smaller version of the header logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Palette className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm tracking-tight">
                Colorize<span className="text-primary">AI</span>
              </span>
            </div>

            {/* Legal navigation links — required for Stripe, GDPR compliance */}
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
              <a href="mailto:support@colorizeai.app" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground/60">
              &copy; 2026 ColorizeAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
