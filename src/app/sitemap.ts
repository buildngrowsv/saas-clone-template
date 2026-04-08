/**
 * sitemap.ts — Auto-generated sitemap.xml for search engine discovery.
 *
 * WHY THIS EXISTS:
 * Search engines use sitemap.xml to discover pages they should crawl and index.
 * Without it, crawlers may miss new pages or crawl at a slower cadence. This
 * is a standard SEO requirement for any web product.
 *
 * BASE URL:
 * Reads from siteConfig.siteUrl which comes from NEXT_PUBLIC_APP_URL env var
 * (with .trim() to strip trailing whitespace/newlines — a common Vercel env
 * entry mistake). Falls back to the Vercel preview URL, then localhost.
 *
 * HOW TO CUSTOMIZE:
 * Add or remove paths from the `paths` array below to match your product's
 * routes. Common additions: /generate, /gallery, /studio, /about, /vs/* pages.
 *
 * ADDED TO TEMPLATE: 2026-04-08 (steel-circuit-4738) — required for all clones.
 * Previously only some fleet repos had this; now ships in the template so every
 * new clone starts with proper sitemap coverage.
 */

import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Strip trailing slash from base URL to avoid double-slash in generated URLs.
 * NEXT_PUBLIC_APP_URL is already trimmed in site.ts via .trim(), so this just
 * handles the optional trailing slash case.
 */
const BASE_URL = siteConfig.siteUrl.replace(/\/$/, "");

/**
 * Core pages that every SaaS clone ships with.
 *
 * HOW TO EXTEND:
 * When you add product-specific routes (e.g. /generate, /studio, /gallery),
 * add them here so search engines discover them at launch, not months later.
 *
 * WHY LEGAL PAGES ARE INCLUDED:
 * Privacy policy and terms of service improve trust signals in SERPs.
 * Some directories (Toolify, AlternativeTo) also require verified legal pages
 * before listing your product.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const paths = [
    "",           // homepage — highest priority
    "/pricing",   // conversion-critical
    "/login",     // user acquisition
    "/privacy-policy",
    "/terms-of-service",
    "/refund-policy",
    // TODO: add product-specific paths here, e.g.:
    // "/generate",
    // "/gallery",
    // "/studio",
    // "/about",
  ];

  return paths.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    /**
     * Priority scale: 1.0 = homepage, 0.9 = pricing (high conversion value),
     * 0.8 = core feature paths, 0.5 = legal pages (low crawl value).
     */
    priority:
      path === "" ? 1.0
      : path === "/pricing" ? 0.9
      : path.startsWith("/privacy") || path.startsWith("/terms") || path.startsWith("/refund") ? 0.5
      : 0.8,
  }));
}
