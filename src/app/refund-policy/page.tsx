import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Refund Policy | ${PRODUCT_CONFIG.name}`,
  description: `Refund policy for ${PRODUCT_CONFIG.name}.`,
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
            This page explains the default refund position for subscriptions and
            one-time purchases offered through {PRODUCT_CONFIG.name}.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-300">
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Last updated March 27, 2026
            </p>
            <h2 className="text-xl font-medium text-white">1. Subscription refunds</h2>
            <p>
              First-time subscription purchases may be reviewed for refund within
              7 days of the initial charge when the account has not materially
              consumed the paid service. Renewals are generally non-refundable
              once the new billing period has started.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">2. Credit packs and usage-based purchases</h2>
            <p>
              One-time credit or usage purchases are generally non-refundable once
              any of the purchased credits or generation capacity has been used.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">3. Exception handling</h2>
            <p>
              We may issue refunds or service credits for duplicate charges,
              billing errors, or product-side failures at our discretion.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">4. Contact</h2>
            {siteConfig.supportEmail ? (
              <p>
                Refund questions can be sent to{" "}
                <a className="text-cyan-300 hover:text-cyan-200" href={`mailto:${siteConfig.supportEmail}`}>
                  {siteConfig.supportEmail}
                </a>
                .
              </p>
            ) : (
              <p>
                Configure <code className="text-white">NEXT_PUBLIC_SUPPORT_EMAIL</code> before
                publishing this template so the live legal pages expose the correct support contact.
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
