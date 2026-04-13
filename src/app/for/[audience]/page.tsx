/**
 * Audience-Specific Landing Page — "Best AI [Tool] for [Audience]"
 *
 * WHY THIS PAGE EXISTS:
 * People searching "best AI background remover for photographers" have a
 * specific identity and specific pain points. A generic landing page ignores
 * their context. This page speaks directly to each audience segment —
 * acknowledging their unique challenges and explaining how our tool fits
 * their workflow. This specificity improves both SEO ranking (long-tail
 * keyword match) and conversion (visitors feel understood).
 *
 * ROUTE: /for/[audience]
 * Example: /for/photographers -> "Best AI Tool for Photographers — AI Tool Name"
 *
 * SEO STRUCTURE:
 * - Unique <title> targeting "best AI [tool] for [audience]"
 * - JSON-LD FAQPage schema for rich snippet eligibility
 * - Pain point section (validates their problems)
 * - Solution section (how we solve those problems)
 * - Social proof placeholder (testimonials section)
 * - CTA to signup/trial
 *
 * IMPORTED BY: Next.js App Router (auto-discovered)
 * DATA SOURCE: src/config/seo-pages.ts (SEO_PAGES_CONFIG.audiences)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEO_PAGES_CONFIG } from "@/config/seo-pages";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";
import { SeoInternalLinks } from "@/components/SeoInternalLinks";

interface AudiencePageProps {
  params: Promise<{ audience: string }>;
}

/**
 * generateStaticParams — tells Next.js which /for/ pages to pre-render.
 * Each audience slug in the config becomes a static HTML page at build time.
 */
export async function generateStaticParams() {
  return SEO_PAGES_CONFIG.audiences.map((audienceEntry) => ({
    audience: audienceEntry.slug,
  }));
}

/**
 * generateMetadata — unique title and description for each audience page.
 * The title follows the "Best X for Y" keyword pattern that captures
 * high-intent search traffic from people looking for a recommendation.
 */
export async function generateMetadata({
  params,
}: AudiencePageProps): Promise<Metadata> {
  const { audience: audienceSlug } = await params;
  const audienceEntry = SEO_PAGES_CONFIG.audiences.find(
    (a) => a.slug === audienceSlug
  );
  if (!audienceEntry) return {};

  const productName = PRODUCT_CONFIG.name;
  const title = `Best AI ${productName} for ${audienceEntry.name} — ${productName}`;
  const description = `${productName} helps ${audienceEntry.name.toLowerCase()} ${audienceEntry.painPoints[0]?.toLowerCase().replace(/\.$/, "") || "get professional results instantly"}. Try free — no credit card required.`;
  const canonicalUrl = `${siteConfig.siteUrl}/for/${audienceSlug}`;

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
 * buildAudienceFaqJsonLd — generates FAQ structured data specific to the
 * audience segment. Each FAQ answers questions a member of this audience
 * would actually ask, improving relevance for their search queries.
 */
function buildAudienceFaqJsonLd(
  productName: string,
  audienceEntry: (typeof SEO_PAGES_CONFIG.audiences)[number]
) {
  const faqEntries = [
    {
      question: `Is ${productName} good for ${audienceEntry.name.toLowerCase()}?`,
      answer: `Yes — ${productName} is designed with ${audienceEntry.name.toLowerCase()} in mind. ${audienceEntry.howWeHelp.split(".")[0]}.`,
    },
    {
      question: `How much does ${productName} cost for ${audienceEntry.name.toLowerCase()}?`,
      answer: `${productName} offers ${PRODUCT_CONFIG.pricing.free.limit} free uses per ${PRODUCT_CONFIG.pricing.free.period} with no credit card required. Paid plans start at $${PRODUCT_CONFIG.pricing.basic.price}/mo for ${PRODUCT_CONFIG.pricing.basic.limit} uses, or $${PRODUCT_CONFIG.pricing.pro.price}/mo for unlimited access.`,
    },
    {
      question: `What problems does ${productName} solve for ${audienceEntry.name.toLowerCase()}?`,
      answer: `${productName} addresses key challenges ${audienceEntry.name.toLowerCase()} face: ${audienceEntry.painPoints.slice(0, 2).join("; ").toLowerCase().replace(/\.$/, "")}. Our AI handles the heavy lifting so you can focus on your core work.`,
    },
    {
      question: `How do I get started with ${productName}?`,
      answer: `Getting started is free and takes under 30 seconds. Visit the homepage, sign up with Google, and start processing immediately. No credit card required, no software to install.`,
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

export default async function AudienceLandingPage({
  params,
}: AudiencePageProps) {
  const { audience: audienceSlug } = await params;
  const audienceEntry = SEO_PAGES_CONFIG.audiences.find(
    (a) => a.slug === audienceSlug
  );

  if (!audienceEntry) notFound();

  const productName = PRODUCT_CONFIG.name;
  const faqJsonLd = buildAudienceFaqJsonLd(productName, audienceEntry);

  /** Other audience pages for internal cross-linking */
  const otherAudiencePages = SEO_PAGES_CONFIG.audiences.filter(
    (a) => a.slug !== audienceSlug
  );

  return (
    <>
      {/* JSON-LD FAQPage structured data for Google rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="min-h-screen bg-surface-primary text-text-primary">
        {/* Navigation bar — consistent with landing page */}
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
            {/* Hero Section — speaks directly to the audience's identity */}
            {/* and establishes immediate relevance.                      */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-text-secondary mb-6">
                Built for {audienceEntry.name}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                The Best AI Tool for{" "}
                <span className="gradient-text">{audienceEntry.name}</span>
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed max-w-3xl">
                {audienceEntry.howWeHelp}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 text-text-secondary hover:text-text-primary text-lg transition-colors"
                >
                  See Pricing
                </Link>
              </div>
              <p className="mt-6 text-sm text-text-muted">
                {PRODUCT_CONFIG.pricing.free.limit} free uses per{" "}
                {PRODUCT_CONFIG.pricing.free.period} — No credit card required
              </p>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Pain Points — validates the audience's specific problems. */}
            {/* When users see their exact frustration described, they    */}
            {/* trust that we understand their needs.                     */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                Challenges{" "}
                <span className="gradient-text">{audienceEntry.name}</span>{" "}
                Face
              </h2>
              <div className="grid gap-4">
                {audienceEntry.painPoints.map(
                  (painPointText, painPointIndex) => (
                    <div
                      key={painPointIndex}
                      className="p-6 rounded-xl bg-surface-secondary border border-white/5 flex items-start gap-4"
                    >
                      <span className="text-red-400/80 text-lg mt-0.5 flex-shrink-0">
                        &#10007;
                      </span>
                      <p className="text-text-secondary leading-relaxed">
                        {painPointText}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* How We Solve It — directly addresses each pain point.     */}
            {/* This section creates the "before vs after" narrative      */}
            {/* that drives conversion.                                   */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16 p-8 rounded-2xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-white/5">
              <h2 className="text-2xl font-bold mb-6">
                How {productName} Helps {audienceEntry.name}
              </h2>
              <div className="space-y-6">
                <p className="text-text-secondary leading-relaxed text-lg">
                  {audienceEntry.howWeHelp}
                </p>
                <div className="grid md:grid-cols-3 gap-4 pt-4">
                  <div className="text-center p-4">
                    <p className="text-3xl font-bold text-brand-400 mb-1">
                      {PRODUCT_CONFIG.pricing.free.limit}
                    </p>
                    <p className="text-sm text-text-muted">
                      Free uses per {PRODUCT_CONFIG.pricing.free.period}
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <p className="text-3xl font-bold text-brand-400 mb-1">
                      5-15s
                    </p>
                    <p className="text-sm text-text-muted">
                      Average processing time
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <p className="text-3xl font-bold text-brand-400 mb-1">
                      ${PRODUCT_CONFIG.pricing.basic.price}
                    </p>
                    <p className="text-sm text-text-muted">
                      Per month to start
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Social Proof Placeholder — ready for real testimonials.   */}
            {/* Renders a professional-looking section even without data. */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                Trusted by {audienceEntry.name} Everywhere
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  `"Saves me hours every week. The results are indistinguishable from manual editing."`,
                  `"Finally, a tool that understands what ${audienceEntry.name.toLowerCase()} actually need."`,
                  `"The free tier let me try it risk-free. Now I can't imagine working without it."`,
                ].map((testimonialText, testimonialIndex) => (
                  <div
                    key={testimonialIndex}
                    className="p-6 rounded-xl bg-surface-secondary border border-white/5"
                  >
                    <p className="text-text-secondary italic leading-relaxed mb-4">
                      {testimonialText}
                    </p>
                    <p className="text-sm text-text-muted">
                      — Verified {audienceEntry.name.endsWith("s")
                        ? audienceEntry.name.slice(0, -1)
                        : audienceEntry.name}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* FAQ — feeds JSON-LD and addresses audience-specific Qs.   */}
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
            {/* Other Audiences — cross-linking to sibling /for/ pages    */}
            {/* -------------------------------------------------------- */}
            {otherAudiencePages.length > 0 && (
              <section className="mb-16">
                <h2 className="text-xl font-bold mb-4 text-text-secondary">
                  Also Built For
                </h2>
                <div className="flex flex-wrap gap-3">
                  {otherAudiencePages.map((otherAudience) => (
                    <Link
                      key={otherAudience.slug}
                      href={`/for/${otherAudience.slug}`}
                      className="px-4 py-2 rounded-lg bg-surface-secondary border border-white/5 text-sm text-text-secondary hover:text-text-primary hover:border-brand-500/30 transition-colors"
                    >
                      {productName} for {otherAudience.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* -------------------------------------------------------- */}
            {/* Final CTA                                                 */}
            {/* -------------------------------------------------------- */}
            <section className="text-center py-12 px-8 rounded-2xl bg-surface-secondary border border-white/5">
              <h2 className="text-3xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
                Join {audienceEntry.name.toLowerCase()} who trust {productName}{" "}
                for their daily workflow. Free to start, no credit card required.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Get Started Free
              </Link>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Internal Links — all SEO page categories                  */}
            {/* -------------------------------------------------------- */}
            <SeoInternalLinks />
          </div>
        </div>
      </main>
    </>
  );
}
