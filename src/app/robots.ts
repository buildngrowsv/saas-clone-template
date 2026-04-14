/**
 * robots.ts — Dynamic robots.txt generation for proper SEO.
 *
 * WHY DYNAMIC (not static public/robots.txt):
 * The Sitemap directive must point to the production domain, which varies
 * per clone. A static robots.txt can't include the correct domain without
 * manual editing. By using Next.js's robots.ts convention, we read the
 * domain from NEXT_PUBLIC_APP_URL and generate the correct sitemap URL
 * automatically for every clone.
 *
 * WHAT THIS REPLACES:
 * The previous static public/robots.txt only had Allow/Disallow rules
 * but no Sitemap directive. Search engines discover sitemaps via robots.txt,
 * so the missing Sitemap line meant crawlers had to find it by guessing
 * /sitemap.xml — which works for Googlebot but not all crawlers.
 */

import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = siteConfig.siteUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
