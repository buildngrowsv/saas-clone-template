/**
 * Onboarding Questionnaire Configuration — Per-Product Customizable Survey
 *
 * WHY THIS FILE EXISTS:
 * Research shows personalized onboarding questionnaires convert 2-5x better than
 * generic landing pages. The psychological mechanism is "sunk cost" — once a user
 * invests 30-60 seconds answering questions about THEIR needs, they feel ownership
 * over the results and are far more likely to pay. This is the same pattern used by
 * Canva ("What will you design?"), Notion ("What's your role?"), and Midjourney
 * ("What style are you looking for?").
 *
 * ARCHITECTURE:
 * Each clone product defines its own OnboardingConfig that controls:
 *   1. Which questions to ask (steps array)
 *   2. What options to show per question (grid cards, slider ranges, visual selectors)
 *   3. How to map responses to personalized pricing recommendations (plans array)
 *
 * The component reads this config and renders the appropriate UI for each step type.
 * Clone authors only edit THIS file — the component handles all rendering and state.
 *
 * IMPORTED BY:
 * - src/components/OnboardingQuestionnaire.tsx (renders the survey flow)
 * - src/lib/onboarding-storage.ts (validates stored responses against config)
 *
 * HOW TO CUSTOMIZE FOR A CLONE:
 * 1. Copy this file into your clone project
 * 2. Edit ONBOARDING_CONFIG to match your product's use cases and styles
 * 3. The component will automatically render your custom flow
 */

/* ============================================================
 * TYPE DEFINITIONS
 * These interfaces define the shape of the onboarding config.
 * Every clone product implements these to get a custom survey.
 * ============================================================ */

/**
 * A single selectable option within an onboarding step.
 * Used for grid cards, visual selectors, and slider presets.
 *
 * @example
 * { id: "product-photos", label: "Product Photos", icon: "Camera", description: "E-commerce and catalog shots" }
 */
export interface StepOption {
  /** Unique identifier for this option — stored in responses and used for plan matching */
  readonly id: string;

  /** Display label shown on the card or selector — keep under 20 characters for mobile */
  readonly label: string;

  /**
   * Lucide icon name to render next to the label.
   * Optional — if omitted, no icon is shown (text-only card).
   * Must be a valid lucide-react icon name (PascalCase).
   */
  readonly icon?: string;

  /** Short description shown below the label — optional, shown only on larger cards */
  readonly description?: string;

  /**
   * Image URL for visual-select steps — shown as the card background/preview.
   * Optional — only used by 'visual-select' step type.
   * Can be a relative path (public folder) or absolute URL.
   */
  readonly imageUrl?: string;
}

/**
 * A single step (screen) in the onboarding questionnaire.
 * Each step collects one piece of information from the user.
 *
 * @example Grid step for "What are you creating?"
 * {
 *   id: "use-case",
 *   title: "What are you creating?",
 *   subtitle: "We'll personalize your experience",
 *   type: "grid",
 *   options: [...]
 * }
 */
export interface OnboardingStep {
  /** Unique identifier for this step — used as localStorage key and analytics event name */
  readonly id: string;

  /** Main heading displayed above the options */
  readonly title: string;

  /** Optional subtitle shown below the heading for additional context */
  readonly subtitle?: string;

  /**
   * Step rendering type:
   * - 'grid': 2x2 or 3-column card grid with icons — best for categorical choices
   * - 'slider': Range slider with labeled presets — best for quantity/volume questions
   * - 'visual-select': Image-heavy cards — best for style/aesthetic preferences
   */
  readonly type: "grid" | "slider" | "visual-select";

  /**
   * Available choices for this step.
   * For 'grid' and 'visual-select': each option becomes a selectable card.
   * For 'slider': options define labeled preset positions on the slider track.
   */
  readonly options: readonly StepOption[];
}

/**
 * A pricing plan displayed on the final "Your Custom Plan" screen.
 * These map loosely to the Stripe plans in product.ts but include
 * personalized messaging based on questionnaire responses.
 *
 * @example
 * {
 *   id: "basic",
 *   name: "Starter",
 *   priceMonthly: 9.99,
 *   creditsPerMonth: 500,
 *   features: ["50 generations/month", "Standard quality"],
 *   recommended: false,
 *   ctaText: "Start with Starter",
 *   ctaHref: "/pricing"
 * }
 */
export interface OnboardingPricingPlan {
  /** Must match a Stripe plan ID or credit pack ID from product.ts */
  readonly id: string;

  /** Display name for this plan on the results screen */
  readonly name: string;

  /** Monthly price in USD — displayed as "$X.XX/mo" */
  readonly priceMonthly: number;

  /** Monthly credit allocation — displayed as "X credits/month" */
  readonly creditsPerMonth: number;

  /** Bullet-point features listed on the plan card */
  readonly features: readonly string[];

  /**
   * Whether this plan is the "recommended" one based on user responses.
   * The component dynamically sets this based on questionnaire answers,
   * but this default value is used as a fallback.
   */
  readonly recommended: boolean;

  /** CTA button text — e.g., "Get Started", "Go Pro", "Start Free Trial" */
  readonly ctaText: string;

  /** Where the CTA button navigates — typically "/pricing" or "/login" */
  readonly ctaHref: string;
}

/**
 * Top-level onboarding configuration for a single product.
 * Each clone defines one of these to get a fully customized survey flow.
 */
export interface OnboardingConfig {
  /** Product name — displayed in the loading screen and results header */
  readonly productName: string;

  /**
   * Ordered list of questionnaire steps.
   * The user progresses through these sequentially.
   * The loading screen and results screen are handled automatically
   * and do not need to be defined here.
   */
  readonly steps: readonly OnboardingStep[];

  /**
   * Pricing plans to display on the final results screen.
   * Should have 2-3 plans (free/basic/pro pattern).
   * The component highlights the "recommended" plan with a badge and border.
   */
  readonly plans: readonly OnboardingPricingPlan[];
}

/* ============================================================
 * DEFAULT CONFIGURATION
 * This is a generic config suitable for AI image tools (the most
 * common clone type). Override per-clone by editing this object.
 * ============================================================ */

/**
 * ONBOARDING_CONFIG — Edit this for your specific AI tool clone.
 *
 * This default config is designed for image-processing AI tools
 * (background remover, upscaler, colorizer, etc.) which make up
 * the majority of the clone portfolio. For text-based or video-based
 * tools, replace the step options with domain-appropriate choices.
 */
export const ONBOARDING_CONFIG: OnboardingConfig = {
  productName: "AI Tool",

  steps: [
    {
      id: "use-case",
      title: "What are you creating?",
      subtitle: "We'll personalize your experience based on your needs",
      type: "grid",
      options: [
        {
          id: "product-photos",
          label: "Product Photos",
          icon: "ShoppingBag",
          description: "E-commerce and catalog images",
        },
        {
          id: "social-media",
          label: "Social Media",
          icon: "Share2",
          description: "Posts, stories, and thumbnails",
        },
        {
          id: "marketing",
          label: "Marketing",
          icon: "Megaphone",
          description: "Ads, banners, and campaigns",
        },
        {
          id: "personal",
          label: "Personal",
          icon: "User",
          description: "Photos, art, and creative projects",
        },
      ],
    },
    {
      id: "volume",
      title: "How many images per month?",
      subtitle: "This helps us recommend the right plan for you",
      type: "slider",
      options: [
        { id: "1-10", label: "1-10" },
        { id: "10-50", label: "10-50" },
        { id: "50-100", label: "50-100" },
        { id: "100+", label: "100+" },
      ],
    },
    {
      id: "style",
      title: "What style fits your brand?",
      subtitle: "Choose the aesthetic that matches your vision",
      type: "visual-select",
      options: [
        {
          id: "clean-minimal",
          label: "Clean & Minimal",
          icon: "Sparkles",
          description: "Simple, modern, whitespace-focused",
        },
        {
          id: "vibrant-bold",
          label: "Vibrant & Bold",
          icon: "Palette",
          description: "Colorful, high-energy, attention-grabbing",
        },
        {
          id: "professional",
          label: "Professional",
          icon: "Briefcase",
          description: "Corporate, polished, trustworthy",
        },
        {
          id: "artistic",
          label: "Artistic",
          icon: "Paintbrush",
          description: "Creative, unique, expressive",
        },
      ],
    },
  ],

  plans: [
    {
      id: "free",
      name: "Free",
      priceMonthly: 0,
      creditsPerMonth: 3,
      features: [
        "3 generations per day",
        "Standard quality",
        "Basic formats",
        "Community support",
      ],
      recommended: false,
      ctaText: "Start Free",
      ctaHref: "/login",
    },
    {
      id: "basic",
      name: "Starter",
      priceMonthly: 4.99,
      creditsPerMonth: 50,
      features: [
        "50 generations per month",
        "HD quality output",
        "All formats",
        "Priority processing",
        "Email support",
      ],
      recommended: true,
      ctaText: "Get Starter",
      ctaHref: "/pricing",
    },
    {
      id: "pro",
      name: "Pro",
      priceMonthly: 9.99,
      creditsPerMonth: -1,
      features: [
        "Unlimited generations",
        "Maximum quality",
        "API access",
        "Priority support",
        "Commercial license",
      ],
      recommended: false,
      ctaText: "Go Pro",
      ctaHref: "/pricing",
    },
  ],
};
