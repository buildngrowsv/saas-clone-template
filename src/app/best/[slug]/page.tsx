/**
 * Programmatic SEO Page — "Best [Product] for [Audience]"
 *
 * WHY THIS PAGE EXISTS:
 * Long-tail keywords like "best ai logo generator for startups" have high
 * buying intent and low competition. By generating one page per audience
 * segment from config, we cover dozens of these keywords at zero marginal cost.
 * Each page is unique enough for Google (different title, description, FAQ,
 * feature emphasis) while sharing the same conversion-optimized structure.
 *
 * ROUTE: /best/[slug]
 * Example: /best/startup-founders -> "Best AI Logo Generator for Startup Founders"
 *
 * SEO STRUCTURE:
 * - Unique <title> targeting "[product] for [audience]"
 * - JSON-LD FAQPage schema (earns featured snippets)
 * - Feature breakdown emphasizing audience-relevant capabilities
 * - Social proof section
 * - Strong CTA to signup/trial
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoPageConfig, getProductSlug, buildFaqJsonLd } from "@/lib/seo-pages";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
let seoConfig: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  seoConfig = require("../../../seo-config.json");
} catch {
  // Fallback to PRODUCT_CONFIG defaults
}

interface BestPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Generates static params at build time so Next.js pre-renders all
 * /best/ pages as static HTML. No server-side rendering needed.
 */
export async function generateStaticParams() {
  const config = getSeoPageConfig();
  return config.bestForPages.map((page) => ({ slug: page.slug }));
}

/**
 * Generates metadata (title, description, OG tags) for each audience page.
 * Each page gets a unique title targeting the long-tail keyword.
 */
export async function generateMetadata({ params }: BestPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getSeoPageConfig();
  const page = config.bestForPages.find((p) => p.slug === slug);
  if (!page) return {};

  const productName = seoConfig.productName || PRODUCT_CONFIG.name;
  const title = `Best ${productName} for ${page.audience} (2026) — Free Trial`;
  const description = `${productName} is the best choice for ${page.audience}. ${page.whyFit.slice(0, 120)}... Try free today.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteConfig.siteUrl}/best/${slug}`,
    },
    alternates: {
      canonical: `${siteConfig.siteUrl}/best/${slug}`,
    },
  };
}

export default async function BestForPage({ params }: BestPageProps) {
  const { slug } = await params;
  const config = getSeoPageConfig();
  const page = config.bestForPages.find((p) => p.slug === slug);

  if (!page) notFound();

  const productName = seoConfig.productName || PRODUCT_CONFIG.name;
  const productSlug = getProductSlug();
  const ctaPath = seoConfig.ctaPath || "/login";
  const ctaText = seoConfig.ctaText || "Try Free Now";
  const pricing = seoConfig.pricing || {};
  const faqJsonLd = buildFaqJsonLd(page.faq);

  return (
    <>
      {/* JSON-LD FAQPage structured data for Google rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="min-h-screen bg-surface-primary text-text-primary">
        {/* Minimal nav — same as landing page for brand consistency */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold gradient-text">
              {productName}
            </Link>
            <Link
              href={ctaPath}
              className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-sm font-medium transition-colors"
            >
              {ctaText}
            </Link>
          </div>
        </nav>

        <div className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Hero section targeting the long-tail keyword */}
            <section className="mb-16">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Best {productName} for{" "}
                <span className="gradient-text">{page.audience}</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed">
                {page.whyFit}
              </p>
              <Link
                href={ctaPath}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-lg transition-colors"
              >
                {ctaText} — Free for {page.audience}
              </Link>
            </section>

            {/* Why this product is perfect for the audience */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">
                Why {page.audience} Choose {productName}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {page.topFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl bg-surface-secondary border border-white/5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-accent-primary text-xl">✓</span>
                      <div>
                        <h3 className="font-semibold mb-1">{feature}</h3>
                        <p className="text-sm text-text-secondary">
                          Built with {page.audience.toLowerCase()} in mind
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Pricing context for the audience */}
            <section className="mb-16 p-8 rounded-xl bg-surface-secondary border border-white/5">
              <h2 className="text-2xl font-bold mb-4">
                Pricing for {page.audience}
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {pricing.free && (
                  <div className="p-4 rounded-lg bg-surface-primary">
                    <h3 className="font-semibold text-accent-primary mb-1">Free</h3>
                    <p className="text-text-secondary text-sm">{pricing.free}</p>
                  </div>
                )}
                {pricing.basic && (
                  <div className="p-4 rounded-lg bg-surface-primary">
                    <h3 className="font-semibold text-accent-primary mb-1">Basic</h3>
                    <p className="text-text-secondary text-sm">{pricing.basic}</p>
                  </div>
                )}
                {pricing.pro && (
                  <div className="p-4 rounded-lg bg-surface-primary border border-accent-primary/30">
                    <h3 className="font-semibold text-accent-primary mb-1">Pro</h3>
                    <p className="text-text-secondary text-sm">{pricing.pro}</p>
                  </div>
                )}
              </div>
            </section>

            {/* FAQ section — content feeds the JSON-LD for featured snippets */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {page.faq.map((item, index) => (
                  <details
                    key={index}
                    className="group p-6 rounded-xl bg-surface-secondary border border-white/5"
                  >
                    <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                      {item.question}
                      <span className="text-accent-primary group-open:rotate-45 transition-transform">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 text-text-secondary leading-relaxed">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            {/* Final CTA */}
            <section className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-text-secondary mb-8">
                Join thousands of {page.audience.toLowerCase()} who trust {productName}.
              </p>
              <Link
                href={ctaPath}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-lg transition-colors"
              >
                {ctaText}
              </Link>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
