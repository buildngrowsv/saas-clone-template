import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${PRODUCT_CONFIG.name}`,
  description: `Privacy policy for ${PRODUCT_CONFIG.name}.`,
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 space-y-4">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">
            Privacy Policy
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {PRODUCT_CONFIG.name} privacy policy
          </h1>
          <p className="max-w-2xl text-base text-slate-300">
            This policy explains what account, billing, and usage information we
            process to operate {PRODUCT_CONFIG.name}.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-300">
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Last updated March 27, 2026
            </p>
            <h2 className="text-xl font-medium text-white">1. Information we collect</h2>
            <p>
              We may collect the information you provide directly, such as your
              email address, account details, uploaded inputs, billing records,
              and support messages. We also process technical data needed to run
              the service, including session, request, and usage metadata.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">2. How we use information</h2>
            <p>
              We use this information to authenticate users, provide the product,
              process billing, prevent abuse, respond to support requests, and
              improve reliability and security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">3. Service providers</h2>
            <p>
              We may use third-party providers for hosting, authentication,
              payments, storage, analytics, and AI inference in order to operate
              the service. These providers only receive the data needed to perform
              their role.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">4. Retention and security</h2>
            <p>
              We retain information for as long as reasonably necessary to operate
              the product, comply with legal obligations, resolve disputes, and
              protect the service from fraud or abuse. We use reasonable
              technical and administrative safeguards to protect account and
              payment-related data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-medium text-white">5. Contact</h2>
            {siteConfig.supportEmail ? (
              <p>
                Questions about this policy can be sent to{" "}
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
