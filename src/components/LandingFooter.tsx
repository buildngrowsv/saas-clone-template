/**
 * LandingFooter — Minimal footer with legal links and branding.
 * 
 * WHY A FOOTER:
 * Every SaaS needs legal pages (Terms of Service, Privacy Policy) for:
 *   1. App Store / payment processor compliance (Stripe requires ToS + Privacy)
 *   2. User trust — missing legal pages look sketchy
 *   3. GDPR / CCPA compliance
 * 
 * The footer also serves as a secondary navigation point for users who
 * scroll all the way down (high-intent users evaluating the product).
 * 
 * TEMPLATE NOTE:
 * The /terms and /privacy pages are placeholders. Each clone should create
 * actual legal pages (or use a generator like Termly/Iubenda).
 */
import Link from "next/link";
import { PRODUCT_CONFIG } from "@/lib/config";
import { siteConfig } from "@/config/site";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold gradient-text">
              {PRODUCT_CONFIG.name}
            </span>
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <Link
              href="/terms-of-service"
              className="hover:text-text-secondary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy-policy"
              className="hover:text-text-secondary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/refund-policy"
              className="hover:text-text-secondary transition-colors"
            >
              Refund Policy
            </Link>
            {siteConfig.supportEmail && (
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className="hover:text-text-secondary transition-colors"
              >
                Contact
              </a>
            )}
          </div>

          {/* Copyright + Powered by */}
          <p className="text-sm text-text-muted">
            &copy; {currentYear} {PRODUCT_CONFIG.name}. All rights reserved.
            {" · "}
            <a
              href="https://symplyai.io/tools/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-secondary transition-colors"
            >
              Powered by Symply AI
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
