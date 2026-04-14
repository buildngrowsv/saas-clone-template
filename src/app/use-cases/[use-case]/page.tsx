/**
 * Use Case Guide Page — "How to [Use Case] with AI — [Product Name]"
 *
 * WHY THIS PAGE EXISTS:
 * "How to" searches represent problem-solving intent — someone has a task
 * and is looking for the best way to accomplish it. By ranking for
 * "how to remove background from product photos" or "how to enhance
 * images for social media", we capture users at the moment they need
 * a solution and present our tool as the answer.
 *
 * ROUTE: /use-cases/[use-case]
 * Example: /use-cases/product-photos -> "How to Create Product Photos with AI"
 *
 * SEO STRUCTURE:
 * - Unique <title> targeting "How to [use case] with AI"
 * - JSON-LD HowTo schema (earns step-by-step rich snippets in Google)
 * - Numbered step-by-step guide (the core content)
 * - Before/after placeholder section
 * - Related use cases for internal linking
 * - CTA to signup/trial
 *
 * JSON-LD HOWTO SCHEMA:
 * Google's HowTo rich results show step-by-step instructions directly
 * in search results. This is extremely valuable real estate — it gives
 * our page a visual advantage over competitors who only have standard
 * blue links. The schema requires named steps with descriptions, which
 * we generate from the config's steps array.
 *
 * IMPORTED BY: Next.js App Router (auto-discovered)
 * DATA SOURCE: src/config/seo-pages.ts (SEO_PAGES_CONFIG.useCases)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SEO_PAGES_CONFIG } from "@/config/seo-pages";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";
import { SeoInternalLinks } from "@/components/SeoInternalLinks";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

interface UseCasePageProps {
  params: Promise<{ "use-case": string }>;
}

/**
 * generateStaticParams — tells Next.js which /use-cases/ pages to pre-render.
 * Each use case slug in the config becomes a static HTML page at build time.
 */
export async function generateStaticParams() {
  return SEO_PAGES_CONFIG.useCases.map((useCaseEntry) => ({
    "use-case": useCaseEntry.slug,
  }));
}

/**
 * generateMetadata — unique title and description targeting "how to"
 * keywords for each use case. These are high-volume informational
 * queries that convert well when the page includes a clear CTA.
 */
export async function generateMetadata({
  params,
}: UseCasePageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const useCaseSlug = resolvedParams["use-case"];
  const useCaseEntry = SEO_PAGES_CONFIG.useCases.find(
    (u) => u.slug === useCaseSlug
  );
  if (!useCaseEntry) return {};

  const productName = PRODUCT_CONFIG.name;
  const title = `How to Create ${useCaseEntry.name} with AI — ${productName}`;
  const description = `${useCaseEntry.description} Step-by-step guide using ${productName}. Try free — no credit card required.`;
  const canonicalUrl = `${siteConfig.siteUrl}/use-cases/${useCaseSlug}`;

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
 * buildHowToJsonLd — generates HowTo structured data for Google's rich
 * results. HowTo schema displays numbered steps directly in search results,
 * giving the page significantly more visual real estate than a standard link.
 *
 * Schema spec: https://schema.org/HowTo
 * Google docs: https://developers.google.com/search/docs/appearance/structured-data/how-to
 */
function buildHowToJsonLd(
  productName: string,
  useCaseEntry: (typeof SEO_PAGES_CONFIG.useCases)[number]
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Create ${useCaseEntry.name} with ${productName}`,
    description: useCaseEntry.description,
    step: useCaseEntry.steps.map((stepText, stepIndex) => ({
      "@type": "HowToStep",
      position: stepIndex + 1,
      name: `Step ${stepIndex + 1}`,
      text: stepText,
    })),
    tool: {
      "@type": "HowToTool",
      name: productName,
    },
  };
}

/**
 * buildUseCaseFaqJsonLd — generates FAQ structured data for the use case
 * page. Combines HowTo + FAQ schemas for maximum rich snippet coverage.
 */
function buildUseCaseFaqJsonLd(
  productName: string,
  useCaseEntry: (typeof SEO_PAGES_CONFIG.useCases)[number]
) {
  const faqEntries = [
    {
      question: `How do I create ${useCaseEntry.name.toLowerCase()} with ${productName}?`,
      answer: `${useCaseEntry.description} Simply upload your image, let our AI process it, and download the result. The entire process takes under 30 seconds.`,
    },
    {
      question: `Is ${productName} free for ${useCaseEntry.name.toLowerCase()}?`,
      answer: `Yes — ${productName} offers ${PRODUCT_CONFIG.pricing.free.limit} free uses per ${PRODUCT_CONFIG.pricing.free.period} with no credit card required. This is enough to test the tool on your ${useCaseEntry.name.toLowerCase()} before committing to a paid plan.`,
    },
    {
      question: `What quality can I expect for ${useCaseEntry.name.toLowerCase()}?`,
      answer: `${productName} uses state-of-the-art AI models that produce professional-grade results. Output quality matches or exceeds manual editing for most ${useCaseEntry.name.toLowerCase()} tasks, at a fraction of the time and cost.`,
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

export default async function UseCaseGuidePage({
  params,
}: UseCasePageProps) {
  const resolvedParams = await params;
  const useCaseSlug = resolvedParams["use-case"];
  const useCaseEntry = SEO_PAGES_CONFIG.useCases.find(
    (u) => u.slug === useCaseSlug
  );

  if (!useCaseEntry) notFound();

  const productName = PRODUCT_CONFIG.name;
  const howToJsonLd = buildHowToJsonLd(productName, useCaseEntry);
  const faqJsonLd = buildUseCaseFaqJsonLd(productName, useCaseEntry);

  /** Other use case pages for internal cross-linking */
  const otherUseCasePages = SEO_PAGES_CONFIG.useCases.filter(
    (u) => u.slug !== useCaseSlug
  );

  return (
    <>
      {/* BreadcrumbList — shows "Home > Use Cases > Case Name" in SERPs */}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: siteConfig.siteUrl },
          { name: "Use Cases", url: `${siteConfig.siteUrl}/use-cases` },
          { name: useCaseEntry.name, url: `${siteConfig.siteUrl}/use-cases/${useCaseEntry.slug}` },
        ]}
      />
      {/* JSON-LD HowTo schema — earns step-by-step rich results in Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      {/* JSON-LD FAQPage schema — earns FAQ rich snippets */}
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
            {/* Hero Section — targets "How to [Use Case] with AI"        */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-text-secondary mb-6">
                Step-by-Step Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                How to Create{" "}
                <span className="gradient-text">{useCaseEntry.name}</span>{" "}
                with AI
              </h1>
              <p className="text-xl text-text-secondary mb-8 leading-relaxed max-w-3xl">
                {useCaseEntry.description}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Try It Free Now
              </Link>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Step-by-Step Guide — the core content of the page.        */}
            {/* Numbered steps match the HowTo JSON-LD schema. Each step  */}
            {/* is presented as a card with a prominent step number for   */}
            {/* scanability.                                              */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                {useCaseEntry.name} in{" "}
                <span className="gradient-text">
                  {useCaseEntry.steps.length} Easy Steps
                </span>
              </h2>
              <div className="space-y-6">
                {useCaseEntry.steps.map((stepText, stepIndex) => (
                  <div
                    key={stepIndex}
                    className="flex gap-6 p-6 rounded-xl bg-surface-secondary border border-white/5"
                  >
                    {/* Step number badge — large and prominent for visual scanning */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                      <span className="text-brand-400 font-bold text-lg">
                        {String(stepIndex + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        Step {stepIndex + 1}
                      </h3>
                      <p className="text-text-secondary leading-relaxed">
                        {stepText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Before/After Placeholder — visual proof of quality.       */}
            {/* This section is designed to hold real before/after images */}
            {/* once the clone has product-specific screenshots.          */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16 p-8 rounded-2xl bg-gradient-to-br from-brand-600/10 to-purple-600/10 border border-white/5">
              <h2 className="text-2xl font-bold mb-6 text-center">
                See the Difference
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="aspect-video rounded-xl bg-surface-primary border border-white/5 flex items-center justify-center mb-3">
                    <p className="text-text-muted text-sm">
                      Before — Original Image
                    </p>
                  </div>
                  <p className="text-sm text-text-muted">Before processing</p>
                </div>
                <div className="text-center">
                  <div className="aspect-video rounded-xl bg-surface-primary border border-brand-500/30 flex items-center justify-center mb-3">
                    <p className="text-brand-400 text-sm">
                      After — AI Enhanced
                    </p>
                  </div>
                  <p className="text-sm text-text-muted">
                    After {productName} processing
                  </p>
                </div>
              </div>
              <p className="text-center text-sm text-text-muted mt-6">
                Results may vary based on input image quality and complexity.
              </p>
            </section>

            {/* -------------------------------------------------------- */}
            {/* Why Use AI for This — positions our tool vs manual work.  */}
            {/* -------------------------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold mb-8">
                Why Use AI for {useCaseEntry.name}?
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-2">
                    100x
                  </p>
                  <p className="text-text-secondary text-sm">
                    Faster than manual editing
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-2">
                    $0
                  </p>
                  <p className="text-text-secondary text-sm">
                    To get started — free tier included
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-surface-secondary border border-white/5 text-center">
                  <p className="text-3xl font-bold text-brand-400 mb-2">
                    Pro
                  </p>
                  <p className="text-text-secondary text-sm">
                    Quality results from state-of-the-art AI
                  </p>
                </div>
              </div>
            </section>

            {/* -------------------------------------------------------- */}
            {/* FAQ — audience-appropriate questions for this use case.   */}
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
            {/* Related Use Cases — cross-linking to sibling pages.       */}
            {/* -------------------------------------------------------- */}
            {otherUseCasePages.length > 0 && (
              <section className="mb-16">
                <h2 className="text-xl font-bold mb-4 text-text-secondary">
                  Related Use Cases
                </h2>
                <div className="flex flex-wrap gap-3">
                  {otherUseCasePages.map((otherUseCase) => (
                    <Link
                      key={otherUseCase.slug}
                      href={`/use-cases/${otherUseCase.slug}`}
                      className="px-4 py-2 rounded-lg bg-surface-secondary border border-white/5 text-sm text-text-secondary hover:text-text-primary hover:border-brand-500/30 transition-colors"
                    >
                      {otherUseCase.name}
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
                Create {useCaseEntry.name} in Seconds
              </h2>
              <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
                Upload your image and let {productName} handle the rest.{" "}
                {PRODUCT_CONFIG.pricing.free.limit} free uses per{" "}
                {PRODUCT_CONFIG.pricing.free.period} — no credit card required.
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
