/**
 * Next.js configuration for the SaaS template.
 *
 * WHY THIS EXISTS:
 * Next.js needs explicit configuration for remote image domains (used by next/image),
 * server-external packages (Neon's serverless driver needs special handling in the
 * Node.js runtime), and other deployment settings.
 *
 * CUSTOMIZATION:
 * When you deploy your SaaS, add your R2 public domain and any other image
 * CDN domains to the remotePatterns array below. The wildcard pattern for
 * r2.cloudflarestorage.com covers direct R2 URLs during development.
 *
 * The serverExternalPackages entry for @neondatabase/serverless is REQUIRED —
 * without it, Next.js tries to bundle Neon's driver which breaks in the Edge runtime.
 * This was discovered during the banananano2pro production readiness audit.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      /**
       * Cloudflare R2 storage — covers both custom domain and direct R2 URLs.
       * Replace "r2.yourdomain.com" with your actual R2 custom domain when you set one up.
       */
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },

  /**
   * Neon's serverless driver uses Node.js APIs that can't be bundled by Next.js.
   * Marking it as an external package tells Next.js to require() it at runtime
   * instead of trying to webpack-bundle it.
   */
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
