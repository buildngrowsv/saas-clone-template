/**
 * Homepage — marketing landing page at /.
 *
 * This is the primary conversion page for the SaaS. It reads all content
 * from the config files (site.ts and product.ts) so rebranding only
 * requires changing those configs.
 *
 * SECTIONS:
 * 1. Hero — above-the-fold with headline, description, and dual CTAs
 * 2. Value Propositions — 3 cards explaining why to choose this product
 * 3. Features Grid — 6 feature cards with icons
 * 4. Pricing Preview — subscription plan cards linking to full pricing page
 * 5. Testimonials — social proof (toggleable via SHOW_TESTIMONIALS config)
 * 6. FAQ — address common objections
 * 7. Final CTA — conversion box with gradient glow
 *
 * DESIGN DECISIONS:
 * - Dark theme by default (modern SaaS aesthetic)
 * - Gradient text on hero for visual impact
 * - Feature cards use subtle hover effects for interactivity
 * - Pricing preview shows 3 plans, links to full pricing page
 * - FAQ addresses pricing, cancellation, and security concerns
 *
 * CUSTOMIZATION:
 * 1. Edit src/config/site.ts for branding (name, colors, description)
 * 2. Edit src/config/product.ts for content (features, pricing, FAQ, testimonials)
 * 3. The layout and styling can be customized directly in this file
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Zap,
  Shield,
  CreditCard,
  Database,
  Cloud,
  Coins,
  Rocket,
  Code,
  TrendingUp,
  Star,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import {
  PRODUCT_FEATURES,
  VALUE_PROPOSITIONS,
  SUBSCRIPTION_PLANS,
  FAQ_ITEMS,
  SHOW_TESTIMONIALS,
  TESTIMONIALS,
} from "@/config/product";

/**
 * Icon lookup map — resolves string icon names from config to React components.
 *
 * WHY STRING NAMES IN CONFIG:
 * Config files might be imported in both server and client contexts.
 * Lucide React components can't be serialized, so we use string names
 * in the config and resolve them here in the client component.
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, Shield, CreditCard, Database, Cloud, Coins, Rocket, Code, TrendingUp,
};

export default function HomePage() {
  const colors = siteConfig.themeColors;

  return (
    <div className="min-h-screen bg-background">
      {/* ============================================================
       * HERO SECTION
       * Above-the-fold conversion zone. Gradient headline + dual CTAs.
       * The gradient colors come from siteConfig.themeColors.
       * ============================================================ */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className={`absolute inset-0 bg-gradient-to-b ${colors.gradientFrom.replace('from-', 'from-').replace('-400', '-500/5')} via-transparent to-transparent opacity-50`} />
        <div className="container relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span className={`bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientVia} ${colors.gradientTo} bg-clip-text text-transparent`}>
                {siteConfig.siteName}
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              {siteConfig.siteDescription}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className={`min-w-[160px] bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientTo} ${colors.gradientFromHover} ${colors.gradientToHover}`}
              >
                <Link href="/login">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[160px]">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       * VALUE PROPOSITIONS
       * Three cards explaining the core value props.
       * Content comes from VALUE_PROPOSITIONS in product.ts.
       * ============================================================ */}
      <section className="border-b border-border/40 bg-muted/20 py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Why choose {siteConfig.siteName}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Built for speed, security, and scale.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_PROPOSITIONS.map((item) => {
              const Icon = ICON_MAP[item.iconName];
              return (
                <Card
                  key={item.title}
                  className={`border-border/60 bg-card/50 transition-colors ${colors.accentBorderHover} hover:bg-card/80`}
                >
                  <CardHeader>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${colors.accentBackground}`}>
                      {Icon && <Icon className={`h-6 w-6 ${colors.accentText}`} />}
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
       * FEATURES GRID
       * Six feature cards in a responsive grid.
       * Content comes from PRODUCT_FEATURES in product.ts.
       * ============================================================ */}
      <section className="container mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Production-ready infrastructure so you can focus on your product.
        </p>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_FEATURES.map((feature) => {
            const Icon = ICON_MAP[feature.iconName];
            return (
              <Card
                key={feature.title}
                className={`border-border/60 bg-card/50 transition-colors ${colors.accentBorderHover} hover:bg-card/80`}
              >
                <CardHeader>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${colors.accentBackground}`}>
                    {Icon && <Icon className={`h-6 w-6 ${colors.accentText}`} />}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ============================================================
       * PRICING PREVIEW
       * Three subscription plan cards + link to full pricing page.
       * Plans come from SUBSCRIPTION_PLANS in product.ts.
       * ============================================================ */}
      <section className="border-y border-border/40 bg-muted/30 py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Choose a plan that fits your needs.
          </p>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.popular
                    ? `${colors.accentBorder} ring-1 ${colors.accentRing}`
                    : "border-border/60"
                }
              >
                <CardHeader className="pb-2">
                  {plan.popular && (
                    <span className={`mb-2 inline-block w-fit rounded-full ${colors.badgeBackground} px-3 py-0.5 text-xs font-medium ${colors.badgeText}`}>
                      Popular
                    </span>
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="mt-2 text-2xl font-bold">
                    ${plan.priceMonthly.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{plan.credits} credits/mo</p>
                </CardHeader>
                <CardContent>
                  <Button asChild variant={plan.popular ? "default" : "outline"} className="w-full">
                    <Link href="/pricing">View details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="link">
              <Link href="/pricing">See full pricing and credit packs &rarr;</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================
       * TESTIMONIALS (conditional)
       * Only shown if SHOW_TESTIMONIALS is true in product.ts.
       * Replace with real testimonials before enabling.
       * ============================================================ */}
      {SHOW_TESTIMONIALS && TESTIMONIALS.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              What our users say
            </h2>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((testimonial) => (
                <Card key={testimonial.name} className="border-border/60 bg-card/50">
                  <CardHeader>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <CardDescription className="text-base">&ldquo;{testimonial.quote}&rdquo;</CardDescription>
                    <div className="mt-4">
                      <p className="font-medium text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.title}, {testimonial.company}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
       * FAQ
       * Address common objections before the final CTA.
       * Content comes from FAQ_ITEMS in product.ts.
       * ============================================================ */}
      <section className="border-t border-border/40 bg-muted/20 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-16 space-y-8">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question}>
                <h3 className="font-semibold text-foreground">{item.question}</h3>
                <p className="mt-2 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
       * FINAL CTA
       * Glowing conversion box at the bottom of the page.
       * Uses brand gradient for the glow effect.
       * ============================================================ */}
      <section className="container mx-auto max-w-6xl px-4 py-20">
        <div className={`rounded-2xl border ${colors.accentBorder} bg-gradient-to-br ${colors.accentBackground} p-12 text-center shadow-lg`}>
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sign up in seconds. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className={`min-w-[180px] bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientTo} ${colors.gradientFromHover} ${colors.gradientToHover}`}
            >
              <Link href="/login">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
