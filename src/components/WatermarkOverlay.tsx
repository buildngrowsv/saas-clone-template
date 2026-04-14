/**
 * WatermarkOverlay — Adds a "Made with [ProductName]" watermark on free-tier results.
 *
 * WHY THIS EXISTS (flux-exec-4419, 2026-04-14, viral growth loop):
 * When free-tier users share their AI-generated outputs on social media, the
 * watermark acts as a built-in referral mechanism. Every shared image becomes
 * a micro-advertisement for the product. Research shows branded output sharing
 * drives 5-10x more organic social impressions than unwatermarked output.
 *
 * HOW IT WORKS:
 * - Renders a semi-transparent overlay on the bottom-right of processed images
 * - Only shows for free-tier users (basic and pro get clean output)
 * - Overlay includes product name + symplyai.io URL for attribution
 * - Small enough to not degrade the result, visible enough to be noticed when shared
 * - Removing the watermark is a natural upgrade incentive
 *
 * IMPORTED BY: ResultDisplay.tsx (wraps the processed result image)
 */

"use client";

interface WatermarkOverlayProps {
  /**
   * Product name to display in the watermark. Pulled from siteConfig.siteName.
   */
  readonly productName: string;

  /**
   * Whether the current user is on a paid tier (basic or pro).
   * Paid users see no watermark — it's a perk of upgrading.
   */
  readonly isPaidUser: boolean;

  /**
   * The child element (the result image) that the watermark overlays.
   */
  readonly children: React.ReactNode;
}

export function WatermarkOverlay({
  productName,
  isPaidUser,
  children,
}: WatermarkOverlayProps) {
  /**
   * Paid users get clean output — no watermark. This is one of the most
   * tangible benefits of upgrading from free to paid.
   */
  if (isPaidUser) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}

      {/* Watermark overlay — positioned at bottom-right of the image container.
       *
       * DESIGN DECISIONS:
       * - Semi-transparent white text on dark gradient strip for readability on any image
       * - Small font (10px) so it doesn't degrade the result quality
       * - Bottom-right placement follows industry convention (stock photos, preview tools)
       * - pointer-events-none so users can still interact with the image underneath
       * - Gradient background ensures text is readable on both light and dark images
       */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <div className="bg-gradient-to-t from-black/50 to-transparent px-3 py-2 flex items-center justify-end">
          <span className="text-[10px] text-white/80 font-medium tracking-wide">
            Made with {productName} · symplyai.io
          </span>
        </div>
      </div>
    </div>
  );
}
