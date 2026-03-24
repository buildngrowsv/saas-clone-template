/**
 * Site configuration — the single source of truth for branding, URLs, and metadata.
 *
 * WHY THIS FILE EXISTS:
 * This template is designed to be reusable across multiple SaaS products.
 * Instead of hardcoding brand names, colors, and URLs throughout the codebase,
 * every component reads from this config. To rebrand the entire app, you only
 * need to change values here — the landing page, header, footer, login page,
 * SEO metadata, and email templates all pull from this config.
 *
 * HOW TO CUSTOMIZE:
 * 1. Change `siteName` to your product name
 * 2. Change `siteDescription` to your product's one-liner
 * 3. Set `siteUrl` to your production domain
 * 4. Update `supportEmail` to your support address
 * 5. Adjust `themeColors` to match your brand (used for gradients and accents)
 * 6. Update `socialLinks` with your social media handles
 *
 * IMPORTED BY:
 * - src/app/layout.tsx (SEO metadata, JSON-LD structured data)
 * - src/components/layout/SiteHeader.tsx (logo text, brand gradient)
 * - src/components/layout/SiteFooter.tsx (brand name, support email, copyright)
 * - src/app/(main)/page.tsx (hero text, CTAs, trust bar)
 * - src/app/login/page.tsx (welcome message)
 * - src/app/login/layout.tsx (SEO metadata)
 */
export const siteConfig = {
  /**
   * Primary brand name — displayed in header, footer, hero, and SEO.
   * Keep this short (1-3 words) for clean header layout.
   */
  siteName: "Your SaaS",

  /**
   * One-sentence product description — used in meta tags, hero subtitle, and footer.
   * Should communicate the core value proposition in under 160 characters (SEO limit).
   */
  siteDescription: "The all-in-one platform for your business. Launch faster with built-in auth, payments, and storage.",

  /**
   * Production URL — used for SEO canonical URLs, JSON-LD, and auth callbacks.
   * In development, NEXT_PUBLIC_APP_URL env var overrides this.
   * Set this to your actual domain before deploying.
   */
  siteUrl: "https://yoursaas.com",

  /**
   * Support email — displayed in the footer and used for mailto: links.
   * Should be a real inbox that someone monitors.
   */
  supportEmail: "support@yoursaas.com",

  /**
   * Brand gradient colors — used for the logo text, hero heading, CTA buttons,
   * and accent highlights throughout the UI. These are Tailwind CSS color classes.
   *
   * WHY GRADIENTS:
   * Gradient text and buttons create visual hierarchy and brand recognition.
   * The banananano2pro source used amber-to-orange, which gives a warm/premium feel.
   * Change these to match your brand — e.g., blue-to-purple for tech, green-to-teal for health.
   *
   * These are used as Tailwind class fragments, e.g.:
   *   `bg-gradient-to-r ${siteConfig.themeColors.gradientFrom} ${siteConfig.themeColors.gradientTo}`
   */
  themeColors: {
    /** Starting color of the brand gradient (left side) */
    gradientFrom: "from-blue-400",
    /** Middle color of the brand gradient (optional, for 3-stop gradients) */
    gradientVia: "via-indigo-500",
    /** Ending color of the brand gradient (right side) */
    gradientTo: "to-blue-600",
    /** Hover state — slightly darker variants for interactive elements */
    gradientFromHover: "hover:from-blue-500",
    gradientToHover: "hover:to-indigo-700",
    /** Icon/accent background with transparency (for feature cards, badges) */
    accentBackground: "from-blue-500/20 to-indigo-500/20",
    /** Text color for icons on accent backgrounds */
    accentText: "text-blue-500",
    /** Border highlight for popular plan cards and hover states */
    accentBorder: "border-blue-500/50",
    accentBorderHover: "hover:border-blue-500/30",
    /** Ring for popular plan cards (subtle outer glow) */
    accentRing: "ring-blue-500/20",
    /** Badge styling for "Popular" tags */
    badgeBackground: "bg-blue-500/20",
    badgeText: "text-blue-600 dark:text-blue-400",
    badgeHover: "hover:bg-blue-500/30",
  },

  /**
   * Social links — displayed in footer. Set to empty string or remove to hide.
   */
  socialLinks: {
    twitter: "",
    github: "",
    discord: "",
  },

  /**
   * Navigation links for the header — customize for your product.
   * Each entry gets a nav button in the desktop header and a link in the mobile menu.
   * The `href` is a Next.js route path. Use `protected: true` for auth-required pages.
   */
  navigationLinks: [
    { label: "Pricing", href: "/pricing" },
    { label: "Dashboard", href: "/dashboard", protected: true },
  ],

  /**
   * Footer link columns — customize for your product's pages.
   * Each column gets a heading and list of links.
   */
  footerColumns: [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Pricing", href: "/pricing" },
        { label: "Dashboard", href: "/dashboard" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Terms of Service", href: "/terms-of-service" },
      ],
    },
  ],

  /**
   * Default theme — "dark" or "light" or "system".
   * Controls what new users see before they toggle the theme.
   */
  defaultTheme: "dark" as const,
};

/**
 * Type export for use in components that need type-safe access to config.
 */
export type SiteConfig = typeof siteConfig;
