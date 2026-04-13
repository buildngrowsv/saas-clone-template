/**
 * Programmatic SEO Configuration — "Best [Tool] for [Audience]" Pages
 *
 * WHY THIS EXISTS:
 * Programmatic SEO (pSEO) generates hundreds of long-tail keyword pages from
 * structured data. The pattern: "best [tool category] for [audience]" captures
 * high-intent search traffic from people actively looking for a solution.
 *
 * Example: "best ai logo generator for etsy sellers" — someone searching this
 * is ready to buy. They have a specific use case and want a recommendation.
 * By creating a page targeting this exact query, we appear in SERPs for it.
 *
 * THE MATH:
 * If a clone targets 5 competitor names, 20 audience segments, and 10 use cases,
 * that's 5*20 + 5*10 + 20*10 = 350 unique pages per clone. Across 41 clones,
 * that's ~14,000 indexed pages — each targeting a different long-tail keyword.
 *
 * HOW TO CUSTOMIZE PER CLONE:
 * 1. Edit the PSEO_CONFIG export below with your product's specifics
 * 2. Pages auto-generate at build time via Next.js generateStaticParams
 * 3. Each page gets unique content, FAQ schema, comparison table, and CTA
 *
 * IMPORTED BY:
 * - src/app/best/[slug]/page.tsx (the dynamic route that renders pSEO pages)
 * - src/app/sitemap.ts (includes all generated URLs in the sitemap)
 * - src/lib/pseo-content-generator.ts (builds unique page content from this config)
 *
 * CONTENT QUALITY NOTE:
 * Google's Helpful Content Update (2024+) penalizes thin, templated pages.
 * Each generated page MUST have:
 * - 500+ words of unique, substantive content (not just keyword stuffing)
 * - Genuine value: comparison data, use-case-specific advice, real feature diffs
 * - Proper schema markup (FAQPage JSON-LD) for rich snippet eligibility
 * The content generator in pseo-content-generator.ts handles this by combining
 * audience-specific pain points with product-specific feature explanations.
 */

/**
 * A target audience segment — represents a group of people who might search
 * "best [tool] for [audience]". Each audience has unique pain points and
 * priorities that the generated content addresses.
 */
export interface PseoAudienceSegment {
  /** URL-safe slug, e.g. "etsy-sellers" */
  readonly slug: string;
  /** Human-readable name, e.g. "Etsy Sellers" */
  readonly displayName: string;
  /** Why this audience needs the tool — drives the page's opening paragraph */
  readonly painPoints: readonly string[];
  /** What this audience values most — used in feature comparison emphasis */
  readonly priorities: readonly string[];
}

/**
 * A competitor product — used to generate "vs" and comparison content.
 * These are real alternatives the audience might consider.
 */
export interface PseoCompetitor {
  /** URL-safe slug, e.g. "canva" */
  readonly slug: string;
  /** Display name, e.g. "Canva" */
  readonly displayName: string;
  /** Brief neutral description — we don't trash competitors, we differentiate */
  readonly description: string;
  /** Weaknesses relative to our product — factual, not FUD */
  readonly limitations: readonly string[];
}

/**
 * A use case — specific task someone wants to accomplish.
 * Generates "best [tool] for [use-case]" pages.
 */
export interface PseoUseCase {
  /** URL-safe slug, e.g. "social-media-posts" */
  readonly slug: string;
  /** Human-readable, e.g. "Social Media Posts" */
  readonly displayName: string;
  /** Step-by-step workflow description for this use case */
  readonly workflowDescription: string;
  /** Specific tips for this use case */
  readonly proTips: readonly string[];
}

/**
 * Product feature highlight — used in comparison tables and feature sections.
 * These are YOUR product's differentiators.
 */
export interface PseoProductFeature {
  /** Feature name, e.g. "One-Click Processing" */
  readonly name: string;
  /** Short description for table cells */
  readonly shortDescription: string;
  /** Longer explanation for body content */
  readonly longDescription: string;
  /** Does the free tier include this? */
  readonly availableOnFree: boolean;
}

/**
 * The complete pSEO configuration for one clone product.
 * Fill this in per clone — the page generator reads everything from here.
 */
export interface PseoConfiguration {
  /** The tool category keyword, e.g. "ai-logo-generator", "ai-background-remover" */
  readonly toolCategorySlug: string;
  /** Human-readable category, e.g. "AI Logo Generator" */
  readonly toolCategoryName: string;
  /** One-sentence value prop used in page intros */
  readonly valueProposition: string;
  /** Target audiences — each generates a "best [tool] for [audience]" page */
  readonly audiences: readonly PseoAudienceSegment[];
  /** Competitor products — each generates comparison content */
  readonly competitors: readonly PseoCompetitor[];
  /** Use cases — each generates a "best [tool] for [use-case]" page */
  readonly useCases: readonly PseoUseCase[];
  /** Product features — used in comparison tables */
  readonly features: readonly PseoProductFeature[];
  /** CTA button text, e.g. "Try Free — No Credit Card Required" */
  readonly ctaText: string;
  /** CTA destination path, e.g. "/login" or "/dashboard" */
  readonly ctaHref: string;
  /** Year for "Best X in [year]" freshness signals — update annually */
  readonly currentYear: number;
}

/**
 * PSEO_CONFIG — The single data source for all programmatic SEO pages.
 *
 * CUSTOMIZATION INSTRUCTIONS FOR CLONE BUILDERS:
 * 1. Replace the toolCategorySlug/Name with your product's category
 * 2. Add 10-30 audience segments (more = more pages = more long-tail traffic)
 * 3. Add 3-8 competitors (real alternatives your audience considers)
 * 4. Add 5-15 use cases (specific tasks your tool helps with)
 * 5. Add 4-8 product features (your differentiators)
 * 6. Run `npm run build` — pages generate automatically
 *
 * The example below is a TEMPLATE — replace with your product's real data.
 * Leaving the template data will generate generic pages that won't rank.
 */
export const PSEO_CONFIG: PseoConfiguration = {
  toolCategorySlug: "ai-tool",
  toolCategoryName: "AI Tool",
  valueProposition:
    "Professional-grade AI processing in seconds — no technical skills required.",

  audiences: [
    {
      slug: "small-business-owners",
      displayName: "Small Business Owners",
      painPoints: [
        "Limited budget for professional design services",
        "Need quick turnaround without hiring freelancers",
        "Want consistent brand quality across all assets",
      ],
      priorities: [
        "Affordable pricing",
        "Easy to use without training",
        "Fast results",
      ],
    },
    {
      slug: "freelance-designers",
      displayName: "Freelance Designers",
      painPoints: [
        "Time-consuming repetitive tasks eat into billable hours",
        "Clients expect fast delivery",
        "Need to handle high volume without quality drops",
      ],
      priorities: [
        "Batch processing capability",
        "Professional output quality",
        "Integration with existing workflow",
      ],
    },
    {
      slug: "ecommerce-sellers",
      displayName: "E-commerce Sellers",
      painPoints: [
        "Product images need consistent formatting for marketplace listings",
        "High volume of images to process for catalogs",
        "Marketplace image requirements vary across platforms",
      ],
      priorities: [
        "Bulk processing",
        "Marketplace-ready output formats",
        "Affordable per-image pricing",
      ],
    },
    {
      slug: "content-creators",
      displayName: "Content Creators",
      painPoints: [
        "Need eye-catching visuals for social media daily",
        "Expensive design tools eat into content revenue",
        "Maintaining visual consistency across platforms is tedious",
      ],
      priorities: [
        "Social-media-ready output sizes",
        "Fast processing for daily content",
        "Free tier for testing",
      ],
    },
    {
      slug: "marketing-teams",
      displayName: "Marketing Teams",
      painPoints: [
        "Design bottleneck slows campaign launches",
        "Brand asset creation requires dedicated designer time",
        "A/B testing visual variants is expensive and slow",
      ],
      priorities: [
        "Team collaboration features",
        "Brand consistency controls",
        "Volume pricing for campaigns",
      ],
    },
  ],

  competitors: [
    {
      slug: "canva",
      displayName: "Canva",
      description:
        "Popular general-purpose design platform with templates and drag-and-drop editing.",
      limitations: [
        "General-purpose — not specialized for this specific task",
        "AI features require Pro subscription ($12.99/mo)",
        "Learning curve for advanced features",
      ],
    },
    {
      slug: "adobe",
      displayName: "Adobe Creative Suite",
      description:
        "Industry-standard professional design software with comprehensive editing tools.",
      limitations: [
        "Expensive subscription ($54.99/mo for full suite)",
        "Steep learning curve requires training",
        "Overkill for single-purpose tasks",
      ],
    },
    {
      slug: "figma",
      displayName: "Figma",
      description:
        "Collaborative design tool popular with UI/UX teams for interface design.",
      limitations: [
        "Designed for UI/UX, not specialized AI processing",
        "Requires design knowledge to use effectively",
        "No built-in AI generation capabilities",
      ],
    },
  ],

  useCases: [
    {
      slug: "social-media-posts",
      displayName: "Social Media Posts",
      workflowDescription:
        "Upload your base image or enter your requirements, let AI process it in seconds, then download the optimized result ready for Instagram, Twitter, LinkedIn, or TikTok.",
      proTips: [
        "Use the highest resolution source material for best results",
        "Process multiple variations to A/B test which performs best",
        "Save your preferred settings as presets for consistent branding",
      ],
    },
    {
      slug: "product-photography",
      displayName: "Product Photography",
      workflowDescription:
        "Transform raw product photos into professional listings. Upload your product image, select the desired enhancement, and download marketplace-ready results.",
      proTips: [
        "Shoot on a neutral background for cleanest AI processing",
        "Process the same product from multiple angles for complete listings",
        "Use batch mode for entire product catalogs",
      ],
    },
    {
      slug: "brand-assets",
      displayName: "Brand Assets",
      workflowDescription:
        "Create consistent brand visuals from logos to marketing materials. Input your brand elements and let AI generate professional variations.",
      proTips: [
        "Start with your brand color palette for best consistency",
        "Generate variations at different sizes for different platforms",
        "Keep originals — iterate on the AI output, not your source files",
      ],
    },
    {
      slug: "presentations",
      displayName: "Presentations & Pitch Decks",
      workflowDescription:
        "Enhance presentation visuals quickly. Upload slides or assets, process them through AI, and drop the polished results into your deck.",
      proTips: [
        "Match output resolution to your presentation aspect ratio",
        "Process hero images at highest quality — they're the focal point",
        "Use consistent style settings across all slide assets",
      ],
    },
    {
      slug: "print-materials",
      displayName: "Print Materials",
      workflowDescription:
        "Prepare images for brochures, flyers, business cards, and other print collateral. Upload at maximum resolution and process for print-ready output.",
      proTips: [
        "Always use the highest resolution source — print needs 300 DPI minimum",
        "Download in PNG format to preserve quality for print workflows",
        "Process at 2x target size and downscale for maximum sharpness",
      ],
    },
  ],

  features: [
    {
      name: "One-Click AI Processing",
      shortDescription: "Upload and get results in seconds",
      longDescription:
        "No complex settings or design knowledge required. Upload your file, click process, and get professional results in 5-15 seconds. Our AI handles all the technical complexity behind the scenes.",
      availableOnFree: true,
    },
    {
      name: "Free Tier Included",
      shortDescription: "Try before you buy — no credit card required",
      longDescription:
        "Start with free daily uses to evaluate quality before committing. No credit card required, no hidden limits on output quality. The free tier uses the exact same AI models as paid plans.",
      availableOnFree: true,
    },
    {
      name: "Professional Output Quality",
      shortDescription: "Production-ready results from state-of-the-art AI",
      longDescription:
        "Powered by the latest AI models trained on millions of professional examples. Output quality matches or exceeds manual professional work for most use cases, at a fraction of the time and cost.",
      availableOnFree: true,
    },
    {
      name: "Secure Processing",
      shortDescription: "Files deleted within 1 hour, encrypted in transit",
      longDescription:
        "Your uploaded files are processed on secure infrastructure and automatically deleted within 1 hour. All data transfers are encrypted with TLS. We never use your files for AI training or share them with third parties.",
      availableOnFree: true,
    },
  ],

  ctaText: "Try Free — No Credit Card Required",
  ctaHref: "/login",
  currentYear: 2026,
};

/**
 * Generate all possible page slugs from the pSEO config.
 *
 * WHY THIS FUNCTION:
 * Next.js generateStaticParams needs a flat list of slugs to pre-render.
 * We generate three types of pages:
 * 1. "best-[tool]-for-[audience]" — e.g. best-ai-logo-generator-for-etsy-sellers
 * 2. "best-[tool]-for-[use-case]" — e.g. best-ai-logo-generator-for-social-media-posts
 * 3. "[tool]-vs-[competitor]" — e.g. ai-logo-generator-vs-canva
 *
 * Each slug maps to a unique combination in the config.
 */
export interface PseoPageDescriptor {
  /** The URL slug used in /best/[slug] */
  slug: string;
  /** Which type of page this is — determines content generation strategy */
  type: "audience" | "use-case" | "competitor";
  /** Reference back to the source data for content generation */
  sourceSlug: string;
}

export function generateAllPseoPageDescriptors(
  config: PseoConfiguration
): PseoPageDescriptor[] {
  const pages: PseoPageDescriptor[] = [];

  /* Audience pages: "best-ai-logo-generator-for-etsy-sellers" */
  for (const audience of config.audiences) {
    pages.push({
      slug: `${config.toolCategorySlug}-for-${audience.slug}`,
      type: "audience",
      sourceSlug: audience.slug,
    });
  }

  /* Use case pages: "best-ai-logo-generator-for-social-media-posts" */
  for (const useCase of config.useCases) {
    pages.push({
      slug: `${config.toolCategorySlug}-for-${useCase.slug}`,
      type: "use-case",
      sourceSlug: useCase.slug,
    });
  }

  /* Competitor comparison pages: "ai-logo-generator-vs-canva" */
  for (const competitor of config.competitors) {
    pages.push({
      slug: `${config.toolCategorySlug}-vs-${competitor.slug}`,
      type: "competitor",
      sourceSlug: competitor.slug,
    });
  }

  return pages;
}
