/**
 * PostCSS configuration — Tailwind CSS 4 plugin.
 *
 * WHY THIS FILE:
 * Tailwind CSS 4 uses a PostCSS plugin (@tailwindcss/postcss) instead of
 * the separate tailwindcss CLI or the older PostCSS plugin from v3.
 * This is the minimal config needed — Tailwind v4 auto-discovers your
 * content files and CSS config from globals.css.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
