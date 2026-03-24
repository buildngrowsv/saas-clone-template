/**
 * Tailwind CSS Configuration for SaaS Clone Template
 * 
 * WHY: We use Tailwind 4 with CSS-first configuration, but this file exists
 * for compatibility with tooling (VS Code IntelliSense, etc.) and for the
 * tailwindcss-animate plugin which still needs JS config in Tailwind 4.
 * 
 * The actual theme customization (colors, fonts) happens in src/app/globals.css
 * using the new @theme directive in Tailwind 4.
 */

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  plugins: [tailwindcssAnimate],
};

export default config;
