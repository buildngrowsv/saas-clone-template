/**
 * Root Layout — The outermost wrapper for every page in the app.
 * 
 * WHY THIS STRUCTURE:
 * Next.js App Router requires a root layout.tsx that wraps all pages.
 * We use it to:
 *   1. Set the HTML lang and dark class (dark theme by default)
 *   2. Load global CSS (Tailwind + our custom styles)
 *   3. Wrap everything in the NextAuth SessionProvider so any component
 *      can access the user's auth state via useSession()
 *   4. Load GA4 (Consent Mode) + cookie banner when `NEXT_PUBLIC_GA_MEASUREMENT_ID` or
 *      `NEXT_PUBLIC_GA_ID` is set — see `CookieConsent` and `GoogleAnalytics`.
 *   5. Set meta tags for SEO (title, description, Open Graph)
 * 
 * ARCHITECTURE NOTE:
 * The SessionProvider is a client component, but we keep the layout as a
 * server component. The trick is to extract the SessionProvider into a
 * separate client component (AuthSessionProvider) and use it here.
 * This is the standard pattern recommended by NextAuth for App Router.
 */

import type { Metadata } from "next";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { default as GoogleAnalyticsLoader } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

/**
 * Dynamic metadata generated from PRODUCT_CONFIG and siteConfig.
 *
 * WHY metadataBase:
 * Next.js App Router uses `metadataBase` to resolve all relative URLs in metadata
 * (e.g. og:image paths). Without it, OG images, canonical URLs, and Twitter card
 * images all generate as relative paths, which break social sharing previews.
 *
 * The value comes from NEXT_PUBLIC_APP_URL (trimmed via siteConfig.siteUrl) —
 * set this env var on Vercel to your production domain before launch.
 *
 * WHY alternates.canonical:
 * Canonical URL prevents duplicate content penalties from search engines when
 * the same page is accessible via multiple URLs (e.g. www vs non-www, preview URLs).
 *
 * WHY: By deriving metadata from config, cloning a new product automatically
 * updates all SEO tags. No need to manually edit layout.tsx for each clone.
 */
export const metadata: Metadata = {
  /**
   * metadataBase resolves relative paths in openGraph.images, twitter.images,
   * and alternates.canonical. Must be an absolute URL.
   * Reference: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
   */
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: `${PRODUCT_CONFIG.name} — ${PRODUCT_CONFIG.tagline}`,
    template: `%s | ${PRODUCT_CONFIG.name}`,
  },
  description: PRODUCT_CONFIG.description,
  /**
   * alternates.canonical: tells search engines the preferred URL for this page.
   * Prevents duplicate content issues from Vercel preview URLs or www/non-www variants.
   */
  alternates: {
    canonical: siteConfig.siteUrl,
  },
  openGraph: {
    title: PRODUCT_CONFIG.name,
    description: PRODUCT_CONFIG.description,
    type: "website",
    url: siteConfig.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_CONFIG.name,
    description: PRODUCT_CONFIG.description,
  },
};

/**
 * Root layout component.
 * 
 * WHY "dark" class on <html>:
 * We default to dark mode because AI tools look better dark (industry standard).
 * If we ever want to add a light mode toggle, the class-based dark mode from
 * Tailwind makes it straightforward — just toggle the class.
 * 
 * WHY suppressHydrationWarning:
 * The dark class on <html> can cause a hydration mismatch if the client
 * has a different preference cached. suppressHydrationWarning prevents
 * React from throwing an error for this known, harmless mismatch.
 */
/**
 * JSON-LD structured data for search engine rich results.
 *
 * Provides schema.org SoftwareApplication markup so Google/Bing can display
 * rich snippets (app name, category, pricing) in search results. This is
 * derived from PRODUCT_CONFIG so each clone automatically gets correct
 * structured data without manual edits.
 */
const jsonLdStructuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: PRODUCT_CONFIG.name,
  description: PRODUCT_CONFIG.description,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier available. Pro plans for unlimited use.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdStructuredData),
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <GoogleAnalyticsLoader />
        <CookieConsent />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
