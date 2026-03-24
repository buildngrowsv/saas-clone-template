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

import { PRODUCT_CONFIG } from "@/lib/config";

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
            <a
              href="/terms"
              className="hover:text-text-secondary transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/privacy"
              className="hover:text-text-secondary transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="mailto:support@example.com"
              className="hover:text-text-secondary transition-colors"
            >
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-text-muted">
            &copy; {currentYear} {PRODUCT_CONFIG.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
