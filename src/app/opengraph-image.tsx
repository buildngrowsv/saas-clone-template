/**
 * Dynamic Open Graph Image — Auto-generated social preview for link sharing.
 *
 * WHY THIS FILE EXISTS:
 * When someone shares a link to this product on Twitter/X, LinkedIn, Slack,
 * iMessage, or Discord, the platform fetches the OG image from this endpoint
 * to show a visual preview. Without an OG image, the link preview is text-only
 * and gets significantly fewer clicks.
 *
 * HOW IT WORKS:
 * Next.js App Router recognizes `opengraph-image.tsx` at any route level
 * and automatically serves it as the og:image for that route's metadata.
 * This uses the `ImageResponse` API (built on Vercel's Satori) to render
 * JSX → PNG at request time. The image is cached by Next.js so it's only
 * generated once per deployment.
 *
 * WHY DYNAMIC (not static PNG):
 * Each clone has a different product name, tagline, and brand colors.
 * A static image would need manual replacement per clone. This file reads
 * from PRODUCT_CONFIG so every clone gets a correctly branded OG image
 * automatically — zero manual design work per SKU.
 *
 * CUSTOMIZATION:
 * - Colors derived from siteConfig.themeColors (brand gradient)
 * - Product name and tagline from PRODUCT_CONFIG
 * - To override with a hand-designed image for a specific clone,
 *   place a static `opengraph-image.png` in the same directory —
 *   Next.js will prefer the static file over this dynamic generator.
 */
import { ImageResponse } from "next/og";
import { PRODUCT_CONFIG } from "@/lib/config";

export const runtime = "edge";

export const alt = PRODUCT_CONFIG.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Decorative gradient orb — visual interest behind the text */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Product name — large gradient text */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            background: "linear-gradient(90deg, #60a5fa, #818cf8, #6366f1)",
            backgroundClip: "text",
            color: "transparent",
            lineHeight: 1.1,
            marginBottom: 24,
            display: "flex",
          }}
        >
          {PRODUCT_CONFIG.name}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            maxWidth: "800px",
            textAlign: "center",
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          {PRODUCT_CONFIG.tagline}
        </div>

        {/* Subtle bottom bar — "AI-Powered" badge for trust */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: "#64748b",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            AI-Powered
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
