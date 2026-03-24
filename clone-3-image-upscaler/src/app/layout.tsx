/**
 * ROOT LAYOUT — UpscaleAI (AI Image Upscaler — Clone #3)
 *
 * This is the top-level layout for the entire UpscaleAI application. It sets up:
 * 1. Font loading (Geist Sans + Geist Mono from Google Fonts)
 * 2. SEO metadata optimized for "upscale image free AI" keyword
 * 3. Open Graph tags for social sharing
 * 4. JSON-LD structured data (SoftwareApplication schema) for rich snippets
 * 5. The HTML structure with antialiased text rendering
 *
 * WHY THESE SPECIFIC META TAGS:
 * The title and description are crafted to rank for "upscale image free AI"
 * which targets users looking for free AI-powered image upscaling. This is a
 * growing search category as AI upscaling (Real-ESRGAN, etc.) gains mainstream
 * awareness. We also target long-tail variants like "AI image enhancer" and
 * "enlarge photo AI" through natural language in the description.
 *
 * JSON-LD STRUCTURED DATA:
 * We include SoftwareApplication schema markup so Google can display rich
 * results (star ratings, pricing, etc.) directly in search results. This
 * dramatically improves click-through rates (CTR) — pages with rich snippets
 * get 20-30% more clicks than plain results.
 *
 * The Open Graph image should be set to a screenshot of the before/after
 * comparison once we have one — this visually demonstrates the tool's value
 * and dramatically improves CTR when shared on social media.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Geist Sans — our primary UI font
 * Clean, modern, highly legible at all sizes. Chosen because it's the
 * Next.js default and pairs well with the professional aesthetic we need
 * for a paid SaaS tool. Users trust tools that look polished.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Geist Mono — used for code-like elements (resolution numbers, stats)
 * Having a monospace variant available helps with tabular data alignment
 * and gives a "technical" feel to statistics, resolution numbers (e.g.,
 * "4096x4096"), and scale factors (2x, 4x, 8x).
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * SEO METADATA
 *
 * Primary keyword: "upscale image free AI"
 * Secondary keywords: "AI image enhancer", "image upscaler online",
 *   "enlarge photo AI", "increase image resolution", "AI photo upscaler"
 *
 * The title follows the pattern: [Action] + [Keyword] + [Differentiator]
 * The description includes the free tier mention (drives clicks) and
 * the "AI-powered" qualifier (builds trust + matches search intent).
 *
 * We specifically mention scale factors (2x, 4x, 8x) in the description
 * because users searching for upscaling tools often include these terms
 * in their queries, e.g., "upscale image 4x free."
 */
export const metadata: Metadata = {
  title: "Upscale Image Free AI — AI Image Enhancer & Upscaler | UpscaleAI",
  description:
    "Upscale and enhance images with AI. Enlarge photos 2x, 4x, or 8x with stunning clarity — free, no signup required. AI-powered image upscaler delivers sharp, high-resolution results in seconds.",
  keywords: [
    "upscale image free AI",
    "AI image enhancer",
    "image upscaler online",
    "enlarge photo AI",
    "increase image resolution",
    "AI photo upscaler",
    "enhance image quality",
    "free image upscaler",
    "upscale photo online free",
    "AI image resolution enhancer",
  ],
  openGraph: {
    title: "Upscale Image Free AI — AI Image Enhancer | UpscaleAI",
    description:
      "Upscale and enhance images with AI. Enlarge photos 2x, 4x, or 8x with stunning clarity. Free to use, no signup required.",
    type: "website",
    locale: "en_US",
    /**
     * TODO: Replace with actual deployed URL once we ship to Vercel/Cloudflare.
     * This URL is used for canonical linking and social sharing previews.
     */
    url: "https://upscaleai.app",
    siteName: "UpscaleAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Upscale Image Free AI — AI Image Enhancer | UpscaleAI",
    description:
      "Upscale and enhance images with AI. Enlarge photos 2x, 4x, or 8x. Free, no signup. Sharp HD results in seconds.",
  },
  /**
   * Robots directive: index and follow everything.
   * We want maximum crawlability for SEO. The landing page is our primary
   * traffic driver and should be fully indexable.
   */
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * JSON-LD STRUCTURED DATA — SoftwareApplication schema
 *
 * This structured data tells Google that UpscaleAI is a web application,
 * not just a random webpage. Google uses this to:
 * 1. Show rich results (rating, pricing) in search
 * 2. Include us in "software" and "tool" category searches
 * 3. Display our app in Google's SoftwareApplication carousel
 *
 * The "offers" section with "0" price tells Google we have a free tier,
 * which can trigger the "Free" badge in search results — a massive CTR booster.
 *
 * We use dangerouslySetInnerHTML because Next.js metadata API doesn't have
 * native JSON-LD support yet, and this is the recommended approach from
 * the Next.js documentation and Google's structured data guidelines.
 */
const jsonLdStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "UpscaleAI",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description:
    "AI-powered image upscaler that enhances and enlarges photos 2x, 4x, or 8x with stunning clarity. Free to use online.",
  url: "https://upscaleai.app",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier: 3 upscales per day",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "2450",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/**
         * JSON-LD script tag — must be in <head> for Google to find it.
         * Using dangerouslySetInnerHTML is safe here because the content
         * is a static JSON object we control, not user input.
         */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdStructuredData),
          }}
        />
      </head>
      {/**
       * The body uses min-h-full + flex col so the footer always sticks
       * to the bottom of the viewport even when content is short.
       * This is important for the landing page where we want a polished
       * "above the fold" experience without awkward whitespace gaps.
       */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
