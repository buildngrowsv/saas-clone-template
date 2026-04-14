/**
 * Product Configuration — The Single Source of Truth for Each Clone
 * 
 * WHY THIS FILE EXISTS:
 * Every AI tool clone we build (background remover, image upscaler, QR art, etc.)
 * shares the same SaaS skeleton — auth, payments, credit system, fal.ai inference.
 * The ONLY things that change between clones are:
 *   1. Product name/branding
 *   2. Which fal.ai model to call
 *   3. Pricing/credit limits (sometimes)
 *   4. Input/output types (image, text, etc.)
 * 
 * By centralizing all product-specific config here, cloning a new AI tool is as
 * simple as: copy the template, edit this file, deploy. That's the entire thesis
 * behind our "AI Tool Competitor Cloning Factory" strategy.
 * 
 * HOW TO USE:
 * 1. Copy saas-clone-template/ to a new directory
 * 2. Edit ONLY this file (and the generate API route for model-specific params)
 * 3. Set env vars
 * 4. Deploy to Vercel
 */

export interface ProductPricingTier {
  /**
   * Monthly price in USD. Set to 0 for free tier.
   */
  readonly price: number;

  /**
   * Number of generations allowed per period.
   * Set to -1 for unlimited (used for Pro tier).
   */
  readonly limit: number;

  /**
   * Billing/reset period for credit limits.
   * "day" is used for free tier (resets daily to prevent abuse),
   * "month" aligns with Stripe's monthly billing cycle.
   */
  readonly period: "day" | "month";
}

export interface ProductConfiguration {
  /**
   * Display name shown in the navbar, hero section, and page title.
   * Example: "RemoveBG Pro", "UpscaleAI", "QR Art Studio"
   */
  readonly name: string;

  /**
   * Short tagline for the hero section — should be benefit-focused,
   * not feature-focused. "Remove backgrounds in seconds" beats
   * "AI-powered background removal tool".
   */
  readonly tagline: string;

  /**
   * Longer description for SEO meta tags and the landing page body.
   */
  readonly description: string;

  /**
   * The fal.ai model identifier to call for this product.
   * Browse available models at: https://fal.ai/models
   * 
   * Examples:
   *   - "fal-ai/birefnet" for background removal
   *   - "fal-ai/clarity-upscaler" for image upscaling
   *   - "fal-ai/fast-sdxl" for text-to-image generation
   *   - "fal-ai/qr-code-generator" for QR art
   * 
   * WHY fal.ai: They offer serverless GPU inference with simple per-call pricing,
   * no GPU provisioning needed. Perfect for SaaS wrappers where we charge a subscription
   * and pay per-inference. The margin comes from users who subscribe but don't max out
   * their credits (typical SaaS gym-membership economics).
   */
  readonly falModelIdentifier: string;

  /**
   * What type of input this tool accepts. Determines which upload UI to show.
   * "image" = drag-and-drop image upload
   * "text" = text prompt input
   * "both" = image upload + text prompt (e.g., image editing with instructions)
   */
  readonly inputType: "image" | "text" | "both";

  /**
   * Pricing tiers — must have free, basic, and pro.
   * Free tier is the conversion funnel top — let users try it so they see value.
   * Basic is the "just enough" tier for casual users.
   * Pro is the "never worry about limits" tier for power users.
   */
  readonly pricing: {
    readonly free: ProductPricingTier;
    readonly basic: ProductPricingTier;
    readonly pro: ProductPricingTier;
  };
}

/**
 * PRODUCT_CONFIG — Edit this object to configure your AI tool clone.
 * 
 * This is deliberately a plain object (not fetched from a DB or API) because:
 * 1. It changes once per product, not per user or per request
 * 2. It needs to be available at build time for static generation of the landing page
 * 3. Keeping it in code means it's version-controlled and auditable
 */
/**
 * Derives a URL-safe slug from the product name for database namespacing.
 * Used by the shared fleet database to scope user_profiles, credit_transactions,
 * and subscriptions per product. Returns "default" for the unmodified template.
 */
export function deriveProductSlug(name: string): string {
  if (!name || name === "AI Tool Name") return "default";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const PRODUCT_CONFIG: ProductConfiguration = {
  name: "AI Tool Name",
  tagline: "Transform your images with one click",
  description:
    "Professional-grade AI processing in seconds. No design skills needed. Upload, process, download.",
  falModelIdentifier: "fal-ai/birefnet",
  inputType: "image",
  pricing: {
    free: { price: 0, limit: 3, period: "day" },
    basic: { price: 4.99, limit: 50, period: "month" },
    pro: { price: 9.99, limit: -1, period: "month" },
  },
};
