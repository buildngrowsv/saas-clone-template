/**
 * OnboardingQuestionnaire — Multi-step personalized survey that converts visitors to paid users.
 *
 * WHY THIS COMPONENT EXISTS:
 * The portfolio has 40+ AI tool clone sites with real traffic (e.g., multipleimagegenerator.com
 * gets 1,400 monthly visitors) but $0 revenue. The problem: users land on a generic tool page,
 * see a paywall, and bounce. There is zero psychological investment before the ask for money.
 *
 * Research from @adamlyttleapps and industry data (Canva, Notion, Midjourney) shows that
 * personalized onboarding questionnaires convert 2-5x better because:
 *   1. Sunk cost effect — answering questions creates ownership ("MY custom plan")
 *   2. Personalization illusion — even simple branching makes users feel understood
 *   3. Anticipation building — the loading screen creates excitement before the reveal
 *   4. Anchoring — showing volume/need questions first frames pricing as reasonable
 *
 * FLOW (5 screens):
 *   Screen 1: "What are you creating?" — Grid of use case cards
 *   Screen 2: "How many do you need?" — Slider with labeled presets
 *   Screen 3: "What style?" — Visual style selector
 *   Screen 4: "Building your personalized plan..." — Animated loading (2-3s, fake)
 *   Screen 5: "Your Custom Plan" — Personalized pricing with recommended tier highlighted
 *
 * ARCHITECTURE:
 * - Config-driven: all questions, options, and plans come from OnboardingConfig (src/config/onboarding.ts)
 * - Responses persisted in localStorage via onboarding-storage.ts
 * - UTM params captured on mount for traffic source segmentation
 * - Animated transitions between screens using CSS transitions (no external animation lib)
 * - Fully mobile-responsive
 *
 * USAGE:
 *   import { OnboardingQuestionnaire } from "@/components/OnboardingQuestionnaire";
 *   import { ONBOARDING_CONFIG } from "@/config/onboarding";
 *
 *   <OnboardingQuestionnaire
 *     config={ONBOARDING_CONFIG}
 *     onComplete={(responses) => router.push("/login")}
 *   />
 *
 * IMPORTED BY:
 * - Wherever the clone product wants to show the onboarding flow (typically the landing page
 *   or a dedicated /onboarding route)
 *
 * DEPENDS ON:
 * - src/config/onboarding.ts (OnboardingConfig type and default ONBOARDING_CONFIG)
 * - src/lib/onboarding-storage.ts (localStorage persistence and UTM capture)
 * - src/lib/utils.ts (cn() class merger)
 * - src/components/ui/button.tsx (shadcn Button)
 * - src/components/ui/card.tsx (shadcn Card)
 * - src/components/ui/slider.tsx (shadcn Slider)
 * - lucide-react (icons resolved by string name from config)
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Share2,
  Megaphone,
  User,
  Sparkles,
  Palette,
  Briefcase,
  Paintbrush,
  Camera,
  Image,
  Video,
  FileText,
  Music,
  Globe,
  Zap,
  Heart,
  Star,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import type {
  OnboardingConfig,
  OnboardingStep,
  StepOption,
  OnboardingPricingPlan,
} from "@/config/onboarding";
import type { OnboardingResponses } from "@/lib/onboarding-storage";
import {
  saveOnboardingResponse,
  getOnboardingResponses,
  markOnboardingComplete,
  captureUtmParameters,
} from "@/lib/onboarding-storage";

/* ============================================================
 * ICON RESOLUTION
 * Maps string icon names from the config to actual React components.
 * When adding new icons to your onboarding config, add them here too.
 * ============================================================ */

/**
 * Lookup table mapping icon string names (from OnboardingConfig) to lucide-react components.
 *
 * WHY A MAP INSTEAD OF DYNAMIC IMPORT:
 * Dynamic imports would add async complexity and potentially cause layout shifts.
 * Since we know the full set of possible icons at build time (they're in the config),
 * a static map is simpler, faster, and tree-shakeable.
 */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingBag,
  Share2,
  Megaphone,
  User,
  Sparkles,
  Palette,
  Briefcase,
  Paintbrush,
  Camera,
  Image,
  Video,
  FileText,
  Music,
  Globe,
  Zap,
  Heart,
  Star,
  ArrowRight,
  Check,
};

/* ============================================================
 * COMPONENT PROPS
 * ============================================================ */

/**
 * Props for the OnboardingQuestionnaire component.
 */
export interface OnboardingQuestionnaireProps {
  /**
   * Product-specific onboarding configuration.
   * Controls which questions are asked, what options are shown,
   * and what pricing plans are presented at the end.
   */
  config: OnboardingConfig;

  /**
   * Callback fired when the user completes the questionnaire (clicks a plan CTA).
   * Receives the full set of responses so the parent can route or track as needed.
   * If not provided, the CTA links navigate directly via their ctaHref.
   */
  onComplete?: (responses: OnboardingResponses) => void;

  /**
   * Optional CSS class name applied to the outermost wrapper div.
   * Useful for positioning the questionnaire within a page layout.
   */
  className?: string;
}

/* ============================================================
 * INTERNAL SUB-COMPONENTS
 * These render individual step types. They are not exported because
 * they are tightly coupled to the orchestrator's state management.
 * ============================================================ */

/**
 * ProgressIndicator — Dots showing which step the user is on.
 * Provides spatial context so users know how many steps remain
 * (reduces abandonment from "how long is this?" anxiety).
 */
function ProgressIndicator({
  totalSteps,
  currentStepIndex,
}: {
  totalSteps: number;
  currentStepIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, dotIndex) => (
        <div
          key={dotIndex}
          className={cn(
            "h-2 rounded-full transition-all duration-500 ease-out",
            dotIndex === currentStepIndex
              ? "w-8 bg-gradient-to-r from-brand-400 to-brand-600"
              : dotIndex < currentStepIndex
                ? "w-2 bg-brand-500/60"
                : "w-2 bg-white/20"
          )}
        />
      ))}
    </div>
  );
}

/**
 * GridStepRenderer — Renders a 2x2 (or 2-col on mobile) grid of selectable cards.
 * Used for categorical questions like "What are you creating?"
 *
 * WHY GRID LAYOUT:
 * Grid cards work best for 3-6 options where each option has an icon and short label.
 * They leverage the "picture superiority effect" — options with icons are remembered
 * and processed faster than text-only lists.
 */
function GridStepRenderer({
  step,
  selectedOptionId,
  onSelectOption,
}: {
  step: OnboardingStep;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
      {step.options.map((option) => {
        const IconComponent = option.icon ? ICON_MAP[option.icon] : null;
        const isSelectedOption = selectedOptionId === option.id;

        return (
          <button
            key={option.id}
            onClick={() => onSelectOption(option.id)}
            className={cn(
              "glass-card group relative flex flex-col items-center justify-center gap-3 p-6 text-center",
              "cursor-pointer transition-all duration-300 hover:scale-[1.03]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
              isSelectedOption
                ? "border-brand-500/60 bg-brand-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                : "border-white/8 hover:border-white/20 hover:bg-white/[0.03]"
            )}
          >
            {/* Selection checkmark — appears when this option is chosen */}
            {isSelectedOption && (
              <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Icon — rendered from the config's string name */}
            {IconComponent && (
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300",
                  isSelectedOption
                    ? "bg-brand-500/20"
                    : "bg-white/5 group-hover:bg-white/10"
                )}
              >
                <IconComponent
                  className={cn(
                    "h-6 w-6 transition-colors duration-300",
                    isSelectedOption ? "text-brand-400" : "text-text-secondary group-hover:text-text-primary"
                  )}
                />
              </div>
            )}

            {/* Label and optional description */}
            <div>
              <p
                className={cn(
                  "font-semibold transition-colors duration-300",
                  isSelectedOption ? "text-text-primary" : "text-text-secondary"
                )}
              >
                {option.label}
              </p>
              {option.description && (
                <p className="mt-1 text-xs text-text-muted">{option.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * SliderStepRenderer — Renders a range slider with labeled preset positions.
 * Used for volume/quantity questions like "How many images per month?"
 *
 * WHY A SLIDER WITH PRESETS:
 * A pure slider is imprecise and anxiety-inducing ("did I pick the right number?").
 * Labeled presets (1-10, 10-50, etc.) give users concrete buckets to self-identify with.
 * The slider adds visual engagement while the presets reduce cognitive load.
 */
function SliderStepRenderer({
  step,
  selectedOptionId,
  onSelectOption,
}: {
  step: OnboardingStep;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
}) {
  /**
   * Map the selected option ID to a slider index (0-based).
   * If nothing is selected yet, default to index 0 (lowest volume).
   */
  const selectedSliderIndex = useMemo(() => {
    if (!selectedOptionId) return 0;
    const foundIndex = step.options.findIndex((opt) => opt.id === selectedOptionId);
    return foundIndex >= 0 ? foundIndex : 0;
  }, [selectedOptionId, step.options]);

  const handleSliderValueChange = useCallback(
    (newSliderValues: number[]) => {
      const newIndex = newSliderValues[0];
      if (newIndex !== undefined && step.options[newIndex]) {
        onSelectOption(step.options[newIndex].id);
      }
    },
    [onSelectOption, step.options]
  );

  return (
    <div className="max-w-md mx-auto space-y-8">
      {/* Current selection displayed prominently */}
      <div className="text-center">
        <span className="inline-block px-6 py-3 glass-card text-2xl font-bold text-text-primary">
          {step.options[selectedSliderIndex]?.label ?? step.options[0]?.label}
        </span>
        <p className="mt-2 text-sm text-text-muted">images per month</p>
      </div>

      {/* Slider track */}
      <div className="px-4">
        <Slider
          value={[selectedSliderIndex]}
          min={0}
          max={step.options.length - 1}
          step={1}
          onValueChange={handleSliderValueChange}
          className="w-full"
        />
      </div>

      {/* Preset labels below the slider */}
      <div className="flex justify-between px-2">
        {step.options.map((option, presetIndex) => (
          <button
            key={option.id}
            onClick={() => onSelectOption(option.id)}
            className={cn(
              "text-sm font-medium transition-colors duration-300 cursor-pointer",
              "focus:outline-none focus-visible:text-brand-400",
              presetIndex === selectedSliderIndex
                ? "text-brand-400"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * VisualSelectStepRenderer — Renders image-heavy selectable cards.
 * Used for style/aesthetic preference questions.
 *
 * WHY VISUAL SELECT:
 * Style preferences are inherently visual — asking users to pick from text labels
 * like "minimalist" vs "bold" forces them to imagine the result. Showing visual
 * cards with icons and descriptions makes the choice intuitive and faster.
 */
function VisualSelectStepRenderer({
  step,
  selectedOptionId,
  onSelectOption,
}: {
  step: OnboardingStep;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
      {step.options.map((option) => {
        const IconComponent = option.icon ? ICON_MAP[option.icon] : null;
        const isSelectedOption = selectedOptionId === option.id;

        return (
          <button
            key={option.id}
            onClick={() => onSelectOption(option.id)}
            className={cn(
              "glass-card group relative flex flex-col items-start gap-3 p-5 text-left",
              "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
              isSelectedOption
                ? "border-brand-500/60 bg-brand-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                : "border-white/8 hover:border-white/20 hover:bg-white/[0.03]"
            )}
          >
            {/* Selection indicator */}
            {isSelectedOption && (
              <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Optional image background placeholder (for future use with real images) */}
            {option.imageUrl && (
              <div
                className="w-full h-24 rounded-lg bg-cover bg-center mb-2"
                style={{ backgroundImage: `url(${option.imageUrl})` }}
              />
            )}

            {/* Icon + text content */}
            <div className="flex items-center gap-3">
              {IconComponent && (
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
                    isSelectedOption
                      ? "bg-brand-500/20"
                      : "bg-white/5 group-hover:bg-white/10"
                  )}
                >
                  <IconComponent
                    className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      isSelectedOption
                        ? "text-brand-400"
                        : "text-text-secondary group-hover:text-text-primary"
                    )}
                  />
                </div>
              )}
              <div>
                <p
                  className={cn(
                    "font-semibold text-sm transition-colors duration-300",
                    isSelectedOption ? "text-text-primary" : "text-text-secondary"
                  )}
                >
                  {option.label}
                </p>
                {option.description && (
                  <p className="text-xs text-text-muted mt-0.5">{option.description}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * LoadingScreen — Animated "building your plan" interstitial.
 * This is the most psychologically important screen in the flow.
 *
 * WHY A FAKE LOADING SCREEN:
 * The "labor illusion" — users value things more when they believe effort went into
 * creating them. A 2-3 second loading animation with progress indicators makes the
 * personalized results feel computed and valuable, rather than instant and generic.
 * This is the same pattern used by travel booking sites ("Searching 400+ airlines...")
 * and mortgage calculators ("Analyzing your financial profile...").
 */
function LoadingScreen({ productName }: { productName: string }) {
  const [loadingProgressPercent, setLoadingProgressPercent] = useState(0);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);

  /**
   * Loading messages that cycle through during the animation.
   * Each message reinforces the idea that work is being done on the user's behalf.
   */
  const loadingMessages = useMemo(
    () => [
      `Analyzing your preferences...`,
      `Finding the best options for you...`,
      `Building your personalized ${productName} plan...`,
    ],
    [productName]
  );

  useEffect(() => {
    /**
     * Progress bar animation — fills from 0% to 100% over ~2.5 seconds.
     * Uses 50ms intervals (20fps) which is smooth enough for a progress bar
     * without being wasteful on CPU.
     */
    const progressTimerRef = setInterval(() => {
      setLoadingProgressPercent((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(progressTimerRef);
          return 100;
        }
        /* Variable speed: start fast (excitement), slow in middle (suspense), fast at end (payoff) */
        const remainingProgress = 100 - prevProgress;
        const progressIncrement = Math.max(0.5, remainingProgress * 0.04);
        return Math.min(100, prevProgress + progressIncrement);
      });
    }, 50);

    /**
     * Message cycling — changes the status text every 800ms.
     * Three messages over ~2.5s = each shows for ~800ms, which is
     * long enough to read but short enough to feel dynamic.
     */
    const messageTimerRef = setInterval(() => {
      setCurrentLoadingMessage((prevMessageIndex) =>
        prevMessageIndex < loadingMessages.length - 1 ? prevMessageIndex + 1 : prevMessageIndex
      );
    }, 800);

    return () => {
      clearInterval(progressTimerRef);
      clearInterval(messageTimerRef);
    };
  }, [loadingMessages]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
      {/* Animated spinner */}
      <div className="relative mb-8">
        <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-brand-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-brand-400 animate-pulse" />
        </div>
      </div>

      {/* Status message with fade transition */}
      <p className="text-lg font-medium text-text-primary mb-4 transition-opacity duration-300">
        {loadingMessages[currentLoadingMessage]}
      </p>

      {/* Progress bar */}
      <div className="w-64 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-100 ease-out"
          style={{ width: `${loadingProgressPercent}%` }}
        />
      </div>

      <p className="mt-4 text-sm text-text-muted">
        {Math.round(loadingProgressPercent)}% complete
      </p>
    </div>
  );
}

/**
 * ResultsScreen — Personalized pricing recommendation based on questionnaire responses.
 * This is the conversion screen — where the user decides to sign up or bounce.
 *
 * DESIGN DECISIONS:
 * - "Recommended for you" badge on the plan that best matches their stated volume
 * - Feature lists with checkmarks (universal "included" signal)
 * - Clear price display with period ("/mo")
 * - Two CTAs per card: primary action + "learn more" link
 * - Summary of their responses above the plans to reinforce personalization
 */
function ResultsScreen({
  config,
  responses,
  onPlanSelect,
}: {
  config: OnboardingConfig;
  responses: OnboardingResponses;
  onPlanSelect?: (planId: string) => void;
}) {
  /**
   * Determine which plan to recommend based on the volume response.
   * This is a simple heuristic:
   *   - Low volume (1-10) → recommend free tier
   *   - Medium volume (10-50) → recommend basic/starter tier
   *   - High volume (50+) → recommend pro tier
   *
   * WHY SIMPLE HEURISTIC:
   * The recommendation doesn't need to be precise — its purpose is to make the user
   * feel like the suggestion was computed for them. The anchoring effect means they'll
   * evaluate all plans relative to the "recommended" one, which is our target conversion tier.
   */
  const recommendedPlanId = useMemo(() => {
    const volumeResponse = responses["volume"];
    if (!volumeResponse) {
      /* Default: recommend the plan marked as recommended in config */
      return config.plans.find((plan) => plan.recommended)?.id ?? config.plans[1]?.id;
    }

    if (volumeResponse === "1-10") return config.plans[0]?.id;
    if (volumeResponse === "100+") return config.plans[config.plans.length - 1]?.id;
    /* Medium volume → middle tier (our target conversion tier) */
    return config.plans.length > 1 ? config.plans[1]?.id : config.plans[0]?.id;
  }, [responses, config.plans]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          Your Custom Plan
        </h2>
        <p className="text-text-secondary">
          Based on your preferences, here&apos;s what we recommend
        </p>
      </div>

      {/* Response summary — reinforces personalization */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {Object.entries(responses).map(([stepId, selectedOptionId]) => {
          const matchingStep = config.steps.find((s) => s.id === stepId);
          const matchingOption = matchingStep?.options.find((o) => o.id === selectedOptionId);
          if (!matchingOption) return null;

          return (
            <span
              key={stepId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-sm text-brand-300"
            >
              <Check className="h-3 w-3" />
              {matchingOption.label}
            </span>
          );
        })}
      </div>

      {/* Plan cards — responsive grid, 1 col mobile / 3 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {config.plans.map((plan) => {
          const isPlanRecommended = plan.id === recommendedPlanId;

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl p-[1px] transition-all duration-300 hover:scale-[1.02]",
                isPlanRecommended
                  ? "bg-gradient-to-b from-brand-400 via-brand-600 to-purple-600"
                  : "bg-white/10"
              )}
            >
              {/* "Recommended" badge */}
              {isPlanRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-500 to-purple-500 rounded-full text-xs font-semibold text-white whitespace-nowrap z-10">
                  Recommended for you
                </div>
              )}

              <div className="glass-card p-6 h-full flex flex-col">
                {/* Plan name */}
                <h3 className="text-lg font-semibold text-text-secondary mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-5">
                  {plan.priceMonthly === 0 ? (
                    <span className="text-3xl font-bold text-text-primary">Free</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-text-primary">
                        ${plan.priceMonthly.toFixed(2)}
                      </span>
                      <span className="text-text-muted">/mo</span>
                    </div>
                  )}
                  <p className="text-sm text-text-muted mt-1">
                    {plan.creditsPerMonth === -1
                      ? "Unlimited"
                      : `${plan.creditsPerMonth} credits/month`}
                  </p>
                </div>

                {/* Feature list */}
                <ul className="space-y-2.5 mb-6 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2.5">
                      <Check
                        className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          isPlanRecommended ? "text-brand-400" : "text-green-400"
                        )}
                      />
                      <span className="text-sm text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                {onPlanSelect ? (
                  <button
                    onClick={() => onPlanSelect(plan.id)}
                    className={cn(
                      "w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200",
                      "hover:scale-[1.02] active:scale-95 cursor-pointer",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                      isPlanRecommended
                        ? "bg-gradient-to-r from-brand-500 to-purple-500 text-white hover:from-brand-400 hover:to-purple-400"
                        : "bg-white/10 text-text-primary hover:bg-white/15 border border-white/10"
                    )}
                  >
                    {plan.ctaText}
                  </button>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className={cn(
                      "block w-full py-3 px-6 rounded-xl font-semibold text-center transition-all duration-200",
                      "hover:scale-[1.02] active:scale-95",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                      isPlanRecommended
                        ? "bg-gradient-to-r from-brand-500 to-purple-500 text-white hover:from-brand-400 hover:to-purple-400"
                        : "bg-white/10 text-text-primary hover:bg-white/15 border border-white/10"
                    )}
                  >
                    {plan.ctaText}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * MAIN COMPONENT — ORCHESTRATOR
 * Manages state machine: question steps → loading → results
 * ============================================================ */

/**
 * OnboardingQuestionnaire — The main exported component.
 *
 * Orchestrates the multi-step survey flow, manages transitions between screens,
 * persists responses to localStorage, and captures UTM parameters for analytics.
 *
 * @param config - Product-specific onboarding configuration (questions, options, plans)
 * @param onComplete - Optional callback when a plan CTA is clicked
 * @param className - Optional wrapper CSS class
 *
 * @example
 * ```tsx
 * import { OnboardingQuestionnaire } from "@/components/OnboardingQuestionnaire";
 * import { ONBOARDING_CONFIG } from "@/config/onboarding";
 *
 * export default function OnboardingPage() {
 *   return (
 *     <OnboardingQuestionnaire
 *       config={ONBOARDING_CONFIG}
 *       onComplete={(responses) => {
 *         console.log("User completed onboarding:", responses);
 *         router.push("/login");
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function OnboardingQuestionnaire({
  config,
  onComplete,
  className,
}: OnboardingQuestionnaireProps) {
  /**
   * State machine phases:
   * - "questions": User is answering questionnaire steps (0..N-1)
   * - "loading": Fake loading animation playing (2.5 seconds)
   * - "results": Personalized plan recommendation displayed
   */
  const [currentPhase, setCurrentPhase] = useState<"questions" | "loading" | "results">("questions");

  /** Index into config.steps — which question is currently displayed */
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  /** Map of step ID → selected option ID */
  const [questionnaireResponses, setQuestionnaireResponses] = useState<OnboardingResponses>({});

  /**
   * Controls the fade-in/out animation for screen transitions.
   * When false, the screen content fades out; when true, it fades in.
   * The transition takes 300ms (matching the CSS transition duration).
   */
  const [isScreenVisible, setIsScreenVisible] = useState(true);

  /* Capture UTM parameters on first mount */
  useEffect(() => {
    captureUtmParameters();

    /* Restore any previously saved responses (e.g., user refreshed mid-flow) */
    const savedResponses = getOnboardingResponses();
    if (Object.keys(savedResponses).length > 0) {
      setQuestionnaireResponses(savedResponses);
    }
  }, []);

  /** The current step config object (null during loading/results phases) */
  const currentStepConfig = config.steps[currentStepIndex] ?? null;

  /** Whether the user has selected an option for the current step */
  const hasCurrentStepSelection = currentStepConfig
    ? questionnaireResponses[currentStepConfig.id] !== undefined
    : false;

  /**
   * Transition to a new screen with a fade animation.
   * Fades out current content, runs the state change callback, then fades in.
   */
  const transitionToScreen = useCallback((stateChangeCallback: () => void) => {
    setIsScreenVisible(false);
    setTimeout(() => {
      stateChangeCallback();
      setIsScreenVisible(true);
    }, 300);
  }, []);

  /**
   * Handle option selection for the current step.
   * Saves to local state AND localStorage simultaneously.
   */
  const handleOptionSelected = useCallback(
    (optionId: string) => {
      if (!currentStepConfig) return;

      const updatedResponses = { ...questionnaireResponses, [currentStepConfig.id]: optionId };
      setQuestionnaireResponses(updatedResponses);
      saveOnboardingResponse(currentStepConfig.id, optionId);
    },
    [currentStepConfig, questionnaireResponses]
  );

  /**
   * Advance to the next step, or transition to loading/results if on the last step.
   * Auto-advances after a short delay on grid and visual-select steps to reduce clicks.
   */
  const handleAdvanceToNextStep = useCallback(() => {
    const isLastQuestionStep = currentStepIndex >= config.steps.length - 1;

    if (isLastQuestionStep) {
      /* Last question → show loading screen → then results */
      transitionToScreen(() => setCurrentPhase("loading"));

      /**
       * Loading screen duration — 2500ms (2.5 seconds).
       * Research sweet spot: long enough to feel like "work is being done" but
       * short enough to not test patience. Under 2s feels fake, over 4s feels broken.
       */
      setTimeout(() => {
        transitionToScreen(() => {
          setCurrentPhase("results");
          markOnboardingComplete();
        });
      }, 2500);
    } else {
      transitionToScreen(() => setCurrentStepIndex((prev) => prev + 1));
    }
  }, [currentStepIndex, config.steps.length, transitionToScreen]);

  /**
   * Go back to the previous step.
   * Only available during the "questions" phase and when not on the first step.
   */
  const handleGoToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      transitionToScreen(() => setCurrentStepIndex((prev) => prev - 1));
    }
  }, [currentStepIndex, transitionToScreen]);

  /**
   * Handle plan CTA click on the results screen.
   * If onComplete is provided, call it with the full responses.
   * Otherwise, the Link component handles navigation via ctaHref.
   */
  const handlePlanSelected = useCallback(
    (planId: string) => {
      if (onComplete) {
        onComplete(questionnaireResponses);
      }
    },
    [onComplete, questionnaireResponses]
  );

  /**
   * Auto-advance after option selection on grid and visual-select steps.
   * Uses a 600ms delay so the user can see their selection highlighted
   * before the screen transitions. Slider steps require manual "Next" click
   * because the user might want to adjust the slider.
   */
  const handleOptionSelectedWithAutoAdvance = useCallback(
    (optionId: string) => {
      handleOptionSelected(optionId);

      if (currentStepConfig?.type === "grid" || currentStepConfig?.type === "visual-select") {
        setTimeout(() => {
          handleAdvanceToNextStep();
        }, 600);
      }
    },
    [handleOptionSelected, currentStepConfig?.type, handleAdvanceToNextStep]
  );

  /* ============================================================
   * RENDER
   * ============================================================ */

  return (
    <div
      className={cn(
        "relative min-h-[600px] flex flex-col items-center justify-center px-4 py-12 sm:py-16",
        className
      )}
    >
      {/* Decorative background gradient orbs — matches LandingHero aesthetic */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Content wrapper with fade transition */}
      <div
        className={cn(
          "relative z-10 w-full max-w-3xl mx-auto transition-all duration-300 ease-in-out",
          isScreenVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        {/* QUESTION STEPS */}
        {currentPhase === "questions" && currentStepConfig && (
          <>
            {/* Progress dots */}
            <ProgressIndicator
              totalSteps={config.steps.length}
              currentStepIndex={currentStepIndex}
            />

            {/* Step header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                {currentStepConfig.title}
              </h2>
              {currentStepConfig.subtitle && (
                <p className="text-text-secondary">{currentStepConfig.subtitle}</p>
              )}
            </div>

            {/* Step-specific renderer */}
            {currentStepConfig.type === "grid" && (
              <GridStepRenderer
                step={currentStepConfig}
                selectedOptionId={questionnaireResponses[currentStepConfig.id] ?? null}
                onSelectOption={handleOptionSelectedWithAutoAdvance}
              />
            )}
            {currentStepConfig.type === "slider" && (
              <SliderStepRenderer
                step={currentStepConfig}
                selectedOptionId={questionnaireResponses[currentStepConfig.id] ?? null}
                onSelectOption={handleOptionSelected}
              />
            )}
            {currentStepConfig.type === "visual-select" && (
              <VisualSelectStepRenderer
                step={currentStepConfig}
                selectedOptionId={questionnaireResponses[currentStepConfig.id] ?? null}
                onSelectOption={handleOptionSelectedWithAutoAdvance}
              />
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-10 max-w-lg mx-auto">
              {/* Back button — hidden on first step */}
              {currentStepIndex > 0 ? (
                <Button
                  variant="ghost"
                  onClick={handleGoToPreviousStep}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <div /> /* Spacer to keep "Next" right-aligned */
              )}

              {/* Next button — shown for slider steps (grid/visual auto-advance) */}
              {currentStepConfig.type === "slider" && (
                <Button
                  onClick={handleAdvanceToNextStep}
                  className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white"
                >
                  {currentStepIndex === config.steps.length - 1 ? "See My Plan" : "Next"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </>
        )}

        {/* LOADING SCREEN */}
        {currentPhase === "loading" && (
          <LoadingScreen productName={config.productName} />
        )}

        {/* RESULTS SCREEN */}
        {currentPhase === "results" && (
          <ResultsScreen
            config={config}
            responses={questionnaireResponses}
            onPlanSelect={onComplete ? handlePlanSelected : undefined}
          />
        )}
      </div>
    </div>
  );
}
