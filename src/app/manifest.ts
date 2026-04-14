/**
 * manifest.ts — Web App Manifest for PWA installability
 *
 * WHY: Without a manifest, Chrome will not show "Install App" prompts and
 * Lighthouse flags missing PWA metadata. This provides the minimum viable
 * manifest for installability: name, icons (from our dynamic apple-icon),
 * theme colors matching the fleet's dark design language, and display mode.
 *
 * NEXT.JS CONVENTION: Placing manifest.ts in the app directory auto-generates
 * /manifest.webmanifest and injects the <link rel="manifest"> tag.
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Tool — Powered by SymplyAI",
    short_name: "AI Tool",
    description: "AI-powered tool by SymplyAI",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
