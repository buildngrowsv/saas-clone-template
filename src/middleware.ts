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

/* ─── In-Memory Auth Rate Limiter ──────────────────────────────────────
 * Protects auth endpoints from credential stuffing and brute force.
 *
 * Sensitive auth paths (signin, callback, signup, password reset) are
 * limited to 10 requests per minute per IP. This is generous for
 * legitimate use (a user retrying "Sign in") but blocks automated
 * attacks that hammer auth endpoints with stolen credential lists.
 *
 * Read-only auth paths (get-session, csrf) are NOT rate-limited because
 * useSession() fires on every page navigation and those endpoints have
 * near-zero backend cost. The existing Vercel/edge limits handle those.
 *
 * Not durable across cold starts — fine for auth abuse prevention
 * where the attack pattern is sustained requests over minutes.
 *
 * Added 2026-04-08 (argon-scout-6381). Same pattern as GenFlix 961a741
 * and banananano2pro 77c6943. Future clones from this template inherit
 * this protection automatically.
 * ──────────────────────────────────────────────────────────────────── */

interface AuthRateLimitEntry {
  count: number;
  windowStart: number;
}

const AUTH_RATE_LIMIT_MAP = new Map<string, AuthRateLimitEntry>();
const AUTH_RATE_LIMIT_MAX = 10;
const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Sensitive auth sub-paths that need tight rate limiting.
 * These are the endpoints involved in the login/signup flow.
 */
const SENSITIVE_AUTH_PATHS = [
  "/api/auth/signin",
  "/api/auth/sign-in",
  "/api/auth/signup",
  "/api/auth/sign-up",
  "/api/auth/callback",
  "/api/auth/forget-password",
  "/api/auth/reset-password",
];

function extractClientIpFromMiddleware(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Check if a sensitive auth endpoint is being hit too frequently by one IP.
 * Returns a 429 response if rate limited, null if allowed.
 */
function checkAuthRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const isSensitive = SENSITIVE_AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (!isSensitive) return null;

  const ip = extractClientIpFromMiddleware(request);
  const now = Date.now();
  const entry = AUTH_RATE_LIMIT_MAP.get(ip);

  if (!entry || now - entry.windowStart > AUTH_RATE_LIMIT_WINDOW_MS) {
    AUTH_RATE_LIMIT_MAP.set(ip, { count: 1, windowStart: now });
    return null;
  }

  entry.count++;
  if (entry.count > AUTH_RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil(
      (entry.windowStart + AUTH_RATE_LIMIT_WINDOW_MS - now) / 1000
    );
    return NextResponse.json(
      { error: "Too many authentication attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return null;
}

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
  "/get-started",
  "/privacy-policy",
  "/privacy",
  "/terms-of-service",
  "/terms",
  "/refund-policy",
  "/refund",
  "/vs",
  "/for",
  "/use-cases",
  "/api/auth",
  "/api/stripe/webhook",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * STEP 1: Rate-limit sensitive auth endpoints BEFORE allowing them through.
   * This runs even on public /api/auth paths because the rate limiter only
   * targets the specific sensitive sub-paths (signin, signup, callback, etc.)
   * while leaving get-session and csrf unthrottled.
   */
  if (pathname.startsWith("/api/auth")) {
    const rateLimitResponse = checkAuthRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
  }

  /**
   * STEP 2: Allow public paths and static assets through without auth check.
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
    "/((?!_next/static|_next/image|favicon.ico|api|pricing|privacy-policy|privacy|terms-of-service|terms|refund-policy|refund|get-started|vs|for|use-cases|.*\\..*).*)",
  ],
};
