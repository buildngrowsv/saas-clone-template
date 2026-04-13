#!/usr/bin/env npx tsx
/**
 * generate-seo-pages.ts — Programmatic SEO page generator for the saas-clone-template fleet.
 *
 * PURPOSE:
 * Each clone in the 40+ fleet currently has only a landing page plus a handful of
 * dynamic routes. This script generates 20-100+ static long-tail SEO pages per clone
 * (comparison pages, use-case pages, industry pages), creating 800-4,000 new indexable
 * pages across the entire fleet — each targeting a different buyer-intent keyword.
 *
 * PAGE TYPES GENERATED:
 *   /vs/[competitor]       — "Product vs Competitor" comparison pages (decision stage)
 *   /for/[industry]        — "Product for [Industry]" vertical landing pages (consideration)
 *   /use-cases/[use-case]  — "Product for [Use Case]" feature-focused pages (awareness)
 *   /seo/index             — Hub page linking all generated SEO pages (internal linking)
 *
 * EACH PAGE INCLUDES:
 *   - SEO-optimized <title> and <meta description> targeting the specific keyword
 *   - Proper H1 with the target keyword for on-page relevance
 *   - JSON-LD FAQPage + SoftwareApplication structured data for rich snippets
 *   - OpenGraph and Twitter Card meta tags for social sharing
 *   - Canonical URL pointing to the branded domain
 *   - Feature comparison table (for /vs/ pages)
 *   - Internal links to pricing, features, and other generated pages across all categories
 *   - CTA buttons linking to signup/pricing
 *   - FAQ section with 3-5 questions targeting long-tail keywords
 *
 * ALSO GENERATES:
 *   - src/lib/seo-sitemap-paths.ts — additional sitemap entries for all generated pages
 *   - /seo hub page linking all generated pages for internal link equity distribution
 *
 * USAGE:
 *   npm run generate:seo                                        # uses ./seo-config.json
 *   node scripts/run-ts.mjs scripts/generate-seo-pages.ts       # same via run-ts
 *   node scripts/run-ts.mjs scripts/generate-seo-pages.ts path/to/config.json
 *
 * ARCHITECTURE:
 * The script generates Next.js App Router pages as .tsx files under src/app/.
 * Each page is a server component that exports metadata via `export const metadata`.
 * Pages are statically generated at build time — zero runtime cost, maximum SEO value,
 * and they inherit the existing layout (header, footer, theme, cookie consent).
 *
 * DESIGN SYSTEM:
 * Generated pages use the same design tokens as the dynamic route pages in the template:
 *   - bg-surface-primary, bg-surface-secondary for backgrounds
 *   - text-text-primary, text-text-secondary, text-text-muted for text hierarchy
 *   - bg-brand-600, hover:bg-brand-500, text-brand-400 for brand accents
 *   - border-white/5, border-white/10 for borders
 *   - gradient-text for highlighted headings
 * This ensures visual consistency whether pages come from the generator or the config.
 *
 * RELATIONSHIP TO DYNAMIC ROUTES:
 * The template ships with dynamic routes at /vs/[competitor], /for/[audience], and
 * /use-cases/[use-case] driven by src/config/seo-pages.ts. Those routes render from
 * runtime config. This generator writes STATIC .tsx files for each slug. The static
 * files take precedence in Next.js routing, so running the generator "materializes"
 * the pages for clones that want static HTML (better for CDN caching, no runtime
 * data dependency). Clones that prefer dynamic-only can skip running the generator.
 *
 * CONTENT QUALITY:
 * Google's Helpful Content Update (2024+) penalizes thin, templated pages. Each
 * generated page aims for 500+ words of unique, substantive content by combining
 * product-specific config data with audience/use-case-specific messaging. Clones
 * MUST customize seo-config.json with real data — generic placeholders will not rank.
 */

import * as fs from "fs";
import * as path from "path";

/* ============================================================
 * TYPES — Shape of the seo-config.json input file
 * ============================================================ */

interface SeoConfig {
  productName: string;
  productSlug: string;
  domain: string;
  tagline: string;
  category: string;
  competitors: string[];
  useCases: string[];
  industries: string[];
  pricing: {
    free: string;
    basic: string;
    pro: string;
  };
  coreFeatures: string[];
  ctaPath: string;
  ctaText: string;
}

/* ============================================================
 * HELPER FUNCTIONS — Slug generation, text utilities
 * ============================================================ */

/**
 * Convert a human-readable string into a URL-safe slug.
 * "Remove.bg" -> "remove-bg", "ecommerce sellers" -> "ecommerce-sellers"
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Convert a slug back to a human-readable title.
 * "ecommerce-sellers" -> "Ecommerce Sellers"
 */
function titleCase(text: string): string {
  return text
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Build SoftwareApplication JSON-LD schema for structured data.
 * This schema tells Google the page is about a software product,
 * enabling rich result features like rating stars and pricing info.
 */
function buildSoftwareApplicationJsonLd(config: SeoConfig): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: config.productName,
      applicationCategory: config.category,
      operatingSystem: "Web",
      url: `https://${config.domain}`,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "0",
        highPrice: config.pricing.pro.split("$")[1]?.split("/")[0] || "9.99",
        offerCount: "3",
      },
      description: config.tagline,
    },
    null,
    2
  );
}

/**
 * Generate cross-category internal links JSX for the bottom of every page.
 * Links to all three page types (vs, for, use-cases) plus the SEO hub,
 * creating a dense internal link mesh that distributes PageRank and helps
 * Google discover the full programmatic SEO page tree.
 */
function generateInternalLinksJsx(config: SeoConfig): string {
  const competitorLinks = config.competitors
    .slice(0, 5)
    .map(
      (c) =>
        `                  <li>
                    <Link href="/vs/${slugify(c)}" className="text-sm text-text-muted hover:text-brand-400 transition-colors">
                      ${config.productName} vs ${c}
                    </Link>
                  </li>`
    )
    .join("\n");

  const industryLinks = config.industries
    .slice(0, 5)
    .map(
      (ind) =>
        `                  <li>
                    <Link href="/for/${slugify(ind)}" className="text-sm text-text-muted hover:text-brand-400 transition-colors">
                      ${config.productName} for ${titleCase(ind)}
                    </Link>
                  </li>`
    )
    .join("\n");

  const useCaseLinks = config.useCases
    .slice(0, 5)
    .map(
      (uc) =>
        `                  <li>
                    <Link href="/use-cases/${slugify(uc)}" className="text-sm text-text-muted hover:text-brand-400 transition-colors">
                      ${titleCase(uc)}
                    </Link>
                  </li>`
    )
    .join("\n");

  return `      {/* -------------------------------------------------------- */}
      {/* Internal Links — cross-link mesh across all SEO categories */}
      {/* -------------------------------------------------------- */}
      <section className="mt-16 pt-8 border-t border-white/5">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-6">
          Explore More
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Comparisons */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Comparisons</p>
            <ul className="space-y-2">
${competitorLinks}
            </ul>
          </div>
          {/* Built For */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Built For</p>
            <ul className="space-y-2">
${industryLinks}
            </ul>
          </div>
          {/* Use Cases */}
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Use Cases</p>
            <ul className="space-y-2">
${useCaseLinks}
            </ul>
          </div>
        </div>
      </section>`;
}

/**
 * Generate 3-5 FAQ items relevant to a comparison page.
 * These are specific enough to be useful for SEO (Google shows FAQPage
 * rich snippets) while being templatable across any AI tool comparison.
 */
function generateComparisonFaqs(
  productName: string,
  competitor: string,
  pricing: SeoConfig["pricing"]
): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Is ${productName} better than ${competitor}?`,
      answer: `${productName} offers a generous free tier (${pricing.free}), transparent pricing, and no watermarks on output. Many users switch from ${competitor} for the simpler pricing and faster processing speeds.`,
    },
    {
      question: `How much does ${productName} cost compared to ${competitor}?`,
      answer: `${productName} offers three tiers: Free (${pricing.free}), Basic (${pricing.basic}), and Pro (${pricing.pro}). This is typically more affordable than ${competitor} for regular users.`,
    },
    {
      question: `Can I switch from ${competitor} to ${productName}?`,
      answer: `Yes. ${productName} works with the same standard image formats. Simply upload your files and start processing — no migration needed. Your first images are free so you can compare quality before committing.`,
    },
    {
      question: `Does ${productName} have an API like ${competitor}?`,
      answer: `${productName} focuses on providing the best browser-based experience with instant results. For high-volume needs, the Pro plan (${pricing.pro}) includes batch processing capabilities.`,
    },
  ];
}

/**
 * Generate FAQ items for an industry-specific landing page.
 */
function generateIndustryFaqs(
  productName: string,
  industry: string,
  pricing: SeoConfig["pricing"],
  category: string
): Array<{ question: string; answer: string }> {
  const industryTitle = titleCase(industry);
  return [
    {
      question: `Why do ${industry} need ${productName}?`,
      answer: `${industryTitle} frequently need ${category.toLowerCase()} capabilities for their daily workflow. ${productName} saves hours of manual work with AI-powered processing that delivers professional results in seconds.`,
    },
    {
      question: `How much does ${productName} cost for ${industry}?`,
      answer: `${productName} starts free (${pricing.free}) so ${industry} can evaluate it risk-free. Paid plans start at ${pricing.basic} for regular use, with unlimited processing at ${pricing.pro}.`,
    },
    {
      question: `Is ${productName} suitable for professional ${industry}?`,
      answer: `Absolutely. ${productName} produces high-resolution, professional-grade output suitable for commercial use. Many professional ${industry} use it daily for client deliverables.`,
    },
    {
      question: `Can ${industry} use ${productName} in bulk?`,
      answer: `Yes. The Pro plan (${pricing.pro}) includes batch processing, making it ideal for ${industry} who need to process multiple files at once.`,
    },
    {
      question: `What file formats does ${productName} support for ${industry}?`,
      answer: `${productName} supports all standard formats including PNG, JPEG, and WebP. Upload images up to 10MB and download in your preferred format — ready for immediate professional use.`,
    },
  ];
}

/**
 * Generate FAQ items for a use-case page.
 */
function generateUseCaseFaqs(
  productName: string,
  useCase: string,
  pricing: SeoConfig["pricing"]
): Array<{ question: string; answer: string }> {
  const useCaseTitle = titleCase(useCase);
  return [
    {
      question: `How does ${productName} work for ${useCase}?`,
      answer: `Simply upload your image and ${productName} uses advanced AI to process it specifically for ${useCase}. Results are delivered in seconds with professional quality.`,
    },
    {
      question: `Is ${productName} free for ${useCase}?`,
      answer: `Yes, ${productName} offers a free tier (${pricing.free}) so you can try it for ${useCase} without any commitment. Paid plans start at ${pricing.basic}.`,
    },
    {
      question: `What quality can I expect for ${useCase}?`,
      answer: `${productName} delivers high-resolution output optimized for ${useCase}. The AI model is trained on millions of images to ensure professional-grade results every time.`,
    },
    {
      question: `Can I use ${productName} for commercial ${useCase}?`,
      answer: `Yes. All output from ${productName} can be used commercially. There are no watermarks on paid plans, making it perfect for professional ${useCase} work.`,
    },
  ];
}

/* ============================================================
 * PAGE GENERATORS — Each function returns a complete .tsx file string
 * ============================================================ */

/**
 * Generate a /vs/[competitor] comparison page.
 *
 * WHY THIS PAGE TYPE:
 * "X vs Y" is one of the highest-intent search queries for SaaS products.
 * Users searching "remove.bg vs photoroom" are actively comparing tools and
 * are close to a purchase decision. These pages capture that bottom-of-funnel traffic.
 *
 * DESIGN:
 * Uses the same surface-primary/brand-600 design system as the dynamic route pages
 * in src/app/vs/[competitor]/page.tsx for visual consistency across the clone.
 */
function generateComparisonPage(config: SeoConfig, competitor: string): string {
  const competitorSlug = slugify(competitor);
  const faqs = generateComparisonFaqs(config.productName, competitor, config.pricing);
  const faqJsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    null,
    2
  );

  const softwareJsonLd = buildSoftwareApplicationJsonLd(config);

  const featuresListJsx = config.coreFeatures
    .map(
      (feature) =>
        `              <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-4 pr-4 font-medium">${feature}</td>
                <td className="py-4 px-4 text-brand-400">Yes</td>
                <td className="py-4 pl-4 text-text-secondary">Varies</td>
              </tr>`
    )
    .join("\n");

  /**
   * Other competitor slugs for cross-linking at the bottom of the page.
   * Linking to sibling /vs/ pages keeps users on-site and distributes
   * PageRank to the entire comparison page cluster.
   */
  const otherCompetitorLinks = config.competitors
    .filter((c) => c !== competitor)
    .slice(0, 5)
    .map(
      (c) =>
        `              <Link
                href="/vs/${slugify(c)}"
                className="px-4 py-2 rounded-lg bg-surface-secondary border border-white/5 text-sm text-text-secondary hover:text-text-primary hover:border-brand-500/30 transition-colors"
              >
                ${config.productName} vs ${c}
              </Link>`
    )
    .join("\n");

  const internalLinksJsx = generateInternalLinksJsx(config);

  return `/**
 * Comparison page: ${config.productName} vs ${competitor}
 *
 * Generated by scripts/generate-seo-pages.ts — DO NOT EDIT MANUALLY.
 * Re-run the generator to update. Manual edits will be overwritten.
 *
 * SEO TARGET: "${config.productName} vs ${competitor}" — high-intent comparison keyword.
 * Users searching this phrase are actively evaluating alternatives and are close
 * to a purchase decision, making this a bottom-of-funnel conversion page.
 */
import type { Metadata } from "next";
import Link from "next/link";

const PAGE_TITLE = "${config.productName} vs ${competitor} — Which Is Better in 2026?";
const PAGE_DESCRIPTION = "Compare ${config.productName} and ${competitor} side by side. See pricing, features, quality, and speed differences. Find out which ${config.category.toLowerCase()} tool is right for you.";
const CANONICAL_URL = "https://${config.domain}/vs/${competitorSlug}";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const FAQ_JSON_LD = ${faqJsonLd};

const SOFTWARE_JSON_LD = ${softwareJsonLd};

export default function ComparisonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
      />

      <main className="min-h-screen bg-surface-primary text-text-primary">
        {/* Navigation bar — consistent with landing page for brand trust */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold gradient-text">
              ${config.productName}
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="${config.ctaPath}"
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
              >
                Try Free
              </Link>
            </div>
          </div>
        </nav>

        <div className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Hero — targets "[Product] vs [Competitor]" keyword in H1 */}
            <section className="mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-text-secondary mb-6">
                Comparison
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                ${config.productName} vs{" "}
                <span className="gradient-text">${competitor}</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed max-w-3xl">
                Looking for a ${competitor} alternative? ${config.productName} offers
                AI-powered processing with a free tier, faster workflows, and transparent
                pricing. Here is how they compare.
              </p>
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                ${config.ctaText}
              </Link>
            </section>

            {/* Feature Comparison Table */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                Feature Comparison:{" "}
                <span className="gradient-text">${config.productName}</span> vs ${competitor}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 pr-4 text-text-secondary font-medium">Feature</th>
                      <th className="text-left py-4 px-4 font-semibold text-brand-400">${config.productName}</th>
                      <th className="text-left py-4 pl-4 text-text-secondary font-medium">${competitor}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-4 font-medium">Free Tier</td>
                      <td className="py-4 px-4 text-brand-400">${config.pricing.free}</td>
                      <td className="py-4 pl-4 text-text-secondary">Limited or None</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-4 font-medium">Starting Price</td>
                      <td className="py-4 px-4 text-brand-400">${config.pricing.basic.split(" ")[0]}</td>
                      <td className="py-4 pl-4 text-text-secondary">Varies</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-4 font-medium">No Credit Card to Start</td>
                      <td className="py-4 px-4 text-brand-400">Yes</td>
                      <td className="py-4 pl-4 text-text-secondary">Usually required</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-4 font-medium">Processing Speed</td>
                      <td className="py-4 px-4 text-brand-400">5-15 seconds</td>
                      <td className="py-4 pl-4 text-text-secondary">Varies</td>
                    </tr>
${featuresListJsx}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Pricing Comparison */}
            <section className="mb-16 p-8 rounded-2xl bg-surface-secondary border border-white/5">
              <h2 className="text-2xl font-bold mb-6">
                Pricing: ${config.productName} vs ${competitor}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-surface-primary border border-brand-500/30">
                  <h3 className="text-lg font-semibold text-brand-400 mb-3">${config.productName}</h3>
                  <ul className="space-y-2 text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      Free: ${config.pricing.free}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      Basic: ${config.pricing.basic}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      Pro: ${config.pricing.pro}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      No credit card required to start
                    </li>
                  </ul>
                </div>
                <div className="p-6 rounded-xl bg-surface-primary border border-white/5">
                  <h3 className="text-lg font-semibold text-text-secondary mb-3">${competitor}</h3>
                  <ul className="space-y-2 text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-text-muted">&#8212;</span>
                      Pricing varies by plan and usage
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-text-muted">&#8212;</span>
                      May require credit card for signup
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
${faqs.map((faq) => `                <details className="group p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                    ${faq.question}
                    <span className="text-brand-400 group-open:rotate-45 transition-transform text-xl">+</span>
                  </summary>
                  <p className="mt-4 text-text-secondary leading-relaxed">${faq.answer}</p>
                </details>`).join("\n")}
              </div>
            </section>

            {/* Other Comparisons */}
${otherCompetitorLinks ? `            <section className="mb-16">
              <h2 className="text-xl font-bold mb-4 text-text-secondary">More Comparisons</h2>
              <div className="flex flex-wrap gap-3">
${otherCompetitorLinks}
              </div>
            </section>` : ""}

            {/* Final CTA */}
            <section className="text-center py-12 px-8 rounded-2xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-white/5">
              <h2 className="text-3xl font-bold mb-4">
                Ready to try ${config.productName}?
              </h2>
              <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
                Start free — no credit card required. See why users are switching from ${competitor}.
              </p>
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Get Started Free
              </Link>
            </section>

${internalLinksJsx}
          </div>
        </div>
      </main>
    </>
  );
}
`;
}

/**
 * Generate a /for/[industry] industry-specific landing page.
 *
 * WHY THIS PAGE TYPE:
 * Industry pages capture searches like "background remover for real estate agents"
 * or "logo generator for startups". These are mid-funnel queries from users who
 * know their industry and are looking for a tool that understands their workflow.
 */
function generateIndustryPage(config: SeoConfig, industry: string): string {
  const industrySlug = slugify(industry);
  const industryTitle = titleCase(industry);
  const faqs = generateIndustryFaqs(config.productName, industry, config.pricing, config.category);
  const faqJsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    null,
    2
  );

  const softwareJsonLd = buildSoftwareApplicationJsonLd(config);

  const featuresJsx = config.coreFeatures
    .map(
      (feature) =>
        `                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 flex items-start gap-4">
                  <span className="text-brand-400 text-lg mt-0.5 flex-shrink-0">&#10003;</span>
                  <p className="text-text-secondary leading-relaxed">${feature}</p>
                </div>`
    )
    .join("\n");

  /**
   * Other industry slugs for cross-linking to sibling /for/ pages.
   */
  const otherIndustryLinks = config.industries
    .filter((ind) => ind !== industry)
    .slice(0, 5)
    .map(
      (ind) =>
        `              <Link
                href="/for/${slugify(ind)}"
                className="px-4 py-2 rounded-lg bg-surface-secondary border border-white/5 text-sm text-text-secondary hover:text-text-primary hover:border-brand-500/30 transition-colors"
              >
                ${config.productName} for ${titleCase(ind)}
              </Link>`
    )
    .join("\n");

  const internalLinksJsx = generateInternalLinksJsx(config);

  return `/**
 * Industry page: ${config.productName} for ${industryTitle}
 *
 * Generated by scripts/generate-seo-pages.ts — DO NOT EDIT MANUALLY.
 * Re-run the generator to update. Manual edits will be overwritten.
 *
 * SEO TARGET: "${config.productName} for ${industry}" — industry-vertical keyword.
 * Captures mid-funnel traffic from ${industry} searching for ${config.category.toLowerCase()} tools
 * tailored to their professional workflow.
 */
import type { Metadata } from "next";
import Link from "next/link";

const PAGE_TITLE = "${config.productName} for ${industryTitle} — ${config.category} Built for Your Workflow";
const PAGE_DESCRIPTION = "See how ${industry} use ${config.productName} to save time and deliver professional results. ${config.tagline}. Start free today.";
const CANONICAL_URL = "https://${config.domain}/for/${industrySlug}";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const FAQ_JSON_LD = ${faqJsonLd};

const SOFTWARE_JSON_LD = ${softwareJsonLd};

export default function IndustryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
      />

      <main className="min-h-screen bg-surface-primary text-text-primary">
        {/* Navigation bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold gradient-text">
              ${config.productName}
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="${config.ctaPath}"
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
              >
                Try Free
              </Link>
            </div>
          </div>
        </nav>

        <div className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Hero — speaks directly to the audience's identity */}
            <section className="mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-text-secondary mb-6">
                Built for ${industryTitle}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                ${config.productName} for{" "}
                <span className="gradient-text">${industryTitle}</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed max-w-3xl">
                ${config.tagline}. Purpose-built for the way ${industry} work — fast,
                reliable, and professional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="${config.ctaPath}"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  ${config.ctaText}
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 text-text-secondary hover:text-text-primary text-lg transition-colors"
                >
                  See Pricing
                </Link>
              </div>
              <p className="mt-6 text-sm text-text-muted">
                ${config.pricing.free} free — No credit card required
              </p>
            </section>

            {/* Why this tool for this industry */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                Why <span className="gradient-text">${industryTitle}</span> Choose ${config.productName}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <h3 className="text-lg font-semibold mb-2">Save Hours Every Week</h3>
                  <p className="text-text-secondary leading-relaxed">
                    What used to take minutes per image now takes seconds. ${industryTitle}
                    process dozens of files daily — ${config.productName} handles the heavy
                    lifting so you can focus on creative work.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <h3 className="text-lg font-semibold mb-2">Professional-Grade Output</h3>
                  <p className="text-text-secondary leading-relaxed">
                    AI trained on millions of images delivers results that meet the standards
                    ${industry} and their clients expect. No compromises on quality.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <h3 className="text-lg font-semibold mb-2">Simple Pricing That Scales</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Start with ${config.pricing.free} free. Scale to ${config.pricing.basic}
                    or ${config.pricing.pro} as your volume grows. No surprises, no hidden fees.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <h3 className="text-lg font-semibold mb-2">No Learning Curve</h3>
                  <p className="text-text-secondary leading-relaxed">
                    Upload, process, download. ${config.productName} is designed to be instantly
                    productive — no tutorials, no complex settings, no plugins to install.
                  </p>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section className="mb-16 p-8 rounded-2xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-white/5">
              <h2 className="text-2xl font-bold mb-6">Key Features for ${industryTitle}</h2>
              <div className="grid gap-4">
${featuresJsx}
              </div>
            </section>

            {/* Stats */}
            <section className="mb-16">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-1">100x</p>
                  <p className="text-sm text-text-muted">Faster than manual editing</p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-1">$0</p>
                  <p className="text-sm text-text-muted">To get started — free tier included</p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-1">Pro</p>
                  <p className="text-sm text-text-muted">Quality from state-of-the-art AI</p>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">FAQ for ${industryTitle}</h2>
              <div className="space-y-4">
${faqs.map((faq) => `                <details className="group p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                    ${faq.question}
                    <span className="text-brand-400 group-open:rotate-45 transition-transform text-xl">+</span>
                  </summary>
                  <p className="mt-4 text-text-secondary leading-relaxed">${faq.answer}</p>
                </details>`).join("\n")}
              </div>
            </section>

            {/* Other Industries */}
${otherIndustryLinks ? `            <section className="mb-16">
              <h2 className="text-xl font-bold mb-4 text-text-secondary">Also Built For</h2>
              <div className="flex flex-wrap gap-3">
${otherIndustryLinks}
              </div>
            </section>` : ""}

            {/* Final CTA */}
            <section className="text-center py-12 px-8 rounded-2xl bg-surface-secondary border border-white/5">
              <h2 className="text-3xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
                Join ${industry} who trust ${config.productName} for their daily workflow.
                Free to start, no credit card required.
              </p>
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Get Started Free
              </Link>
            </section>

${internalLinksJsx}
          </div>
        </div>
      </main>
    </>
  );
}
`;
}

/**
 * Generate a /use-cases/[use-case] page.
 *
 * WHY THIS PAGE TYPE:
 * Use-case pages capture searches like "AI background remover for product photos"
 * or "AI logo generator for youtube". These are high-intent queries from users
 * who know exactly what they want to accomplish.
 */
function generateUseCasePage(config: SeoConfig, useCase: string): string {
  const useCaseSlug = slugify(useCase);
  const useCaseTitle = titleCase(useCase);
  const faqs = generateUseCaseFaqs(config.productName, useCase, config.pricing);
  const faqJsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    null,
    2
  );

  /**
   * HowTo JSON-LD schema — earns step-by-step rich results in Google.
   * This is the same schema type used by the dynamic route version in
   * src/app/use-cases/[use-case]/page.tsx for consistent SERP treatment.
   */
  const howToJsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to Create ${useCaseTitle} with ${config.productName}`,
      description: `Use ${config.productName} for ${useCase}. AI-powered ${config.category.toLowerCase()} that delivers professional results instantly.`,
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Upload",
          text: "Drag and drop your image or click to browse. Supports JPG, PNG, and WebP up to 10MB.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Process",
          text: `Our AI analyzes and processes your image specifically for ${useCase}. Takes just seconds.`,
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Download",
          text: "Download your processed image in high resolution. Ready for immediate professional use.",
        },
      ],
      tool: {
        "@type": "HowToTool",
        name: config.productName,
      },
    },
    null,
    2
  );

  const softwareJsonLd = buildSoftwareApplicationJsonLd(config);

  /**
   * Other use-case slugs for cross-linking to sibling /use-cases/ pages.
   */
  const otherUseCaseLinks = config.useCases
    .filter((uc) => uc !== useCase)
    .slice(0, 5)
    .map(
      (uc) =>
        `              <Link
                href="/use-cases/${slugify(uc)}"
                className="px-4 py-2 rounded-lg bg-surface-secondary border border-white/5 text-sm text-text-secondary hover:text-text-primary hover:border-brand-500/30 transition-colors"
              >
                ${titleCase(uc)}
              </Link>`
    )
    .join("\n");

  const internalLinksJsx = generateInternalLinksJsx(config);

  return `/**
 * Use case page: ${config.productName} for ${useCaseTitle}
 *
 * Generated by scripts/generate-seo-pages.ts — DO NOT EDIT MANUALLY.
 * Re-run the generator to update. Manual edits will be overwritten.
 *
 * SEO TARGET: "${config.productName} for ${useCase}" — use-case-specific keyword.
 * Captures high-intent traffic from users who know exactly what they want to achieve.
 */
import type { Metadata } from "next";
import Link from "next/link";

const PAGE_TITLE = "How to Create ${useCaseTitle} with AI — ${config.productName}";
const PAGE_DESCRIPTION = "Use ${config.productName} for ${useCase}. AI-powered ${config.category.toLowerCase()} that delivers professional results instantly. Free to start, no credit card required.";
const CANONICAL_URL = "https://${config.domain}/use-cases/${useCaseSlug}";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const FAQ_JSON_LD = ${faqJsonLd};

const HOW_TO_JSON_LD = ${howToJsonLd};

const SOFTWARE_JSON_LD = ${softwareJsonLd};

export default function UseCasePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOW_TO_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
      />

      <main className="min-h-screen bg-surface-primary text-text-primary">
        {/* Navigation bar */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold gradient-text">
              ${config.productName}
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="${config.ctaPath}"
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
              >
                Try Free
              </Link>
            </div>
          </div>
        </nav>

        <div className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            {/* Hero — targets "How to [Use Case] with AI" keyword */}
            <section className="mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-text-secondary mb-6">
                Step-by-Step Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                How to Create{" "}
                <span className="gradient-text">${useCaseTitle}</span> with AI
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed max-w-3xl">
                Create perfect ${useCase} with AI-powered ${config.category.toLowerCase()}.
                Upload, process, and download in seconds.
              </p>
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Try It Free Now
              </Link>
            </section>

            {/* Step-by-Step Guide — matches HowTo JSON-LD schema */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                ${useCaseTitle} in <span className="gradient-text">3 Easy Steps</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-6 p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-brand-400 font-bold text-lg">01</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Upload</h3>
                    <p className="text-text-secondary leading-relaxed">
                      Drag and drop your image or click to browse. Supports JPG, PNG, and WebP up to 10MB.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-brand-400 font-bold text-lg">02</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Process</h3>
                    <p className="text-text-secondary leading-relaxed">
                      Our AI analyzes and processes your image specifically for ${useCase}. Takes just seconds.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <span className="text-brand-400 font-bold text-lg">03</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Download</h3>
                    <p className="text-text-secondary leading-relaxed">
                      Download your processed image in high resolution. Ready for immediate professional use.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Before/After Placeholder */}
            <section className="mb-16 p-8 rounded-2xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-white/5">
              <h2 className="text-2xl font-bold mb-6 text-center">See the Difference</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="aspect-video rounded-xl bg-surface-primary border border-white/5 flex items-center justify-center mb-3">
                    <p className="text-text-muted text-sm">Before — Original Image</p>
                  </div>
                  <p className="text-sm text-text-muted">Before processing</p>
                </div>
                <div className="text-center">
                  <div className="aspect-video rounded-xl bg-surface-primary border border-brand-500/30 flex items-center justify-center mb-3">
                    <p className="text-brand-400 text-sm">After — AI Enhanced</p>
                  </div>
                  <p className="text-sm text-text-muted">After ${config.productName} processing</p>
                </div>
              </div>
            </section>

            {/* Why Use AI for This */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                Why Use AI for ${useCaseTitle}?
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-2">100x</p>
                  <p className="text-text-secondary text-sm">Faster than manual editing</p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-2">$0</p>
                  <p className="text-text-secondary text-sm">To get started — free tier included</p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-2">Pro</p>
                  <p className="text-text-secondary text-sm">Quality results from state-of-the-art AI</p>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">${useCaseTitle} FAQ</h2>
              <div className="space-y-4">
${faqs.map((faq) => `                <details className="group p-6 rounded-xl bg-surface-secondary border border-white/5">
                  <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                    ${faq.question}
                    <span className="text-brand-400 group-open:rotate-45 transition-transform text-xl">+</span>
                  </summary>
                  <p className="mt-4 text-text-secondary leading-relaxed">${faq.answer}</p>
                </details>`).join("\n")}
              </div>
            </section>

            {/* Related Use Cases */}
${otherUseCaseLinks ? `            <section className="mb-16">
              <h2 className="text-xl font-bold mb-4 text-text-secondary">Related Use Cases</h2>
              <div className="flex flex-wrap gap-3">
${otherUseCaseLinks}
              </div>
            </section>` : ""}

            {/* Final CTA */}
            <section className="text-center py-12 px-8 rounded-2xl bg-surface-secondary border border-white/5">
              <h2 className="text-3xl font-bold mb-4">
                Create ${useCaseTitle} in Seconds
              </h2>
              <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
                Upload your image and let ${config.productName} handle the rest.
                ${config.pricing.free} free — no credit card required.
              </p>
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Get Started Free
              </Link>
            </section>

${internalLinksJsx}
          </div>
        </div>
      </main>
    </>
  );
}
`;
}

/**
 * Generate the SEO hub/index page at /seo that links to all generated pages.
 *
 * WHY THIS PAGE:
 * Internal linking is critical for SEO. Search engines discover pages through links.
 * This hub page creates a central node that links to every generated SEO page,
 * distributing PageRank and making sure crawlers find all pages efficiently.
 * It also serves as a useful "explore" page for human visitors.
 */
function generateSeoIndexPage(config: SeoConfig): string {
  const competitorLinks = config.competitors
    .map((c) => {
      const slug = slugify(c);
      return `                <Link
                  href="/vs/${slug}"
                  className="p-4 rounded-xl bg-surface-secondary border border-white/5 hover:border-brand-500/30 transition-colors block"
                >
                  <p className="font-medium text-text-primary">${config.productName} vs ${c}</p>
                  <p className="text-sm text-text-muted mt-1">Side-by-side comparison</p>
                </Link>`;
    })
    .join("\n");

  const industryLinks = config.industries
    .map((ind) => {
      const slug = slugify(ind);
      const title = titleCase(ind);
      return `                <Link
                  href="/for/${slug}"
                  className="p-4 rounded-xl bg-surface-secondary border border-white/5 hover:border-brand-500/30 transition-colors block"
                >
                  <p className="font-medium text-text-primary">${config.productName} for ${title}</p>
                  <p className="text-sm text-text-muted mt-1">Industry-specific solution</p>
                </Link>`;
    })
    .join("\n");

  const useCaseLinks = config.useCases
    .map((uc) => {
      const slug = slugify(uc);
      const title = titleCase(uc);
      return `                <Link
                  href="/use-cases/${slug}"
                  className="p-4 rounded-xl bg-surface-secondary border border-white/5 hover:border-brand-500/30 transition-colors block"
                >
                  <p className="font-medium text-text-primary">${title}</p>
                  <p className="text-sm text-text-muted mt-1">Step-by-step guide</p>
                </Link>`;
    })
    .join("\n");

  const totalPages =
    config.competitors.length + config.industries.length + config.useCases.length;

  return `/**
 * SEO Hub Page — Internal linking index for all generated programmatic SEO pages.
 *
 * Generated by scripts/generate-seo-pages.ts — DO NOT EDIT MANUALLY.
 *
 * PURPOSE:
 * This page acts as a central hub that links to every comparison, industry,
 * and use-case page. Search engines follow these internal links to discover
 * and index all generated SEO pages. It also distributes PageRank from the
 * homepage (which links here via the footer) to all long-tail pages.
 *
 * TOTAL PAGES: ${totalPages} (${config.competitors.length} comparisons + ${config.industries.length} industries + ${config.useCases.length} use cases)
 */
import type { Metadata } from "next";
import Link from "next/link";

const PAGE_TITLE = "${config.productName} — Comparisons, Use Cases & Industry Solutions";
const PAGE_DESCRIPTION = "Explore how ${config.productName} compares to alternatives, see industry-specific solutions, and find the perfect use case for your needs. ${totalPages}+ guides available.";
const CANONICAL_URL = "https://${config.domain}/seo";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: CANONICAL_URL,
    type: "website",
  },
};

export default function SeoIndexPage() {
  return (
    <main className="min-h-screen bg-surface-primary text-text-primary">
      {/* Navigation bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">
            ${config.productName}
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="${config.ctaPath}"
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              Try Free
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <section className="mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">${config.productName}</span> — Explore
            </h1>
            <p className="text-xl text-text-secondary max-w-3xl">
              Find comparisons, industry solutions, and use-case guides. ${totalPages}+ pages
              to help you decide if ${config.productName} is right for your workflow.
            </p>
          </section>

          {/* Comparisons */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Comparisons</h2>
            <p className="text-text-secondary mb-6">
              See how ${config.productName} stacks up against popular alternatives.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
${competitorLinks}
            </div>
          </section>

          {/* Industries */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Built For</h2>
            <p className="text-text-secondary mb-6">
              ${config.productName} is designed for professionals across many industries.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
${industryLinks}
            </div>
          </section>

          {/* Use Cases */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Use Cases</h2>
            <p className="text-text-secondary mb-6">
              Step-by-step guides for common tasks you can accomplish with ${config.productName}.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
${useCaseLinks}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-12 px-8 rounded-2xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-white/5">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-text-secondary mb-8">
              Try ${config.productName} free — no credit card required.
            </p>
            <Link
              href="${config.ctaPath}"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ${config.ctaText}
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
`;
}

/**
 * Generate the sitemap extension file with paths for all generated SEO pages.
 * The main sitemap.ts imports this file (if it exists) and merges the paths
 * into the full sitemap, ensuring search engines discover every generated page.
 */
function generateSitemapExtension(config: SeoConfig): string {
  const allPaths: string[] = [];

  allPaths.push("/seo");

  for (const competitor of config.competitors) {
    allPaths.push(`/vs/${slugify(competitor)}`);
  }

  for (const industry of config.industries) {
    allPaths.push(`/for/${slugify(industry)}`);
  }

  for (const useCase of config.useCases) {
    allPaths.push(`/use-cases/${slugify(useCase)}`);
  }

  const pathsArray = allPaths.map((p) => `  "${p}",`).join("\n");

  return `/**
 * SEO page sitemap paths — auto-generated by scripts/generate-seo-pages.ts
 *
 * DO NOT EDIT MANUALLY. Re-run the generator to update.
 *
 * Imported by src/app/sitemap.ts to include all generated SEO pages in the
 * XML sitemap that search engines use for crawl discovery.
 *
 * Generated from seo-config.json: ${config.competitors.length} competitor pages,
 * ${config.industries.length} industry pages, ${config.useCases.length} use-case pages,
 * plus 1 SEO hub/index page = ${allPaths.length} total new pages.
 */

export const SEO_SITEMAP_PATHS: string[] = [
${pathsArray}
];
`;
}

/* ============================================================
 * MAIN — Read config, generate all pages, write to disk
 * ============================================================ */

function main() {
  const configPath = process.argv[2] || path.join(process.cwd(), "seo-config.json");

  if (!fs.existsSync(configPath)) {
    console.error(`ERROR: Config file not found at ${configPath}`);
    console.error("Usage: npx tsx scripts/generate-seo-pages.ts [path/to/seo-config.json]");
    process.exit(1);
  }

  const config: SeoConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  console.log(`\nGenerating SEO pages for: ${config.productName}`);
  console.log(`Domain: ${config.domain}`);
  console.log(`Competitors: ${config.competitors.length}`);
  console.log(`Industries: ${config.industries.length}`);
  console.log(`Use Cases: ${config.useCases.length}`);

  const appDir = path.join(process.cwd(), "src", "app");
  let totalGenerated = 0;

  /* --- /vs/[competitor] pages --- */
  for (const competitor of config.competitors) {
    const slug = slugify(competitor);
    const dir = path.join(appDir, "vs", slug);
    fs.mkdirSync(dir, { recursive: true });
    const content = generateComparisonPage(config, competitor);
    fs.writeFileSync(path.join(dir, "page.tsx"), content, "utf-8");
    console.log(`  + /vs/${slug}/page.tsx`);
    totalGenerated++;
  }

  /* --- /for/[industry] pages --- */
  for (const industry of config.industries) {
    const slug = slugify(industry);
    const dir = path.join(appDir, "for", slug);
    fs.mkdirSync(dir, { recursive: true });
    const content = generateIndustryPage(config, industry);
    fs.writeFileSync(path.join(dir, "page.tsx"), content, "utf-8");
    console.log(`  + /for/${slug}/page.tsx`);
    totalGenerated++;
  }

  /* --- /use-cases/[use-case] pages --- */
  for (const useCase of config.useCases) {
    const slug = slugify(useCase);
    const dir = path.join(appDir, "use-cases", slug);
    fs.mkdirSync(dir, { recursive: true });
    const content = generateUseCasePage(config, useCase);
    fs.writeFileSync(path.join(dir, "page.tsx"), content, "utf-8");
    console.log(`  + /use-cases/${slug}/page.tsx`);
    totalGenerated++;
  }

  /* --- /seo index hub page --- */
  const seoDir = path.join(appDir, "seo");
  fs.mkdirSync(seoDir, { recursive: true });
  const seoIndex = generateSeoIndexPage(config);
  fs.writeFileSync(path.join(seoDir, "page.tsx"), seoIndex, "utf-8");
  console.log(`  + /seo/page.tsx (hub page)`);
  totalGenerated++;

  /* --- sitemap extension file --- */
  const libDir = path.join(process.cwd(), "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });
  const sitemapExt = generateSitemapExtension(config);
  fs.writeFileSync(path.join(libDir, "seo-sitemap-paths.ts"), sitemapExt, "utf-8");
  console.log(`  + src/lib/seo-sitemap-paths.ts`);

  console.log(`\nDone! Generated ${totalGenerated} pages + sitemap extension.`);
  console.log(`Total indexable pages: ${totalGenerated} (${config.competitors.length} comparison + ${config.industries.length} industry + ${config.useCases.length} use-case + 1 hub)`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run 'npm run build' to verify all pages compile`);
  console.log(`  2. Deploy and submit updated sitemap to Google Search Console`);
  console.log(`  3. Customize seo-config.json with real product data for better ranking`);
}

main();
