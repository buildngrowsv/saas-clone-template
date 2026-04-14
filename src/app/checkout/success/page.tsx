/**
 * Checkout Success Page — /checkout/success
 *
 * WHY THIS PAGE EXISTS:
 * After completing Stripe checkout, users are redirected here. This is a
 * critical conversion moment — the user just paid money and needs:
 * 1. Confirmation their payment worked (reduces refund/chargeback anxiety)
 * 2. Clear next step to start using the product (drives activation)
 * 3. GA4 purchase event firing (tracks revenue attribution)
 *
 * Without this page, users land on a dashboard with no acknowledgment of
 * their purchase, which feels broken and increases support tickets.
 *
 * STRIPE FLOW:
 * checkout/route.ts sets success_url → /checkout/success?session_id={CHECKOUT_SESSION_ID}
 * The session_id can be used server-side to verify the purchase if needed.
 *
 * IMPORTED BY: Stripe checkout success_url redirect only.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Successful",
  description: "Your payment was successful. Start using your Pro features now.",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-primary px-4 text-text-primary">
      <div className="mx-auto max-w-lg text-center">
        {/* Success icon with subtle animation */}
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
        </div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Payment Successful!
        </h1>

        <p className="mb-2 text-lg text-text-secondary">
          Your Pro plan is now active. You have full access to all features.
        </p>

        <p className="mb-8 text-sm text-text-muted">
          A confirmation email will arrive shortly. Your credits have been added
          to your account automatically.
        </p>

        {/* Primary CTA — drive activation */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-500 hover:to-brand-400"
          >
            <Sparkles className="h-4 w-4" />
            Start Creating
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 font-medium text-text-secondary transition hover:border-brand-500/30 hover:text-text-primary"
          >
            View Your Plan
          </Link>
        </div>

        {/* Trust reinforcement */}
        <div className="mt-10 rounded-xl border border-white/5 bg-surface-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-text-secondary">
            What happens next?
          </h2>
          <ul className="space-y-1.5 text-left text-sm text-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              <span>Your Pro credits are already in your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              <span>All rate limits have been removed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              <span>Credits refresh automatically each billing cycle</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-400">✓</span>
              <span>Cancel anytime from your account settings</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
