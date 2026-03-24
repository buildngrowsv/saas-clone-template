/**
 * PostCSS Configuration
 * 
 * WHY: Tailwind CSS 4 uses @tailwindcss/postcss as its PostCSS plugin
 * (replacing the old tailwindcss plugin). This is the standard setup
 * recommended by the Tailwind 4 docs.
 */

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
