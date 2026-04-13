/**
 * GetStartedCTA — A drop-in call-to-action button/link that routes to the onboarding questionnaire.
 *
 * WHY THIS COMPONENT EXISTS:
 * The onboarding questionnaire at /get-started is an optional conversion funnel.
 * Rather than modifying the existing LandingHero or other components to link there,
 * this standalone CTA can be placed anywhere — hero section, feature section,
 * sticky banner, exit-intent popup, etc. — without touching existing code.
 *
 * CONVERSION PSYCHOLOGY:
 * The button uses "Get Your Personalized Plan" instead of generic "Get Started"
 * because it promises a personalized outcome (the "what's in it for me" framing).
 * The arrow icon creates directional momentum. The gradient matches the brand
 * accent to signal it's the primary action on the page.
 *
 * USAGE:
 *   import { GetStartedCTA } from "@/components/GetStartedCTA";
 *
 *   // In a hero section:
 *   <GetStartedCTA />
 *
 *   // With custom label:
 *   <GetStartedCTA label="Find My Plan" />
 *
 *   // Compact variant for inline placement:
 *   <GetStartedCTA variant="compact" />
 *
 * DOES NOT MODIFY:
 * - src/app/page.tsx (landing page)
 * - src/components/LandingHero.tsx
 * - Any existing component or route
 *
 * DEPENDS ON:
 * - /get-started route (src/app/get-started/page.tsx)
 */

import Link from "next/link";

/**
 * Props for the GetStartedCTA component.
 * All props are optional — the component works with zero configuration.
 */
interface GetStartedCtaProps {
  /**
   * Button label text. Defaults to "Get Your Personalized Plan" which
   * performs well in A/B tests for onboarding funnels because it promises
   * a personalized outcome rather than a generic action.
   */
  label?: string;

  /**
   * Visual variant controlling size and padding:
   * - "default": Large button with glow effect — use in hero sections and prominent placements
   * - "compact": Smaller button without glow — use inline or in feature sections
   */
  variant?: "default" | "compact";

  /**
   * Optional additional CSS classes for the outer wrapper.
   * Useful for margin/positioning adjustments without modifying the component.
   */
  className?: string;
}

/**
 * GetStartedCTA — Renders a gradient CTA button linking to /get-started.
 *
 * The component is a simple Next.js Link with marketing-polished styling.
 * It uses CSS-only animations (no framer-motion or external animation libs)
 * to keep the bundle lean — this template is used across 40+ clone sites,
 * so every kilobyte of JS matters.
 *
 * The glow effect on the default variant uses a pseudo-element with blur,
 * matching the existing LandingHero button style for visual consistency.
 */
export function GetStartedCTA({
  label = "Get Your Personalized Plan",
  variant = "default",
  className = "",
}: GetStartedCtaProps) {
  /**
   * WHY TWO VARIANTS:
   * The "default" variant is designed for hero-level prominence — large padding,
   * glow effect, hover scale animation. It commands attention.
   * The "compact" variant is for secondary placements (feature sections, sidebars,
   * blog CTAs) where the button should be present but not dominate the layout.
   */
  const isDefaultVariant = variant === "default";

  return (
    <div className={className}>
      <Link
        href="/get-started"
        className={[
          /* Base styles shared by both variants */
          "inline-flex items-center justify-center gap-2",
          "font-semibold rounded-xl",
          "bg-gradient-to-r from-brand-500 to-brand-600",
          "hover:from-brand-400 hover:to-brand-500",
          "text-white",
          "transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",

          /* Variant-specific styles */
          isDefaultVariant
            ? "px-8 py-4 text-lg glow-button"
            : "px-6 py-3 text-sm",
        ].join(" ")}
      >
        {label}

        {/*
          Arrow SVG — inline rather than importing from lucide-react to keep
          this component dependency-free. The arrow provides directional momentum
          and the group-hover translate creates a subtle "go forward" animation.
        */}
        <svg
          className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </Link>
    </div>
  );
}
