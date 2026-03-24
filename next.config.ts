/**
 * Next.js Configuration for SaaS Clone Template
 * 
 * WHY: This config allows fal.ai generated images to be served through Next.js
 * Image optimization. Each AI tool clone will produce output images hosted on
 * fal.ai's CDN, and we need to whitelist those domains so <Image> components
 * can display them without security errors.
 * 
 * We also enable the App Router experimental features that are stable in Next.js 15+
 * but still need explicit opt-in for some edge cases.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Remote image domains — fal.ai hosts all AI-generated output images
     * on their CDN. We whitelist both their main CDN and the storage bucket
     * domain so generated results can be displayed via next/image optimization.
     * 
     * WHY remotePatterns instead of domains: remotePatterns gives us more
     * granular control and is the recommended approach in Next.js 15+.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fal.media",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.fal.ai",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },

  /**
   * Enable server actions — used by our Stripe checkout and generation API
   * routes that need to run server-side logic triggered from client components.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
