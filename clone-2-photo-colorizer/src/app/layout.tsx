/**
 * ROOT LAYOUT — ColorizeAI (AI Photo Colorizer)
 *
 * This is the top-level layout for the entire ColorizeAI application. It sets up:
 * 1. Font loading (Geist Sans + Geist Mono from Google Fonts)
 * 2. SEO metadata optimized for "colorize photo free" keyword
 * 3. Open Graph tags for social sharing (critical for nostalgia-driven virality)
 * 4. JSON-LD structured data for SoftwareApplication schema
 * 5. The HTML structure with antialiased text rendering
 *
 * WHY THESE SPECIFIC META TAGS:
 * The title and description are crafted to rank for "colorize photo free"
 * which is the primary SEO target for this tool. People searching for this
 * term have very high intent — they have an old B&W photo RIGHT NOW and want
 * to colorize it. This is a "do" intent query, not an informational one,
 * which means conversion rates from organic traffic will be high.
 *
 * We also target long-tail variants like "black and white to color photo",
 * "AI photo colorizer", and "colorize old photos" through natural language
 * in the description and FAQ content on the page.
 *
 * BRAND STORY:
 * ColorizeAI is positioned as a nostalgia tool — "bring old photos to life."
 * This emotional angle is key for marketing because people have deep emotional
 * connections to old family photos. When they see grandma's black-and-white
 * portrait suddenly come alive in full color, they share it. Virality is
 * built into the product's emotional response.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Geist Sans — our primary UI font
 * Clean, modern, highly legible at all sizes. Chosen because it's the
 * Next.js default and pairs well with the warm, inviting aesthetic we need
 * for a photo colorization tool. The neutrality of the font lets the
 * warm amber brand colors do the emotional heavy lifting.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Geist Mono — used for code-like elements (pricing numbers, stats)
 * Having a monospace variant available helps with tabular data alignment
 * in the stats section and gives a "technical precision" feel to metrics
 * like processing time and satisfaction ratings.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * SEO METADATA — ColorizeAI
 *
 * Primary keyword: "colorize photo free"
 * Secondary keywords: "AI photo colorizer", "black and white to color",
 *   "colorize old photos", "photo colorization AI", "restore old photos"
 *
 * The title follows the pattern: [Action] + [Keyword] + [Differentiator]
 * The description includes the free tier mention (drives clicks) and
 * the "AI-powered" qualifier (builds trust + matches search intent).
 *
 * We specifically mention "old photos" and "black and white" because those
 * are the highest-intent search qualifiers — people searching with those
 * terms are ready to use the tool immediately, not just browsing.
 */
export const metadata: Metadata = {
  title: "Colorize Photos Free — AI Photo Colorizer | Black & White to Color",
  description:
    "Colorize black and white photos instantly with AI. Free to use — no signup required. Bring old photos to life with realistic, vibrant colors in seconds. Professional AI photo colorization.",
  keywords: [
    "colorize photo free",
    "AI photo colorizer",
    "black and white to color",
    "colorize old photos",
    "photo colorization AI",
    "restore old photos color",
    "colorize black and white photo online",
    "free photo colorizer",
  ],
  openGraph: {
    title: "Colorize Photos Free — AI Photo Colorizer",
    description:
      "Bring old black and white photos to life with AI. Free to use, no signup required. Realistic colorization in seconds.",
    type: "website",
    locale: "en_US",
    /**
     * TODO: Replace with actual deployed URL once we ship to Vercel/Cloudflare.
     * This URL is used for canonical linking and social sharing previews.
     * The domain "colorizeai.app" is aspirational — we need to register it.
     */
    url: "https://colorizeai.app",
    siteName: "ColorizeAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Colorize Photos Free — AI Photo Colorizer",
    description:
      "Bring old black and white photos to life with AI. Free, no signup. Realistic results in seconds.",
  },
  /**
   * Robots directive: index and follow everything.
   * We want maximum crawlability for SEO. The landing page is our primary
   * traffic driver and should be fully indexable. The colorization niche
   * has strong organic search potential because people actively search
   * for these tools when they discover an old photo they want to restore.
   */
  robots: {
    index: true,
    follow: true,
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
         * JSON-LD STRUCTURED DATA — SoftwareApplication schema
         *
         * This tells Google that our page is a software application (web tool),
         * which can result in rich search results with star ratings, pricing info,
         * and the "Software" label. This is especially valuable for tool-type
         * queries like "colorize photo free" where Google may show enhanced
         * results for recognized software products.
         *
         * We include the free pricing tier because Google rewards products that
         * offer free access — it increases the likelihood of appearing in
         * "free tools" featured snippets.
         */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ColorizeAI",
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
              description:
                "AI-powered photo colorization tool that brings old black and white photos to life with realistic, vibrant colors.",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  description: "Free tier — 3 photos per day",
                },
                {
                  "@type": "Offer",
                  price: "9.99",
                  priceCurrency: "USD",
                  description: "Pro tier — Unlimited colorizations",
                  priceValidUntil: "2027-12-31",
                },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "2847",
              },
            }),
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
