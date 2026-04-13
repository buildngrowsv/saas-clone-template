/**
 * Programmatic SEO Pages Configuration — Per-Clone Long-Tail Keyword Targeting
 *
 * WHY THIS FILE EXISTS:
 * Each AI tool clone needs to rank for long-tail keywords like:
 *   - "[Our Tool] vs [Competitor]" (buying intent — comparing options)
 *   - "Best AI [tool] for [Audience]" (research intent — seeking recommendations)
 *   - "How to [Use Case] with AI" (problem-solving intent — looking for solutions)
 *
 * These three page types cover the full buyer journey: awareness (use cases),
 * consideration (audience fit), and decision (competitor comparisons). By
 * generating them statically from config data, each clone gets dozens of
 * indexed pages at zero marginal engineering cost.
 *
 * HOW TO CUSTOMIZE PER CLONE:
 * 1. Override SEO_PAGES_CONFIG in this file with your product's real data
 * 2. Add genuine competitor info (real names, real pricing, real weaknesses)
 * 3. Add real audience segments from your analytics or market research
 * 4. Add real use cases that your tool actually supports
 * 5. Run `npm run build` — pages generate automatically via generateStaticParams
 *
 * CONTENT QUALITY WARNING:
 * Google's Helpful Content Update penalizes thin templated pages. The DEFAULT
 * config below is a starting point — clones MUST customize with real, specific
 * data for their product niche. Generic placeholders will not rank.
 *
 * IMPORTED BY:
 * - src/app/vs/[competitor]/page.tsx (competitor comparison pages)
 * - src/app/for/[audience]/page.tsx (audience-specific landing pages)
 * - src/app/use-cases/[use-case]/page.tsx (step-by-step guide pages)
 * - src/app/sitemap.ts (includes all generated URLs in the sitemap)
 * - src/components/SeoInternalLinks.tsx (internal link grid for footer)
 */

import { PRODUCT_CONFIG } from "@/lib/config";

/* ------------------------------------------------------------------ */
/* Type definitions for the three SEO page categories                  */
/* ------------------------------------------------------------------ */

/**
 * Competitor entry for /vs/[competitor] comparison pages.
 * Each entry generates a full comparison page with feature table, pricing
 * comparison, FAQ schema, and conversion CTA.
 */
export interface SeoCompetitorConfig {
  /** URL-safe slug used in the route path, e.g. "remove-bg" -> /vs/remove-bg */
  readonly slug: string;
  /** Display name shown in headings, e.g. "Remove.bg" */
  readonly name: string;
  /** Neutral description of what the competitor does — factual, not FUD */
  readonly description: string;
  /** Their approximate pricing for comparison tables, e.g. "$5.99/image" */
  readonly pricing: string;
  /** Specific areas where our product outperforms them — honest differentiators */
  readonly weaknesses: string[];
}

/**
 * Audience segment entry for /for/[audience] landing pages.
 * Each entry generates an audience-specific landing page that addresses
 * their unique pain points and explains how our tool solves them.
 */
export interface SeoAudienceConfig {
  /** URL-safe slug used in the route path, e.g. "photographers" -> /for/photographers */
  readonly slug: string;
  /** Display name shown in headings, e.g. "Photographers" */
  readonly name: string;
  /** Specific problems this audience faces that our tool addresses */
  readonly painPoints: string[];
  /** Paragraph explaining how our product specifically helps this audience */
  readonly howWeHelp: string;
}

/**
 * Use case entry for /use-cases/[use-case] guide pages.
 * Each entry generates a step-by-step tutorial page with HowTo schema
 * markup for rich snippet eligibility in search results.
 */
export interface SeoUseCaseConfig {
  /** URL-safe slug used in the route path, e.g. "product-photos" -> /use-cases/product-photos */
  readonly slug: string;
  /** Display name shown in headings, e.g. "Product Photos" */
  readonly name: string;
  /** What this use case involves and why someone would need it */
  readonly description: string;
  /** Ordered steps to accomplish this use case with our tool */
  readonly steps: string[];
}

/**
 * Complete SEO pages configuration for one clone product.
 * Each array generates a set of statically-rendered pages at build time.
 */
export interface SeoPageConfig {
  /** Competitor comparison entries — generates /vs/[competitor] pages */
  readonly competitors: SeoCompetitorConfig[];
  /** Audience segment entries — generates /for/[audience] pages */
  readonly audiences: SeoAudienceConfig[];
  /** Use case entries — generates /use-cases/[use-case] pages */
  readonly useCases: SeoUseCaseConfig[];
}

/* ------------------------------------------------------------------ */
/* Default configuration — sensible baseline for a generic AI image tool */
/* ------------------------------------------------------------------ */

/**
 * DEFAULT_SEO_PAGES_CONFIG provides a working baseline that any AI image
 * tool clone can ship with immediately. The competitors, audiences, and
 * use cases are generic enough to be plausible for background removers,
 * upscalers, colorizers, logo generators, etc.
 *
 * Clone builders SHOULD override this with product-specific data. The
 * more specific and accurate the data, the better the pages will rank.
 */
const DEFAULT_SEO_PAGES_CONFIG: SeoPageConfig = {
  competitors: [
    {
      slug: "canva",
      name: "Canva",
      description:
        "Canva is a popular general-purpose design platform offering templates, drag-and-drop editing, and a broad suite of visual creation tools for non-designers.",
      pricing: "$12.99/mo for Pro",
      weaknesses: [
        "General-purpose tool — not specialized for AI image processing",
        "AI features locked behind the Pro subscription tier",
        "Steeper learning curve for users who only need one specific task",
        "Slower processing for AI-specific workflows due to generalist architecture",
      ],
    },
    {
      slug: "adobe-express",
      name: "Adobe Express",
      description:
        "Adobe Express is Adobe's simplified design tool with AI-powered features, aimed at quick content creation for social media and marketing materials.",
      pricing: "$9.99/mo for Premium",
      weaknesses: [
        "Premium required for full AI feature access",
        "Part of the Adobe ecosystem — can push users toward more expensive Creative Cloud plans",
        "AI features are additions to a template-based tool, not the core focus",
        "Export limitations on free tier reduce output quality",
      ],
    },
    {
      slug: "fotor",
      name: "Fotor",
      description:
        "Fotor is an online photo editing tool with AI enhancement features, batch processing, and a template library for social media graphics.",
      pricing: "$8.99/mo for Pro",
      weaknesses: [
        "AI processing quality varies significantly by task type",
        "Free tier includes watermarks on some AI-generated outputs",
        "Batch processing limited to paid plans only",
        "Slower processing speeds compared to dedicated AI tools",
      ],
    },
  ],

  audiences: [
    {
      slug: "photographers",
      name: "Photographers",
      painPoints: [
        "Spending hours on repetitive post-processing tasks that AI could handle in seconds",
        "Clients expect fast turnaround but manual editing is time-consuming",
        "Professional editing software is expensive and requires ongoing subscriptions",
        "Batch processing large photo sets from events or shoots is tedious",
      ],
      howWeHelp: `${PRODUCT_CONFIG.name} automates the most time-consuming parts of photo post-processing. Upload your images and get professional-grade results in seconds — not hours. Our AI handles the technical heavy lifting so you can focus on what matters: capturing great shots and serving your clients. With free daily uses and affordable plans starting at $${PRODUCT_CONFIG.pricing.basic.price}/mo, it fits any photographer's budget.`,
    },
    {
      slug: "ecommerce-sellers",
      name: "E-commerce Sellers",
      painPoints: [
        "Product images need consistent formatting across Amazon, Shopify, Etsy, and other marketplaces",
        "Hiring a photographer or designer for every product listing is cost-prohibitive",
        "Marketplace algorithms favor listings with high-quality, professional images",
        "Seasonal inventory changes require rapid image turnaround for new listings",
      ],
      howWeHelp: `${PRODUCT_CONFIG.name} helps e-commerce sellers create marketplace-ready product images at scale. Process entire catalogs in minutes instead of days. Our AI delivers consistent, professional results that meet the image quality standards of Amazon, Shopify, Etsy, and other platforms — without needing a design background or expensive software.`,
    },
    {
      slug: "social-media-managers",
      name: "Social Media Managers",
      painPoints: [
        "Need fresh, eye-catching visuals daily across multiple platforms",
        "Design tools are overkill for quick social media image processing",
        "Budget constraints make professional design services unrealistic for daily content",
        "Platform-specific image requirements add complexity to every post",
      ],
      howWeHelp: `${PRODUCT_CONFIG.name} gives social media managers a fast lane to professional visuals. Process images for Instagram, LinkedIn, Twitter, and TikTok in seconds. Our free tier covers daily content needs, and paid plans unlock volume processing for campaign launches and content calendars.`,
    },
  ],

  useCases: [
    {
      slug: "product-photos",
      name: "Product Photos",
      description:
        "Transform raw product photos into clean, professional listing images suitable for e-commerce marketplaces, catalogs, and marketing materials.",
      steps: [
        "Upload your raw product photo — supports PNG, JPEG, and WebP up to 10MB",
        "Our AI automatically processes the image using state-of-the-art models",
        "Preview the result and download in your preferred format",
        "Upload to your marketplace listing — the image is ready to publish",
      ],
    },
    {
      slug: "social-media-content",
      name: "Social Media Content",
      description:
        "Create scroll-stopping social media visuals from ordinary photos. Optimize images for Instagram, Twitter, LinkedIn, and TikTok without design skills.",
      steps: [
        "Choose your source image — a photo, screenshot, or existing graphic",
        "Upload to our platform and let AI process it instantly",
        "Download the enhanced result — optimized for visual impact",
        "Post directly to your social channels with confidence",
      ],
    },
    {
      slug: "marketing-materials",
      name: "Marketing Materials",
      description:
        "Prepare professional visuals for brochures, flyers, email campaigns, and digital ads. Get print-ready and web-optimized outputs from a single upload.",
      steps: [
        "Gather your source images — product shots, team photos, or brand assets",
        "Upload each image to our AI processing pipeline",
        "Review the enhanced results and download at full resolution",
        "Drop the processed images into your marketing templates and campaigns",
      ],
    },
  ],
};

/**
 * SEO_PAGES_CONFIG — The single data source for all programmatic SEO pages.
 *
 * Clone builders: override this entire object (or individual arrays) with
 * product-specific data. The more specific and accurate your entries, the
 * better these pages will rank for relevant long-tail keywords.
 *
 * The default config works out of the box for any AI image processing tool.
 */
export const SEO_PAGES_CONFIG: SeoPageConfig = DEFAULT_SEO_PAGES_CONFIG;
