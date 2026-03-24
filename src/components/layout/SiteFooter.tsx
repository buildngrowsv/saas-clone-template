/**
 * SiteFooter — footer displayed on all main pages.
 *
 * READS FROM CONFIG:
 * Brand name, support email, and footer link columns come from src/config/site.ts.
 * To rebrand, change site.ts — this component adapts automatically.
 *
 * LAYOUT:
 * - Brand column with name and description (spans 2 columns on large screens)
 * - Configurable link columns from siteConfig.footerColumns
 * - Copyright line at the bottom
 *
 * IMPORTED BY:
 * - src/app/(main)/layout.tsx (wraps all main pages)
 */
import Link from "next/link";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  /**
   * Current year for the copyright notice.
   * Using new Date() ensures it's always current without manual updates.
   */
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-800/60 bg-gray-950">
      <div className="container max-w-screen-2xl px-4 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
          {/* Brand column — spans 2 columns for more space */}
          <div className="col-span-2">
            <span className={`text-lg font-bold bg-gradient-to-r ${siteConfig.themeColors.gradientFrom} ${siteConfig.themeColors.gradientTo} bg-clip-text text-transparent`}>
              {siteConfig.siteName}
            </span>
            <p className="mt-3 text-sm text-gray-300 max-w-xs">
              {siteConfig.siteDescription}
            </p>
            {siteConfig.supportEmail && (
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="mt-3 inline-block text-sm text-gray-400 hover:text-white transition-colors"
              >
                {siteConfig.supportEmail}
              </a>
            )}
          </div>

          {/* Dynamic link columns from config */}
          {siteConfig.footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-semibold text-sm text-white mb-4">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800/60 text-center">
          <p className="text-xs text-gray-400">
            Copyright &copy; {currentYear} {siteConfig.siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
