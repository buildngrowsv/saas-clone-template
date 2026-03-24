/**
 * Root layout — wraps ALL pages with fonts, theme provider, and global styles.
 *
 * This is the outermost layout in the Next.js app router. Every page
 * gets wrapped in this component, which provides:
 * 1. Geist font (clean modern sans-serif, same family used by Vercel)
 * 2. ThemeProvider for dark/light mode (persisted in localStorage)
 * 3. Toaster for toast notifications (success, error, info messages)
 * 4. SEO metadata with JSON-LD structured data
 *
 * The JSON-LD structured data helps search engines understand:
 * - What the site is (WebSite schema)
 * - What it does (SoftwareApplication schema)
 * - Pricing range (for rich snippets)
 *
 * All branding is pulled from src/config/site.ts so rebranding
 * only requires changing that one config file.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import "./globals.css";

/**
 * Geist font — modern sans-serif by Vercel.
 * Used as the primary font via CSS variable --font-geist-sans.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Geist Mono — monospace variant for code blocks and technical content.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * SEO metadata — populated from siteConfig.
 * The template pattern means child pages can set their own title
 * which gets appended with " | Your SaaS".
 */
export const metadata: Metadata = {
  title: {
    default: siteConfig.siteName,
    template: `%s | ${siteConfig.siteName}`,
  },
  description: siteConfig.siteDescription,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || siteConfig.siteUrl),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * JSON-LD structured data for SEO.
   * WebSite schema: helps Google show sitelinks in search results.
   * SoftwareApplication schema: adds pricing info to rich snippets.
   *
   * These are placed in the body (not head) because search engines
   * parse JSON-LD from anywhere in the document.
   */
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    description: siteConfig.siteDescription,
    publisher: {
      "@type": "Organization",
      name: siteConfig.siteName,
      url: siteConfig.siteUrl,
    },
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.siteName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "9.99",
      highPrice: "99.99",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* JSON-LD structured data for search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme={siteConfig.defaultTheme}
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
