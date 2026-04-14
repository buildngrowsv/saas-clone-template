/**
 * BreadcrumbJsonLd — Reusable BreadcrumbList JSON-LD for SEO pages.
 *
 * WHY THIS COMPONENT:
 * Google uses BreadcrumbList schema to display breadcrumb trails in search
 * results (e.g., "Home > Pricing > Pro Plan"). This improves click-through
 * rate by showing users the page's position in the site hierarchy before
 * they click. Especially valuable for pSEO pages (/vs/, /for/, /use-cases/)
 * that target long-tail keywords.
 *
 * USAGE:
 * Import and render inside any page component's JSX. The component renders
 * a <script type="application/ld+json"> tag in the DOM — it's invisible
 * to users but parseable by search engine crawlers.
 *
 * ```tsx
 * <BreadcrumbJsonLd
 *   items={[
 *     { name: "Home", url: "https://logo.symplyai.io" },
 *     { name: "Alternatives", url: "https://logo.symplyai.io/vs" },
 *     { name: "vs Canva", url: "https://logo.symplyai.io/vs/canva" },
 *   ]}
 * />
 * ```
 *
 * IMPORTED BY:
 * - src/app/vs/[competitor]/page.tsx
 * - src/app/for/[audience]/page.tsx
 * - src/app/use-cases/[use-case]/page.tsx
 * - Any future pSEO page that has a parent/child hierarchy
 */

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
