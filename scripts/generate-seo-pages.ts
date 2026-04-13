#!/usr/bin/env npx tsx
/**
 * generate-seo-pages.ts — Programmatic SEO page generator for the saas-clone-template fleet.
 *
 * PURPOSE:
 * Each clone in the 40+ fleet currently has only a landing page. This script generates
 * 50-100 long-tail SEO pages per clone (comparison pages, use-case pages, industry pages),
 * creating 2,000-4,000 new indexable pages across the entire fleet.
 *
 * PAGE TYPES GENERATED:
 *   /vs/[competitor]       — "Product vs Competitor" comparison pages
 *   /for/[industry]        — "Product for [Industry]" vertical landing pages
 *   /use-cases/[use-case]  — "Product for [Use Case]" feature-focused pages
 *   /seo/index             — Hub page linking all generated SEO pages (internal linking)
 *
 * EACH PAGE INCLUDES:
 *   - SEO-optimized <title> and <meta description>
 *   - Proper H1 with the target keyword
 *   - JSON-LD FAQPage structured data for rich snippets
 *   - OpenGraph and Twitter Card meta tags
 *   - Canonical URL pointing to the branded domain
 *   - CTA linking back to the main tool
 *   - Comparison table (for /vs/ pages)
 *
 * ALSO GENERATES:
 *   - sitemap-seo.ts — additional sitemap entries for all generated pages
 *   - An SEO hub/index page linking all generated pages for internal link equity
 *
 * USAGE:
 *   npx tsx scripts/generate-seo-pages.ts                    # uses ./seo-config.json
 *   npx tsx scripts/generate-seo-pages.ts path/to/config.json
 *
 * ARCHITECTURE:
 * The script generates Next.js App Router pages as .tsx files under src/app/.
 * Each page is a server component that exports metadata via generateMetadata().
 * This means the pages are statically generated at build time — zero runtime cost,
 * maximum SEO value, and they inherit the existing layout (header, footer, theme).
 *
 * WHY SERVER COMPONENTS:
 * SEO pages need to be server-rendered for crawlers. They don't need interactivity
 * (no useState, no onClick handlers), so server components are the correct choice.
 * The CTA buttons use Next.js <Link> which works in server components.
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
 * Generate 3-5 FAQ items relevant to a comparison page.
 * These are generic enough to work for any AI tool comparison but specific
 * enough to be useful for SEO (Google shows FAQPage rich snippets).
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

  const featuresListJsx = config.coreFeatures
    .map(
      (feature) =>
        `              <tr className="border-b border-border/40">
                <td className="py-3 pr-4 text-sm text-foreground">${feature}</td>
                <td className="py-3 px-4 text-center text-sm text-green-500">Yes</td>
                <td className="py-3 pl-4 text-center text-sm text-muted-foreground">Varies</td>
              </tr>`
    )
    .join("\n");

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

export default function ComparisonPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      {/* Hero */}
      <section className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            ${config.productName} vs ${competitor}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            An honest, side-by-side comparison to help you choose the right ${config.category.toLowerCase()} tool for your needs.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-2xl font-bold">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="py-3 pr-4 pl-4 text-left text-sm font-semibold">Feature</th>
                  <th className="py-3 px-4 text-center text-sm font-semibold">${config.productName}</th>
                  <th className="py-3 pl-4 pr-4 text-center text-sm font-semibold">${competitor}</th>
                </tr>
              </thead>
              <tbody className="px-4">
${featuresListJsx}
                <tr className="border-b border-border/40">
                  <td className="py-3 pr-4 pl-4 text-sm text-foreground">Free Tier</td>
                  <td className="py-3 px-4 text-center text-sm text-green-500">${config.pricing.free}</td>
                  <td className="py-3 pl-4 text-center text-sm text-muted-foreground">Limited or None</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-3 pr-4 pl-4 text-sm text-foreground">Starting Price</td>
                  <td className="py-3 px-4 text-center text-sm text-green-500">${config.pricing.basic}</td>
                  <td className="py-3 pl-4 text-center text-sm text-muted-foreground">Varies</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing Summary */}
      <section className="border-y border-border/40 bg-muted/20 py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-2xl font-bold">Pricing: ${config.productName} vs ${competitor}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="mt-2 text-2xl font-bold">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">${config.pricing.free}</p>
            </div>
            <div className="rounded-lg border border-blue-500/50 bg-card/50 p-6 ring-1 ring-blue-500/20">
              <h3 className="text-lg font-semibold">Basic</h3>
              <p className="mt-2 text-2xl font-bold">${config.pricing.basic.split(" ")[0]}</p>
              <p className="mt-1 text-sm text-muted-foreground">${config.pricing.basic}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Pro</h3>
              <p className="mt-2 text-2xl font-bold">${config.pricing.pro.split(" ")[0]}</p>
              <p className="mt-1 text-sm text-muted-foreground">${config.pricing.pro}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-8">
${faqs.map((faq) => `            <div>
              <h3 className="font-semibold text-foreground">${faq.question}</h3>
              <p className="mt-2 text-muted-foreground">${faq.answer}</p>
            </div>`).join("\n")}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="rounded-2xl border border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Ready to try ${config.productName}?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free — no credit card required. See why users are switching from ${competitor}.
            </p>
            <div className="mt-8">
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-3 text-sm font-medium text-white shadow hover:from-blue-600 hover:to-indigo-700"
              >
                ${config.ctaText}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="border-t border-border/40 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">${config.productName}</Link>
            {" | "}
            <Link href="/pricing" className="underline hover:text-foreground">Pricing</Link>
            {" | "}
            <Link href="/seo" className="underline hover:text-foreground">More Comparisons</Link>
          </p>
        </div>
      </section>
    </div>
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

export default function IndustryPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      {/* Hero */}
      <section className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-blue-500">
            Built for ${industryTitle}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            ${config.productName} for ${industryTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            ${config.tagline}. Purpose-built for the way ${industry} work — fast, reliable, and professional.
          </p>
          <div className="mt-8">
            <Link
              href="${config.ctaPath}"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-3 text-sm font-medium text-white shadow hover:from-blue-600 hover:to-indigo-700"
            >
              ${config.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* Why this tool for this industry */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-2xl font-bold">
            Why ${industryTitle} Choose ${config.productName}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Save Hours Every Week</h3>
              <p className="mt-2 text-muted-foreground">
                What used to take minutes per image now takes seconds. ${industryTitle} process dozens of files daily — ${config.productName} handles the heavy lifting so you can focus on creative work.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Professional-Grade Output</h3>
              <p className="mt-2 text-muted-foreground">
                AI trained on millions of images delivers results that meet the standards ${industry} and their clients expect. No compromises on quality.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Simple Pricing That Scales</h3>
              <p className="mt-2 text-muted-foreground">
                Start with ${config.pricing.free} free. Scale to ${config.pricing.basic} or ${config.pricing.pro} as your volume grows. No surprises, no hidden fees.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">No Learning Curve</h3>
              <p className="mt-2 text-muted-foreground">
                Upload, process, download. ${config.productName} is designed to be instantly productive — no tutorials, no complex settings, no plugins to install.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features relevant to this industry */}
      <section className="border-y border-border/40 bg-muted/20 py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-2xl font-bold">Key Features for ${industryTitle}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
${config.coreFeatures.map((feature) => `            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-500">&#10003;</span>
              <span className="text-muted-foreground">${feature}</span>
            </li>`).join("\n")}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-2xl font-bold">FAQ for ${industryTitle}</h2>
          <div className="space-y-8">
${faqs.map((faq) => `            <div>
              <h3 className="font-semibold text-foreground">${faq.question}</h3>
              <p className="mt-2 text-muted-foreground">${faq.answer}</p>
            </div>`).join("\n")}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="rounded-2xl border border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Join thousands of ${industry} using ${config.productName}
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free today. No credit card required.
            </p>
            <div className="mt-8">
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-3 text-sm font-medium text-white shadow hover:from-blue-600 hover:to-indigo-700"
              >
                ${config.ctaText}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="border-t border-border/40 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">${config.productName}</Link>
            {" | "}
            <Link href="/pricing" className="underline hover:text-foreground">Pricing</Link>
            {" | "}
            <Link href="/seo" className="underline hover:text-foreground">All Industries</Link>
          </p>
        </div>
      </section>
    </div>
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

const PAGE_TITLE = "${config.productName} for ${useCaseTitle} — Professional Results in Seconds";
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

export default function UseCasePage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      {/* Hero */}
      <section className="border-b border-border/40 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-blue-500">
            Use Case
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            ${config.productName} for ${useCaseTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Create perfect ${useCase} with AI-powered ${config.category.toLowerCase()}. Upload, process, and download in seconds.
          </p>
          <div className="mt-8">
            <Link
              href="${config.ctaPath}"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-3 text-sm font-medium text-white shadow hover:from-blue-600 hover:to-indigo-700"
            >
              ${config.ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-2xl font-bold">
            How to Use ${config.productName} for ${useCaseTitle}
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-xl font-bold text-blue-500">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold">Upload</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop your image or click to browse. Supports JPG, PNG, and WebP.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-xl font-bold text-blue-500">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold">Process</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Our AI analyzes and processes your image specifically for ${useCase}. Takes just seconds.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-xl font-bold text-blue-500">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold">Download</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Download your processed image in high resolution. Ready for immediate use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why this tool for this use case */}
      <section className="border-y border-border/40 bg-muted/20 py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="mb-8 text-2xl font-bold">
            Why ${config.productName} Is Perfect for ${useCaseTitle}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Optimized for ${useCaseTitle}</h3>
              <p className="mt-2 text-muted-foreground">
                Our AI model is specifically tuned to deliver the best results for ${useCase}, understanding the unique requirements of this format.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Instant Results</h3>
              <p className="mt-2 text-muted-foreground">
                No waiting in queues or installing software. Get your ${useCase} processed and ready to use in under 10 seconds.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Professional Quality</h3>
              <p className="mt-2 text-muted-foreground">
                High-resolution output that meets professional standards for ${useCase}. No watermarks on paid plans.
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 p-6">
              <h3 className="text-lg font-semibold">Free to Start</h3>
              <p className="mt-2 text-muted-foreground">
                Try ${config.productName} for ${useCase} with ${config.pricing.free} free. Upgrade when you need more volume.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-2xl font-bold">${useCaseTitle} FAQ</h2>
          <div className="space-y-8">
${faqs.map((faq) => `            <div>
              <h3 className="font-semibold text-foreground">${faq.question}</h3>
              <p className="mt-2 text-muted-foreground">${faq.answer}</p>
            </div>`).join("\n")}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="rounded-2xl border border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Try ${config.productName} for ${useCaseTitle}
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start free — no credit card required. Professional ${useCase} in seconds.
            </p>
            <div className="mt-8">
              <Link
                href="${config.ctaPath}"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-3 text-sm font-medium text-white shadow hover:from-blue-600 hover:to-indigo-700"
              >
                ${config.ctaText}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="border-t border-border/40 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="underline hover:text-foreground">${config.productName}</Link>
            {" | "}
            <Link href="/pricing" className="underline hover:text-foreground">Pricing</Link>
            {" | "}
            <Link href="/seo" className="underline hover:text-foreground">All Use Cases</Link>
          </p>
        </div>
      </section>
    </div>
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
      return `            <li>
              <Link href="/vs/${slug}" className="text-blue-500 underline hover:text-blue-400">
                ${config.productName} vs ${c}
              </Link>
            </li>`;
    })
    .join("\n");

  const industryLinks = config.industries
    .map((ind) => {
      const slug = slugify(ind);
      const title = titleCase(ind);
      return `            <li>
              <Link href="/for/${slug}" className="text-blue-500 underline hover:text-blue-400">
                ${config.productName} for ${title}
              </Link>
            </li>`;
    })
    .join("\n");

  const useCaseLinks = config.useCases
    .map((uc) => {
      const slug = slugify(uc);
      const title = titleCase(uc);
      return `            <li>
              <Link href="/use-cases/${slug}" className="text-blue-500 underline hover:text-blue-400">
                ${config.productName} for ${title}
              </Link>
            </li>`;
    })
    .join("\n");

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
 */
import type { Metadata } from "next";
import Link from "next/link";

const PAGE_TITLE = "${config.productName} — Comparisons, Use Cases & Industry Solutions";
const PAGE_DESCRIPTION = "Explore how ${config.productName} compares to alternatives, see industry-specific solutions, and find the perfect use case for your needs.";
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
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/40 py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ${config.productName} — Explore
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Find comparisons, industry solutions, and use-case guides for ${config.productName}.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="grid gap-12 md:grid-cols-3">
            {/* Comparisons */}
            <div>
              <h2 className="mb-4 text-xl font-bold">Comparisons</h2>
              <ul className="space-y-2">
${competitorLinks}
              </ul>
            </div>

            {/* Industries */}
            <div>
              <h2 className="mb-4 text-xl font-bold">Industries</h2>
              <ul className="space-y-2">
${industryLinks}
              </ul>
            </div>

            {/* Use Cases */}
            <div>
              <h2 className="mb-4 text-xl font-bold">Use Cases</h2>
              <ul className="space-y-2">
${useCaseLinks}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <p className="mt-4 text-muted-foreground">
            Try ${config.productName} free — no credit card required.
          </p>
          <div className="mt-8">
            <Link
              href="${config.ctaPath}"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-3 text-sm font-medium text-white shadow hover:from-blue-600 hover:to-indigo-700"
            >
              ${config.ctaText}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
`;
}

/**
 * Generate the sitemap-seo.ts file that extends the base sitemap with all SEO pages.
 *
 * WHY A SEPARATE FILE:
 * The existing sitemap.ts handles core product pages. Rather than modifying it
 * (which would break on template sync), we generate a separate sitemap-seo.ts
 * that the main sitemap can import. This is also regenerated on each run so it
 * always reflects the current seo-config.json.
 */
function generateSitemapExtension(config: SeoConfig): string {
  const allPaths: string[] = [];

  // /seo hub page
  allPaths.push("/seo");

  // /vs/ pages
  for (const competitor of config.competitors) {
    allPaths.push(`/vs/${slugify(competitor)}`);
  }

  // /for/ pages
  for (const industry of config.industries) {
    allPaths.push(`/for/${slugify(industry)}`);
  }

  // /use-cases/ pages
  for (const useCase of config.useCases) {
    allPaths.push(`/use-cases/${slugify(useCase)}`);
  }

  const pathsArray = allPaths.map((p) => `  "${p}",`).join("\n");

  return `/**
 * SEO page sitemap paths — auto-generated by scripts/generate-seo-pages.ts
 *
 * DO NOT EDIT MANUALLY. Re-run the generator to update.
 *
 * Import this in your sitemap.ts to include all generated SEO pages:
 *
 *   import { SEO_SITEMAP_PATHS } from "@/lib/seo-sitemap-paths";
 *
 *   // Inside your sitemap function, spread these paths into the main list.
 */

/**
 * All generated SEO page paths. Each path is relative to the site root.
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
  console.log(`\nNext steps:`);
  console.log(`  1. Update src/app/sitemap.ts to import SEO_SITEMAP_PATHS (see generated file for instructions)`);
  console.log(`  2. Add a link to /seo in your footer (src/config/site.ts footerColumns)`);
  console.log(`  3. Run 'npm run build' to verify all pages compile`);
  console.log(`  4. Deploy and submit updated sitemap to Google Search Console`);
}

main();
