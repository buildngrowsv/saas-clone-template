import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";

/**
 * Refund Policy page — standard SaaS digital-goods refund terms.
 *
 * WHY THIS EXISTS:
 * Every revenue SaaS needs a published refund policy to reduce chargeback risk,
 * satisfy payment processor requirements (Stripe, Paddle), and set clear
 * expectations with customers. This template ships a reasonable default that
 * clone SKUs inherit automatically.
 *
 * POLICY SUMMARY:
 * - Digital goods: no refunds after 7 days from purchase
 * - Within 7 days: contact support for review
 * - Chargebacks / payment disputes result in immediate account termination
 * - Free tier users can cancel anytime with no charge
 *
 * CUSTOMIZATION:
 * - supportEmail is pulled from siteConfig (set NEXT_PUBLIC_SUPPORT_EMAIL)
 * - Product name is pulled from PRODUCT_CONFIG
 * - Clones inherit this page; override in clone repo if terms differ
 *
 * IMPORTED BY: Next.js file-based routing at /refund-policy
 * RELATED: /terms-of-service, /privacy, /privacy-policy
 */

export const metadata: Metadata = {
  title: `Refund Policy | ${PRODUCT_CONFIG.name}`,
  description: `Refund and cancellation policy for ${PRODUCT_CONFIG.name}. Digital goods, 7-day refund window, chargeback policy.`,
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 space-y-4">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">
            Refund Policy
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {PRODUCT_CONFIG.name} refund policy
          </h1>
          <p className="max-w-2xl text-base text-slate-300">
            This page explains our refund, cancellation, and chargeback policies
            for all paid plans and one-time purchases offered through{" "}
            {PRODUCT_CONFIG.name}.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-300">
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Last updated April 13, 2026
            </p>
            <h2 className="text-xl font-medium text-white">
              1. Digital goods — no refunds after 7 days
            </h2>
            <p>
              {PRODUCT_CONFIG.name} provides digital goods and services. All
              purchases — including subscriptions, credit packs, and one-time
              payments — are eligible for a refund only within{" "}
              <strong className="text-white">7 calendar days</strong> of the
              original purchase date. After 7 days, all sales are final and
              non-refundable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">
              2. Requesting a refund (within 7 days)
            </h2>
            <p>
              If you are unsatisfied with your purchase and it has been fewer
              than 7 days since the charge, you may request a refund by
              contacting our support team at{" "}
              {siteConfig.supportEmail ? (
                <a
                  className="text-cyan-300 hover:text-cyan-200"
                  href={`mailto:${siteConfig.supportEmail}`}
                >
                  {siteConfig.supportEmail}
                </a>
              ) : (
                <span className="text-white">support@symplyai.io</span>
              )}
              . Please include your account email and the reason for your
              request. Refund requests are reviewed within 3 business days.
            </p>
            <p>
              Refunds are issued to the original payment method. Processing
              times depend on your bank or card issuer and typically take 5 to
              10 business days after approval.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">
              3. Subscription renewals
            </h2>
            <p>
              Recurring subscription charges renew automatically at the start of
              each billing period. Renewal charges are non-refundable once the
              new billing period has begun. You may cancel your subscription at
              any time to prevent future renewals — cancellation takes effect at
              the end of the current billing period.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">
              4. Chargebacks and payment disputes
            </h2>
            <p>
              Filing a chargeback or payment dispute with your bank or card
              issuer — instead of contacting us directly — will result in{" "}
              <strong className="text-white">
                immediate and permanent termination
              </strong>{" "}
              of your account, including loss of access to all purchased credits,
              generated content, and account data. We encourage you to reach out
              to our support team first so we can resolve any billing issue
              directly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">
              5. Free tier and cancellation
            </h2>
            <p>
              Free tier users are never charged and may cancel or delete their
              account at any time with no financial obligation. If you are on a
              free plan, there is nothing to refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">
              6. Exceptions
            </h2>
            <p>
              We may, at our sole discretion, issue refunds or service credits
              outside the 7-day window for duplicate charges, verified billing
              errors, or significant product-side failures that prevented use of
              the paid service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">7. Contact</h2>
            {siteConfig.supportEmail ? (
              <p>
                Refund and billing questions can be sent to{" "}
                <a
                  className="text-cyan-300 hover:text-cyan-200"
                  href={`mailto:${siteConfig.supportEmail}`}
                >
                  {siteConfig.supportEmail}
                </a>
                .
              </p>
            ) : (
              <p>
                For refund and billing questions, contact{" "}
                <a
                  className="text-cyan-300 hover:text-cyan-200"
                  href="mailto:support@symplyai.io"
                >
                  support@symplyai.io
                </a>
                . Clone operators: set{" "}
                <code className="text-white">NEXT_PUBLIC_SUPPORT_EMAIL</code>{" "}
                before publishing so this page shows your own support address.
              </p>
            )}
          </section>
        </div>

        <div className="mt-12">
          <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
