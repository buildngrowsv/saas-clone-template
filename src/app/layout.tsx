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
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { default as GoogleAnalyticsLoader } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

/**
 * Dynamic metadata generated from PRODUCT_CONFIG.
 * WHY: By deriving metadata from config, cloning a new product automatically
 * updates all SEO tags. No need to manually edit layout.tsx for each clone.
 */
export const metadata: Metadata = {
  title: {
    default: `${PRODUCT_CONFIG.name} — ${PRODUCT_CONFIG.tagline}`,
    template: `%s | ${PRODUCT_CONFIG.name}`,
  },
  description: PRODUCT_CONFIG.description,
  openGraph: {
    title: PRODUCT_CONFIG.name,
    description: PRODUCT_CONFIG.description,
    type: "website",
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
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <GoogleAnalyticsLoader />
        <CookieConsent />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
