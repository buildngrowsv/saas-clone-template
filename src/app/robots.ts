/**
 * robots.ts — Generated robots.txt for crawler access control.
 *
 * WHY THIS EXISTS:
 * robots.txt tells search engine crawlers which pages to index and which to skip.
 * Without it, crawlers may index /api/ routes (wasteful, no SEO value) or the
 * /_next/ internal assets (definitely not useful). This file ships with sensible
 * defaults that work for any SaaS product in this fleet.
 *
 * RULES:
 * - Allow all crawlers to access all public pages.
 * - Block /api/ — server-side endpoints, not useful for SEO.
 * - Block /_next/ — Next.js build artifacts, not useful for SEO.
 * - Reference sitemap.xml so crawlers can discover all pages at once.
 *
 * BASE URL:
 * Reads from siteConfig.siteUrl (which already applies .trim() to
 * NEXT_PUBLIC_APP_URL). Trailing slash stripped to produce clean sitemap URL.
 *
 * ADDED TO TEMPLATE: 2026-04-08 (steel-circuit-4738) — required for all clones.
 */

import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

const BASE_URL = siteConfig.siteUrl.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    /**
     * Sitemap reference — crawlers use this to discover all indexable pages
     * without having to crawl the entire site from the homepage.
     */
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
