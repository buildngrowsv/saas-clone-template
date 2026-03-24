/**
 * Main app layout — wraps all pages that show the header and footer.
 *
 * WHY A ROUTE GROUP:
 * The (main) route group applies the header/footer layout to all non-login pages.
 * The login page has its own minimal layout without header/footer for a cleaner
 * authentication experience. Route groups in Next.js are denoted by parentheses
 * and don't create URL segments — so /pricing resolves to (main)/pricing/page.tsx.
 *
 * LAYOUT STRUCTURE:
 * - SiteHeader (sticky top navigation)
 * - main content (flex-1 to fill available space)
 * - SiteFooter (at the bottom)
 *
 * The flex min-h-screen ensures the footer is always at the bottom of the viewport,
 * even on short pages.
 */
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
