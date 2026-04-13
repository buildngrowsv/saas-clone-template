/**
 * Programmatic SEO Pages — Configuration and Data Layer
 *
 * WHY THIS EXISTS:
 * Each clone product targets long-tail keywords like "best AI logo generator for
 * startups" and "AI logo generator vs Looka". These pages are trivial to generate
 * at build time from a JSON config because the structure is identical — only the
 * nouns and product details change. At 20+ pages per clone across 41+ clones,
 * this yields 800+ indexed pages targeting buying-intent keywords.
 *
 * HOW IT WORKS:
 * 1. Each clone has a `seo-pages.json` in its project root (or uses the template default)
 * 2. This module reads and validates that config at build time
 * 3. Next.js `generateStaticParams` uses the config to create routes
 * 4. Each page renders a full SEO-optimized page with:
 *    - Unique title/description targeting the specific keyword
 *    - JSON-LD FAQ structured data (for featured snippets)
 *    - Comparison table (for /vs/ pages)
 *    - Feature breakdown (for /best/ pages)
 *    - CTA to the product
 *
 * CUSTOMIZATION PER CLONE:
 * Copy `seo-pages.example.json` to `seo-pages.json` in the clone root,
 * then fill in audience segments, competitor names, and use cases.
 * Pages auto-generate at next build.
 */

import { PRODUCT_CONFIG } from "@/lib/config";

/**
 * Load seo-config.json from project root. Uses require() instead of import
 * because the JSON file lives outside src/ and TypeScript's include path.
 * Falls back to empty defaults if the file doesn't exist.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
let seoConfig: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  seoConfig = require("../../seo-config.json");
} catch {
  // No seo-config.json — use defaults from PRODUCT_CONFIG
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface BestForPageConfig {
  /** URL slug: "startups" -> /best/ai-logo-generator-for-startups */
  readonly slug: string;
  /** Target audience label: "Startups" */
  readonly audience: string;
  /** Why this product fits the audience — 2-3 sentences */
  readonly whyFit: string;
  /** 3-5 features most relevant to this audience */
  readonly topFeatures: readonly string[];
  /** 3-5 FAQ entries (question + answer) for JSON-LD FAQ schema */
  readonly faq: readonly { question: string; answer: string }[];
}

export interface VsPageConfig {
  /** URL slug: "looka" -> /vs/ai-logo-generator-vs-looka */
  readonly slug: string;
  /** Competitor display name: "Looka" */
  readonly competitorName: string;
  /** Competitor's starting price (for comparison table): "$20/mo" */
  readonly competitorPrice: string;
  /** Competitor's weaknesses that we address — 3-5 bullet points */
  readonly competitorWeaknesses: readonly string[];
  /** Feature comparison rows: [feature, us, them] */
  readonly comparisonTable: readonly { feature: string; us: string; them: string }[];
  /** 3-5 FAQ entries for JSON-LD FAQ schema */
  readonly faq: readonly { question: string; answer: string }[];
}

export interface SeoPagesSiteConfig {
  readonly bestForPages: readonly BestForPageConfig[];
  readonly vsPages: readonly VsPageConfig[];
}

/* ------------------------------------------------------------------ */
/* Config loader — reads seo-pages.json or generates defaults          */
/* ------------------------------------------------------------------ */

let cachedConfig: SeoPagesSiteConfig | null = null;

/**
 * Loads the SEO pages config. First tries to read seo-pages.json from
 * the project root. If it doesn't exist, generates default pages from
 * the seo-config.json (which every clone already has).
 */
export function getSeoPageConfig(): SeoPagesSiteConfig {
  if (cachedConfig) return cachedConfig;

  try {
    // Try loading custom seo-pages.json from project root
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const customConfig = require("../../seo-pages.json") as SeoPagesSiteConfig;
    if (customConfig.bestForPages && customConfig.vsPages) {
      cachedConfig = customConfig;
      return cachedConfig;
    }
  } catch {
    // No custom config — generate defaults from seo-config.json
  }

  cachedConfig = generateDefaultSeoPages();
  return cachedConfig;
}

/**
 * Generates default SEO pages from the existing seo-config.json.
 * This means clones get SEO pages automatically even without a custom
 * seo-pages.json — they just need the seo-config.json they already have.
 *
 * Default generation logic:
 * - /best/ pages: one per industry/audience in seo-config.industries
 * - /vs/ pages: one per competitor in seo-config.competitors
 */
function generateDefaultSeoPages(): SeoPagesSiteConfig {
  const productName = seoConfig.productName || PRODUCT_CONFIG.name;
  const productSlug = seoConfig.productSlug || productName.toLowerCase().replace(/\s+/g, "-");
  const industries = seoConfig.industries || [];
  const competitors = seoConfig.competitors || [];
  const useCases = seoConfig.useCases || [];
  const coreFeatures = seoConfig.coreFeatures || [];
  const pricing = seoConfig.pricing || {};

  const bestForPages: BestForPageConfig[] = industries.map((audience: string) => {
    const audienceSlug = audience.toLowerCase().replace(/\s+/g, "-");
    return {
      slug: audienceSlug,
      audience,
      whyFit: `${productName} is built specifically for ${audience}. With ${coreFeatures[0]?.toLowerCase() || "AI-powered processing"} and ${coreFeatures[1]?.toLowerCase() || "instant results"}, ${audience} can save hours of manual work and focus on what matters most.`,
      topFeatures: coreFeatures.slice(0, 5),
      faq: [
        {
          question: `Is ${productName} good for ${audience}?`,
          answer: `Yes! ${productName} is designed with ${audience} in mind. Our ${coreFeatures[0]?.toLowerCase() || "core features"} help ${audience} ${useCases[0] || "get professional results instantly"}.`,
        },
        {
          question: `How much does ${productName} cost for ${audience}?`,
          answer: `${productName} offers a free tier (${pricing.free || "limited usage"}) so you can try before you buy. Paid plans start at ${pricing.basic || "$4.99/mo"}.`,
        },
        {
          question: `What makes ${productName} better than alternatives for ${audience}?`,
          answer: `Unlike generic tools, ${productName} focuses on ${useCases.slice(0, 2).join(" and ") || "specialized use cases"} that matter most to ${audience}. Plus, our pricing is designed for individual ${audience}, not enterprise budgets.`,
        },
      ],
    };
  });

  const vsPages: VsPageConfig[] = competitors.map((competitor: string) => {
    const competitorSlug = competitor.toLowerCase().replace(/\s+/g, "-");
    return {
      slug: competitorSlug,
      competitorName: competitor,
      competitorPrice: "$10-50/mo",
      competitorWeaknesses: [
        `${competitor} is more expensive for individual users`,
        `${competitor} requires more setup time`,
        `${competitor} doesn't offer a free tier`,
      ],
      comparisonTable: [
        { feature: "Free tier", us: pricing.free || "Yes", them: "Limited or None" },
        { feature: "Starting price", us: pricing.basic || "$4.99/mo", them: "$10-50/mo" },
        { feature: "AI-powered", us: "Yes", them: "Yes" },
        { feature: "No signup required", us: "First 3 free", them: "Signup required" },
        { feature: "Instant results", us: "Yes", them: "Varies" },
      ],
      faq: [
        {
          question: `Is ${productName} better than ${competitor}?`,
          answer: `${productName} offers a more affordable alternative to ${competitor} with comparable quality. Our free tier lets you try before you buy, and paid plans start at ${pricing.basic || "$4.99/mo"}.`,
        },
        {
          question: `How does ${productName} compare to ${competitor} on pricing?`,
          answer: `${productName} is significantly more affordable. ${competitor} charges $10-50/mo while ${productName} starts at ${pricing.basic || "$4.99/mo"} with a generous free tier.`,
        },
        {
          question: `Can I switch from ${competitor} to ${productName}?`,
          answer: `Absolutely! ${productName} is a drop-in replacement. Sign up, try the free tier, and see the results for yourself.`,
        },
      ],
    };
  });

  return { bestForPages, vsPages };
}

/* ------------------------------------------------------------------ */
/* Helpers for page components                                         */
/* ------------------------------------------------------------------ */

/**
 * Returns the canonical product slug used in URL paths.
 * E.g. "ai-logo-generator" from seo-config.json's productSlug.
 */
export function getProductSlug(): string {
  return seoConfig.productSlug || PRODUCT_CONFIG.name.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Builds JSON-LD FAQPage structured data for Google rich snippets.
 * FAQ pages can earn featured snippet real estate in search results,
 * which is disproportionately valuable for long-tail queries.
 */
export function buildFaqJsonLd(faq: readonly { question: string; answer: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
