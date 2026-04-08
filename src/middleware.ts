/**
 * Next.js middleware — route protection for authenticated pages.
 *
 * HOW IT WORKS:
 * This middleware runs on every request (except static files). It checks if the
 * requested route requires authentication. If it does and the user doesn't have
 * a valid session cookie, they're redirected to the login page.
 *
 * WHY MIDDLEWARE (NOT SERVER COMPONENTS):
 * Middleware runs at the edge before the page even starts rendering. This means:
 * 1. Unauthorized users never see a flash of the protected page
 * 2. The redirect happens instantly (no SSR latency)
 * 3. We don't waste server resources rendering a page the user can't access
 *
 * SESSION CHECK STRATEGY:
 * We check for the Better Auth session cookie existence as a fast gate.
 * This is a LIGHTWEIGHT check — the cookie's mere presence doesn't guarantee
 * the session is still valid (it could be expired). The REAL auth validation
 * happens server-side in API routes via auth.api.getSession().
 *
 * This two-layer approach is intentional:
 * - Middleware: fast cookie check → redirect if no cookie (catches 99% of unauth requests)
 * - API routes: full session validation → return 401 if session is expired/invalid
 *
 * CUSTOMIZATION:
 * Add your public routes to the PUBLIC_PATHS array. Any route not matching
 * a public path requires a session cookie to access.
 *
 * REDIRECT BEHAVIOR:
 * When redirecting to login, the original path is passed as a ?redirect query param.
 * The login page reads this and redirects back after successful auth, so the user
 * lands on the page they originally wanted.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes that don't require authentication.
 * Includes the landing page, pricing, legal pages, and API endpoints
 * that need to be publicly accessible (auth callbacks, Stripe webhooks).
 *
 * IMPORTANT: The /api/auth path must be public — it handles OAuth callbacks
 * that happen before the user has a session. The /api/stripe/webhook path
 * must be public because Stripe sends events directly (no user session).
 */
const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/about",
  "/privacy-policy",
  "/privacy",
  "/terms-of-service",
  "/terms",
  "/refund-policy",
  "/refund",
  "/vs",
  "/api/auth",
  "/api/stripe/webhook",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * Allow public paths and static assets through without auth check.
   * Static assets include: /_next (Next.js internals), /icons, and any
   * file with an extension (images, fonts, etc.).
   */
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  /**
   * Check for Better Auth session cookie.
   *
   * Better Auth uses "better-auth.session_token" by default.
   * On HTTPS (production), the cookie is prefixed with "__Secure-" by the browser.
   * We check both variants to handle both development (HTTP) and production (HTTPS).
   */
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    /**
     * No session cookie → redirect to login with the original path.
     * The login page reads ?redirect and sends the user back after auth.
     */
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /**
     * Match all routes except static files and _next internals.
     * This ensures the middleware runs on page navigations and API calls.
     * The negative lookahead excludes Next.js internal routes and favicon.
     */
    /**
     * UPDATED 2026-04-08 (steel-circuit-4738): Added privacy, terms, refund-policy,
     * and vs to the negative lookahead. When clones adopt next-intl for i18n, the
     * middleware matcher controls which paths get locale-rewritten. Legal pages
     * at /privacy, /terms, /refund-policy exist OUTSIDE the [locale] directory
     * structure and must be excluded, otherwise next-intl rewrites them to
     * /en/privacy which doesn't exist → 404. The /vs comparison pages have the
     * same pattern.
     *
     * Both path variants are included (/privacy + /privacy-policy, /terms +
     * /terms-of-service) because the fleet uses both naming conventions.
     */
    "/((?!_next/static|_next/image|favicon.ico|api|privacy-policy|privacy|terms-of-service|terms|refund-policy|refund|vs|.*\\..*).*)",
  ],
};
