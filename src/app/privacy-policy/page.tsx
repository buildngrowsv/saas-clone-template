/**
 * /privacy-policy redirect page.
 *
 * Canonical privacy policy lives at /privacy. This page redirects there
 * so that any existing links or bookmarks to /privacy-policy continue to work.
 *
 * Why: The clone fleet standardized on /privacy as the canonical path
 * (matching cookie consent banner links and sitemap entries). This redirect
 * keeps both URLs functional for SEO stability.
 */
import { redirect } from "next/navigation";

export default function PrivacyPolicyRedirect() {
  redirect("/privacy");
}
