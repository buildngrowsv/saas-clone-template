/**
 * Custom 404 page — shown when a user navigates to a non-existent route.
 *
 * WHY THIS PAGE EXISTS:
 * Without a custom not-found page, Next.js shows its default 404 which looks
 * unprofessional and provides no navigation back to the product. This page:
 * 1. Keeps the user on-brand with our dark theme and styling
 * 2. Provides clear navigation back to useful pages (home, pricing)
 * 3. Prevents bounce — users who hit a 404 are more likely to stay if they
 *    see a branded page with a clear path forward
 *
 * SEO NOTE:
 * Next.js automatically returns a 404 status code for this page, so search
 * engines correctly treat it as "not found" and don't index it.
 */

import Link from "next/link";
import { PRODUCT_CONFIG } from "@/lib/config";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="mb-2 text-7xl font-bold tracking-tight text-foreground">
        404
      </h1>
      <h2 className="mb-4 text-2xl font-semibold text-muted-foreground">
        Page not found
      </h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to {PRODUCT_CONFIG.name}
        </Link>
        <Link
          href="/pricing"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          View Pricing
        </Link>
      </div>
    </div>
  );
}
