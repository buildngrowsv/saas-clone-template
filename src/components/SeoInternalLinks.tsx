/**
 * SeoInternalLinks — Cross-links to all programmatic SEO pages.
 *
 * WHY THIS COMPONENT EXISTS:
 * Internal links are the cheapest, most reliable SEO lever. Every page
 * that links to other pages passes PageRank, helping the entire site
 * rank higher. By placing this component on SEO pages and in the landing
 * page footer area, we create a mesh of internal links that:
 *   1. Helps Google discover all our programmatic pages
 *   2. Distributes page authority across the site
 *   3. Keeps users engaged by surfacing related content
 *   4. Reduces bounce rate by offering relevant next clicks
 *
 * DESIGN:
 * Rendered as a subtle link grid grouped by category (Comparisons, For,
 * Use Cases). Styled to be informative without being visually dominant —
 * it supports SEO without distracting from the page's primary CTA.
 *
 * IMPORTED BY:
 * - src/app/vs/[competitor]/page.tsx
 * - src/app/for/[audience]/page.tsx
 * - src/app/use-cases/[use-case]/page.tsx
 * - Can be added to src/app/page.tsx (landing page) footer area
 */

import Link from "next/link";
import { SEO_PAGES_CONFIG } from "@/config/seo-pages";
import { PRODUCT_CONFIG } from "@/lib/config";

/**
 * SeoInternalLinks renders a grouped grid of links to all programmatic
 * SEO pages. Server component — no client-side JS required.
 *
 * @example
 * // Add to any page's JSX to include the internal link grid:
 * <SeoInternalLinks />
 */
export function SeoInternalLinks() {
  const productName = PRODUCT_CONFIG.name;
  const { competitors, audiences, useCases } = SEO_PAGES_CONFIG;

  /**
   * Only render if there are SEO pages to link to. If the config is
   * empty (no competitors, audiences, or use cases), skip the section
   * entirely to avoid rendering an empty shell.
   */
  const hasAnyPages =
    competitors.length > 0 || audiences.length > 0 || useCases.length > 0;

  if (!hasAnyPages) return null;

  return (
    <section className="mt-16 pt-8 border-t border-white/5">
      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-6">
        Explore More
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Comparisons column — /vs/ pages */}
        {competitors.length > 0 && (
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">
              Comparisons
            </p>
            <ul className="space-y-2">
              {competitors.map((competitorEntry) => (
                <li key={competitorEntry.slug}>
                  <Link
                    href={`/vs/${competitorEntry.slug}`}
                    className="text-sm text-text-muted hover:text-brand-400 transition-colors"
                  >
                    {productName} vs {competitorEntry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Audiences column — /for/ pages */}
        {audiences.length > 0 && (
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">
              Built For
            </p>
            <ul className="space-y-2">
              {audiences.map((audienceEntry) => (
                <li key={audienceEntry.slug}>
                  <Link
                    href={`/for/${audienceEntry.slug}`}
                    className="text-sm text-text-muted hover:text-brand-400 transition-colors"
                  >
                    {productName} for {audienceEntry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Use Cases column — /use-cases/ pages */}
        {useCases.length > 0 && (
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">
              Use Cases
            </p>
            <ul className="space-y-2">
              {useCases.map((useCaseEntry) => (
                <li key={useCaseEntry.slug}>
                  <Link
                    href={`/use-cases/${useCaseEntry.slug}`}
                    className="text-sm text-text-muted hover:text-brand-400 transition-colors"
                  >
                    {useCaseEntry.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
