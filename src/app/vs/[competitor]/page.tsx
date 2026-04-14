/**
 * Competitor Comparison Page — "[Our Product] vs [Competitor]"
 *
 * WHY THIS PAGE EXISTS:
 * "X vs Y" searches are high-intent buying keywords. Someone searching
 * "removebg vs canva" is actively comparing tools and ready to choose one.
 * By owning this comparison page, we control the narrative and present
 * our strengths alongside an honest competitor assessment.
 *
 * ROUTE: /vs/[competitor]
 * Example: /vs/canva -> "AI Tool Name vs Canva — Free AI Alternative"
 *
 * SEO STRUCTURE:
 * - Unique <title> targeting "[product] vs [competitor]"
 * - JSON-LD FAQPage schema for rich snippet eligibility
 * - Feature comparison table (the core value of the page)
 * - Pricing comparison (addresses the budget objection)
 * - Internal links to other /vs/, /for/, and /use-cases/ pages
 * - Clear CTA to signup/trial
 *
 * CONTENT QUALITY:
 * These pages are factual and fair — we highlight genuine differences,
 * not FUD. Google (and users) penalize one-sided comparison pages that
 * trash competitors without substance. Our approach: acknowledge what
 * the competitor does well, then explain where we offer a better fit.
 *
 * IMPORTED BY: Next.js App Router (auto-discovered)
 * DATA SOURCE: src/config/seo-pages.ts (SEO_PAGES_CONFIG.competitors)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEO_PAGES_CONFIG } from "@/config/seo-pages";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";
import { SeoInternalLinks } from "@/components/SeoInternalLinks";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

interface CompetitorPageProps {
  params: Promise<{ competitor: string }>;
}

/**
 * generateStaticParams — tells Next.js which /vs/ pages to pre-render.
 * Each competitor slug in the config becomes a static HTML page at build
 * time. No server-side rendering overhead at request time.
 */
export async function generateStaticParams() {
  return SEO_PAGES_CONFIG.competitors.map((competitorEntry) => ({
    competitor: competitorEntry.slug,
  }));
}

/**
 * generateMetadata — produces unique title, description, and OG tags
 * for each competitor comparison page. The title template targets the
 * exact "[Product] vs [Competitor]" keyword people search for.
 */
export async function generateMetadata({
  params,
}: CompetitorPageProps): Promise<Metadata> {
  const { competitor: competitorSlug } = await params;
  const competitorEntry = SEO_PAGES_CONFIG.competitors.find(
    (c) => c.slug === competitorSlug
  );
  if (!competitorEntry) return {};

  const productName = PRODUCT_CONFIG.name;
  const title = `${productName} vs ${competitorEntry.name} — Free AI Alternative`;
  const description = `Compare ${productName} and ${competitorEntry.name} side by side. See features, pricing, and why ${productName} is the better choice for most users. Try free today.`;
  const canonicalUrl = `${siteConfig.siteUrl}/vs/${competitorSlug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

/**
 * buildCompetitorFaqJsonLd — generates FAQ structured data for the
 * comparison page. Google can display these as expandable FAQ snippets
 * directly in search results, increasing click-through rate.
 */
function buildCompetitorFaqJsonLd(
  productName: string,
  competitorEntry: (typeof SEO_PAGES_CONFIG.competitors)[number]
) {
  const faqEntries = [
    {
      question: `Is ${productName} better than ${competitorEntry.name}?`,
      answer: `${productName} offers a more affordable and focused alternative to ${competitorEntry.name}. While ${competitorEntry.name} ${competitorEntry.description.toLowerCase().replace(/\.$/, "")}, ${productName} is purpose-built for AI image processing with a free tier and plans starting at $${PRODUCT_CONFIG.pricing.basic.price}/mo.`,
    },
    {
      question: `How does ${productName} pricing compare to ${competitorEntry.name}?`,
      answer: `${productName} starts with ${PRODUCT_CONFIG.pricing.free.limit} free uses per ${PRODUCT_CONFIG.pricing.free.period} — no credit card required. Paid plans start at $${PRODUCT_CONFIG.pricing.basic.price}/mo. ${competitorEntry.name} charges ${competitorEntry.pricing}.`,
    },
    {
      question: `Can I switch from ${competitorEntry.name} to ${productName}?`,
      answer: `Yes — switching is easy. Sign up for free, try ${productName} with your existing images, and see the results for yourself. No long-term contracts or complicated migration needed.`,
    },
    {
      question: `What does ${productName} do better than ${competitorEntry.name}?`,
      answer: `${productName} specializes in AI-powered image processing, offering ${competitorEntry.weaknesses[0]?.toLowerCase() || "faster processing and simpler workflows"}. Our focused approach means better results for this specific task.`,
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export default async function CompetitorComparisonPage({
  params,
}: CompetitorPageProps) {
  const { competitor: competitorSlug } = await params;
  const competitorEntry = SEO_PAGES_CONFIG.competitors.find(
    (c) => c.slug === competitorSlug
  );

  if (!competitorEntry) notFound();

  const productName = PRODUCT_CONFIG.name;
  const faqJsonLd = buildCompetitorFaqJsonLd(productName, competitorEntry);

  /**
   * Feature comparison rows — structured to show our advantages clearly.
   * The checkmark/cross pattern is the most scannable format for comparison
   * content according to UX research on decision-making pages.
   */
  const comparisonRows = [
    {
      feature: "Free Tier",
      us: `${PRODUCT_CONFIG.pricing.free.limit} free/${PRODUCT_CONFIG.pricing.free.period}`,
      them: "Limited or none",
    },
    {
      feature: "Starting Price",
      us: `$${PRODUCT_CONFIG.pricing.basic.price}/mo`,
      them: competitorEntry.pricing,
    },
    {
      feature: "AI-Powered Processing",
      us: "Purpose-built AI models",
      them: "General-purpose or add-on",
    },
    {
      feature: "No Credit Card to Start",
      us: "Yes",
      them: "Usually required",
    },
    {
      feature: "Processing Speed",
      us: "5-15 seconds",
      them: "Varies",
    },
    {
      feature: "Setup Required",
      us: "None — upload and go",
      them: "Account setup + learning curve",
    },
  ];

  /** Other competitor pages for cross-linking at the bottom of the page */
  const otherCompetitorPages = SEO_PAGES_CONFIG.competitors.filter(
    (c) => c.slug !== competitorSlug
  );

  return (
    <>
      {/* BreadcrumbList — shows "Home > Alternatives > vs Competitor" in SERPs */}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteConfig.siteUrl },
          { name: "Alternatives", url: `${siteConfig.siteUrl}/vs` },
          { name: `vs ${competitorData.name}`, url: `${siteConfig.siteUrl}/vs/${competitorData.slug}` },
        ]}
      />
      {/* JSON-LD FAQPage structured data — earns rich snippets in Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="min-h-screen bg-surface-primary text-text-primary">
        {/* Navigation bar — consistent with landing page for brand trust */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-primary/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold gradient-text">
              {productName}
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/pricing"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
              >
                Try Free
              </Link>
            </div>
          </div>
        </nav>

        <div className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            {/* -------------------------------------------------------- */}
            {/* Hero section — targets the "[Product] vs [Competitor]"     */}
            {/* keyword directly in the H1 for maximum SEO relevance.     */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-text-secondary mb-6">
                Comparison
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {productName} vs{" "}
                <span className="gradient-text">{competitorEntry.name}</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed max-w-3xl">
                Looking for a {competitorEntry.name} alternative?{" "}
                {productName} offers AI-powered image processing with a free
                tier, faster workflows, and transparent pricing. Here is how
                they compare.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Try {productName} Free
              </Link>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Feature Comparison Table — the core content of vs pages.  */}
            {/* Side-by-side format is what users expect from comparison  */}
            {/* pages and Google rewards with rich snippet treatment.     */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                Feature Comparison:{" "}
                <span className="gradient-text">{productName}</span> vs{" "}
                {competitorEntry.name}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-4 pr-4 text-text-secondary font-medium">
                        Feature
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-brand-400">
                        {productName}
                      </th>
                      <th className="text-left py-4 pl-4 text-text-secondary font-medium">
                        {competitorEntry.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 pr-4 font-medium">
                          {row.feature}
                        </td>
                        <td className="py-4 px-4 text-brand-400">
                          {row.us}
                        </td>
                        <td className="py-4 pl-4 text-text-secondary">
                          {row.them}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Pricing Comparison — addresses the budget objection.      */}
            {/* Most users searching "X vs Y" care about price first.    */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16 p-8 rounded-2xl bg-surface-secondary border border-white/5">
              <h2 className="text-2xl font-bold mb-6">
                Pricing: {productName} vs {competitorEntry.name}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-surface-primary border border-brand-500/30">
                  <h3 className="text-lg font-semibold text-brand-400 mb-3">
                    {productName}
                  </h3>
                  <ul className="space-y-2 text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      {PRODUCT_CONFIG.pricing.free.limit} free uses per{" "}
                      {PRODUCT_CONFIG.pricing.free.period}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      Basic: ${PRODUCT_CONFIG.pricing.basic.price}/mo (
                      {PRODUCT_CONFIG.pricing.basic.limit} uses)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      Pro: ${PRODUCT_CONFIG.pricing.pro.price}/mo (unlimited)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">&#10003;</span>
                      No credit card required to start
                    </li>
                  </ul>
                </div>
                <div className="p-6 rounded-xl bg-surface-primary border border-white/5">
                  <h3 className="text-lg font-semibold text-text-secondary mb-3">
                    {competitorEntry.name}
                  </h3>
                  <ul className="space-y-2 text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="text-text-muted">&#8212;</span>
                      Starting at {competitorEntry.pricing}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-text-muted">&#8212;</span>
                      {competitorEntry.description}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Where We Win — honest differentiators, not FUD.           */}
            {/* Lists the competitor's actual weaknesses relative to us.  */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">
                Why Choose {productName} Over {competitorEntry.name}
              </h2>
              <div className="grid gap-4">
                {competitorEntry.weaknesses.map(
                  (weaknessStatement, weaknessIndex) => (
                    <div
                      key={weaknessIndex}
                      className="p-6 rounded-xl bg-surface-secondary border border-white/5 flex items-start gap-4"
                    >
                      <span className="text-brand-400 text-xl mt-0.5 flex-shrink-0">
                        &#10003;
                      </span>
                      <p className="text-text-secondary leading-relaxed">
                        {weaknessStatement}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* FAQ Section — feeds the JSON-LD schema for rich snippets. */}
            {/* Uses native <details> for zero-JS accordion behavior.    */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {(
                  faqJsonLd.mainEntity as Array<{
                    name: string;
                    acceptedAnswer: { text: string };
                  }>
                ).map((faqItem, faqIndex) => (
                  <details
                    key={faqIndex}
                    className="group p-6 rounded-xl bg-surface-secondary border border-white/5"
                  >
                    <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                      {faqItem.name}
                      <span className="text-brand-400 group-open:rotate-45 transition-transform text-xl">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 text-text-secondary leading-relaxed">
                      {faqItem.acceptedAnswer.text}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Other Comparisons — internal linking to sibling /vs/ pages */}
            {/* -------------------------------------------------------- */}
            {otherCompetitorPages.length > 0 && (
              <section className="mb-16">
                <h2 className="text-xl font-bold mb-4 text-text-secondary">
                  More Comparisons
                </h2>
                <div className="flex flex-wrap gap-3">
                  {otherCompetitorPages.map((otherCompetitor) => (
                    <Link
                      key={otherCompetitor.slug}
                      href={`/vs/${otherCompetitor.slug}`}
                      className="px-4 py-2 rounded-lg bg-surface-secondary border border-white/5 text-sm text-text-secondary hover:text-text-primary hover:border-brand-500/30 transition-colors"
                    >
                      {productName} vs {otherCompetitor.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* -------------------------------------------------------- */}
            {/* Final CTA — conversion-focused close to the page.         */}
            {/* -------------------------------------------------------- */}
            <section className="text-center py-12 px-8 rounded-2xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-white/5">
              <h2 className="text-3xl font-bold mb-4">
                Ready to try {productName}?
              </h2>
              <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
                Get {PRODUCT_CONFIG.pricing.free.limit} free uses per{" "}
                {PRODUCT_CONFIG.pricing.free.period} — no credit card required.
                See why users are switching from {competitorEntry.name}.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Get Started Free
              </Link>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Internal Links — cross-link to all SEO page categories.   */}
            {/* -------------------------------------------------------- */}
            <SeoInternalLinks />
          </div>
        </div>
      </main>
    </>
  );
}
