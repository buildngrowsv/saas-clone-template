/**
 * AI Generation API Route — POST /api/generate
 * 
 * WHY THIS ROUTE IS THE CORE OF THE PRODUCT:
 * This is the route that actually does the AI processing — the thing users
 * are paying for. Everything else (auth, payments, landing page) exists to
 * funnel users to this endpoint. It:
 *   1. Verifies the user is authenticated
 *   2. Checks they have credits remaining
 *   3. Calls fal.ai with the configured model
 *   4. Returns the result URL
 *   5. Deducts one credit
 * 
 * CUSTOMIZATION PER CLONE:
 * This is the second file to customize (after config.ts) when creating a new clone.
 * Each AI model has different input parameters:
 *   - Background remover: just needs an image URL
 *   - Image upscaler: needs image URL + scale factor
 *   - QR art generator: needs QR content + style prompt
 * 
 * The fal.ai call section (Step 3) should be customized per model.
 * The auth, credit, and response handling stays the same.
 * 
 * ARCHITECTURE:
 * We use fal.ai's serverless inference API. The flow is:
 *   1. Upload the image to fal.ai's storage (they provide upload URLs)
 *   2. Call the model with the storage URL
 *   3. fal.ai runs inference on their GPUs
 *   4. They return the result URL (hosted on their CDN)
 *   5. We return that URL to our frontend
 * 
 * WHY fal.ai and not self-hosted models:
 * Self-hosting would require provisioning GPU servers ($2-8k/month),
 * managing model deployments, handling scaling, etc. fal.ai handles all
 * of that and charges per inference (~$0.01-0.05 per call). At our price
 * points ($4.99-9.99/month), the margin is excellent as long as users
 * don't exceed ~100-200 calls/month on average.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { PRODUCT_CONFIG } from "@/lib/config";
import {
  checkUserCreditAvailability,
  deductOneCreditForUser,
  getUserSubscriptionTierFromDb,
  type SubscriptionTier,
} from "@/lib/credits";
import { createFalClient } from "@fal-ai/client";

// =============================================================================
// SERVER-SIDE IP RATE LIMITING (Clone Factory Quality Gate 7)
// =============================================================================
/**
 * IP-based rate limiter: module-level Map that persists across requests within
 * the same warm Vercel serverless instance. Cold starts reset the Map, but
 * that is acceptable — an attacker forcing cold starts can only bypass the
 * limit at a rate of FREE_GENERATIONS_PER_IP_PER_DAY per cold start, which
 * still limits throughput and spend significantly vs zero protection.
 *
 * WHY THIS EXISTS EVEN THOUGH THE TEMPLATE HAS AUTH+CREDITS:
 * Two reasons:
 *   1. Lightweight clones derived from this template often strip auth to ship
 *      faster. Those clones inherit this IP gate as their server-side backstop.
 *      Without it, any clone that removes auth has ZERO server-side protection
 *      and will drain FAL_KEY credits freely.
 *   2. Defense in depth: a logged-in user creating throwaway accounts can
 *      drain credits faster than the credit system alone catches. IP limiting
 *      adds friction to that path.
 *
 * This satisfies clone-factory-quality-gates.md Gate 7: "documented backend
 * rate limit that matches the business model" — required before any hosted
 * paid vendor call.
 *
 * PRODUCTION SCALING NOTE: For multi-instance or high-traffic deployments,
 * replace this Map with Vercel KV or Upstash Redis to share state across
 * instances. The in-memory Map is sufficient for launch traffic (single warm
 * instance handles most early-stage products).
 */
const ipRateLimitMap = new Map<string, { count: number; windowStartMs: number }>();

/**
 * How many free AI generations to allow per unique IP per 24-hour window.
 * This number should match the free-tier UX messaging shown to users so the
 * server-side gate and the client-side display stay consistent.
 *
 * CUSTOMIZE PER CLONE: Some products may warrant more (e.g., a simple
 * text tool: 10/day) or fewer (e.g., expensive video gen: 1/day).
 */
const FREE_GENERATIONS_PER_IP_PER_DAY = 3;

/**
 * 24-hour rolling rate limit window in milliseconds.
 * After this duration elapses, the IP's counter resets and they receive
 * another FREE_GENERATIONS_PER_IP_PER_DAY free generations.
 */
const IP_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Extract the real client IP from a Next.js request.
 *
 * Header priority order (most to least trustworthy on Vercel):
 *   1. x-real-ip — set by Vercel's edge network; cannot be spoofed by clients
 *   2. x-forwarded-for — comma-separated chain; take the leftmost (original client)
 *   3. "unknown" — fallback for unit tests or local development
 *
 * We prefer x-real-ip because Vercel's edge sets it reliably and it is not
 * injectable by the client. x-forwarded-for CAN be spoofed if not behind
 * Vercel's edge, so it is treated as a fallback only.
 */
function extractClientIp(request: NextRequest): string {
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // The leftmost entry in the comma-separated chain is the original client IP.
    // Subsequent entries are proxies added along the forwarding path.
    return xForwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

/**
 * Check whether the given IP address is within its free-tier quota for the
 * current 24-hour window. Increments the counter if the request is allowed.
 *
 * Returns true if the request should proceed, false if it should be 429'd.
 *
 * Intentionally synchronous (no async/await) to keep the hot path under 1ms —
 * rate limit checks should add negligible latency to request handling.
 *
 * Called BEFORE auth and BEFORE fal.ai to ensure over-limit requests
 * cost nothing in compute or API credits.
 */
function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();

  // Prune expired entries to prevent unbounded memory growth on warm instances.
  // Inline pruning (vs a timer) is reliable in serverless where timers may not fire.
  for (const [storedIp, record] of ipRateLimitMap.entries()) {
    if (now - record.windowStartMs > IP_RATE_LIMIT_WINDOW_MS) {
      ipRateLimitMap.delete(storedIp);
    }
  }

  const existingRecord = ipRateLimitMap.get(ip);

  // No record, or the existing window has expired → fresh window for this IP
  if (!existingRecord || now - existingRecord.windowStartMs > IP_RATE_LIMIT_WINDOW_MS) {
    ipRateLimitMap.set(ip, { count: 1, windowStartMs: now });
    return true; // allowed
  }

  // Over the limit → deny without incrementing (counter stays at max)
  if (existingRecord.count >= FREE_GENERATIONS_PER_IP_PER_DAY) {
    return false; // denied
  }

  // Within limit → allow and increment
  existingRecord.count += 1;
  return true; // allowed
}

/**
 * Create the fal.ai client with our API key.
 *
 * MIGRATION NOTE (2026-03-23):
 * The fal.ai client SDK v1.2+ replaced the `fal.config()` + `fal.subscribe()`
 * pattern with a `createFalClient()` factory. The old `import * as fal` and
 * `fal.config({ credentials })` no longer exists. Instead, we create a client
 * instance and call `client.subscribe()` on it.
 *
 * We use lazy initialization (empty string fallback) so that `next build`
 * does not crash when FAL_KEY is absent. The actual API call will fail at
 * runtime if the key is missing, which is handled by the try/catch below.
 */
const fal = createFalClient({
  credentials: process.env.FAL_KEY || "",
});

/**
 * Helper to get the user's subscription tier from the database.
 *
 * Queries user_profiles.plan which is kept in sync by the Stripe webhook
 * handler. Falls back to "free" if no profile exists yet.
 */
async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  return getUserSubscriptionTierFromDb(userId);
}

export async function POST(request: NextRequest) {
  // -------------------------------------------------------------------------
  // P0 HARDENING: Server-side IP rate limit (runs BEFORE auth — fast reject)
  // -------------------------------------------------------------------------
  /**
   * This is the FIRST check — before auth, before JSON parsing, before any
   * fal.ai work. Over-limit requests are rejected here at ~0ms cost.
   *
   * Why before auth:
   * - Even authenticated users should have per-IP limits to slow throwaway
   *   account abuse.
   * - Lightweight clones that strip auth rely ENTIRELY on this gate.
   * - Rejecting early means over-limit requests cost nothing in auth DB lookups,
   *   fal.ai credits, or server compute beyond this check.
   *
   * If you are building a clone WITHOUT auth (freemium, no login required),
   * this IP gate is your ONLY server-side protection. Do NOT remove it.
   * If you add Stripe + paid tier, grant a higher limit for paid users by
   * checking their subscription before calling checkIpRateLimit, or exempt
   * them from the check entirely after verifying their session.
   */
  const clientIp = extractClientIp(request);
  if (!checkIpRateLimit(clientIp)) {
    return NextResponse.json(
      {
        error:
          "You've reached the free tier limit for today. Come back tomorrow " +
          "for more free generations, or upgrade for unlimited access.",
        upgradeUrl: "/#pricing",
      },
      {
        status: 429,
        headers: {
          // Retry-After: seconds until the 24h window resets (conservative max)
          "Retry-After": String(Math.ceil(IP_RATE_LIMIT_WINDOW_MS / 1000)),
          "X-RateLimit-Limit": String(FREE_GENERATIONS_PER_IP_PER_DAY),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    /**
     * Step 1: Authentication check.
     * Every generation costs us money (fal.ai charges per inference),
     * so we MUST verify the user is authenticated. Anonymous users
     * should never reach this endpoint.
     */
    /**
     * MIGRATION NOTE: Changed from NextAuth's getServerSession(authOptions)
     * to Better Auth's auth.api.getSession({ headers }). The Better Auth
     * session returns { user: { id, email, name, image } } directly.
     */
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Please sign in to use this tool." },
        { status: 401 }
      );
    }

    const authenticatedUserEmail = session.user.email;
    const authenticatedUserId =
      (session.user as { id?: string }).id || authenticatedUserEmail;

    /**
     * Step 2: Credit check.
     * Before calling fal.ai (which costs money), verify the user has
     * credits remaining. This prevents us from paying for inference
     * that the user hasn't paid for.
     */
    const userSubscriptionTier =
      await getUserSubscriptionTier(authenticatedUserId);
    const creditCheckResult = await checkUserCreditAvailability(
      authenticatedUserId,
      userSubscriptionTier
    );

    if (!creditCheckResult.hasCreditsRemaining) {
      return NextResponse.json(
        {
          error: "You've used all your credits for this period.",
          remainingCredits: 0,
          tierLimit: creditCheckResult.tierCreditLimit,
          upgradeUrl: "/#pricing",
        },
        { status: 429 }
      );
    }

    /**
     * Step 3: Parse the request and call fal.ai.
     * 
     * CUSTOMIZE THIS SECTION PER CLONE:
     * The input format and fal.ai model parameters differ per product.
     * 
     * For image-based tools, the frontend sends the image as a base64 data URL
     * or uploads it to fal.ai storage first and sends the URL.
     * 
     * For the template, we expect:
     *   { imageUrl: string } — a URL or data URL of the image to process
     * 
     * EXAMPLE CUSTOMIZATIONS:
     * 
     * Background Remover (fal-ai/birefnet):
     *   const result = await fal.subscribe("fal-ai/birefnet", {
     *     input: { image_url: requestBody.imageUrl },
     *   });
     * 
     * Image Upscaler (fal-ai/clarity-upscaler):
     *   const result = await fal.subscribe("fal-ai/clarity-upscaler", {
     *     input: { image_url: requestBody.imageUrl, scale: 2 },
     *   });
     * 
     * QR Art Generator:
     *   const result = await fal.subscribe("fal-ai/qr-code-generator", {
     *     input: { qr_content: requestBody.qrContent, prompt: requestBody.stylePrompt },
     *   });
     */
    const requestBody = await request.json();
    const { imageUrl: submittedImageUrl } = requestBody;

    if (!submittedImageUrl) {
      return NextResponse.json(
        { error: "No image URL provided. Please upload an image first." },
        { status: 400 }
      );
    }

    /**
     * Call fal.ai with the configured model.
     * 
     * fal.subscribe() is a convenience method that:
     *   1. Submits the job to fal.ai's queue
     *   2. Polls for completion
     *   3. Returns the result when ready
     * 
     * For longer-running models, you might want fal.queue.submit() + polling
     * from the frontend instead, to avoid holding the HTTP connection open.
     * For most image models, processing takes 5-15 seconds which is fine
     * for a synchronous request.
     */
    const falApiResult = await fal.subscribe(PRODUCT_CONFIG.falModelIdentifier, {
      input: {
        image_url: submittedImageUrl,
      },
    });

    /**
     * Extract the result image URL from fal.ai's response.
     * 
     * WHY this specific path (data.image.url):
     * fal.ai models return results in slightly different shapes, but most
     * image models follow this pattern. If your model returns differently,
     * adjust this extraction logic.
     * 
     * Common patterns:
     *   - falApiResult.data.image.url — single output image
     *   - falApiResult.data.images[0].url — multiple output images
     *   - falApiResult.data.output — raw URL string
     */
    const resultData = falApiResult.data as Record<string, unknown>;
    let processedImageUrl: string | null = null;

    if (
      resultData.image &&
      typeof resultData.image === "object" &&
      (resultData.image as Record<string, unknown>).url
    ) {
      processedImageUrl = (resultData.image as Record<string, unknown>)
        .url as string;
    } else if (Array.isArray(resultData.images) && resultData.images[0]?.url) {
      processedImageUrl = resultData.images[0].url as string;
    } else if (typeof resultData.output === "string") {
      processedImageUrl = resultData.output;
    }

    if (!processedImageUrl) {
      console.error(
        "Unexpected fal.ai response structure:",
        JSON.stringify(resultData).slice(0, 500)
      );
      return NextResponse.json(
        { error: "AI processing completed but no result image was returned." },
        { status: 500 }
      );
    }

    /**
     * Step 4: Deduct credit AFTER successful processing.
     * 
     * CRITICAL: We deduct AFTER, not before, the fal.ai call.
     * If fal.ai fails (timeout, model error, etc.), the user shouldn't
     * lose a credit for a failed generation. This is a UX decision that
     * prevents angry support tickets.
     */
    await deductOneCreditForUser(authenticatedUserId, userSubscriptionTier);

    /**
     * Re-check credits after deduction to include the updated count
     * in the response. The frontend uses this to show "X credits remaining".
     */
    const updatedCreditCheck = await checkUserCreditAvailability(
      authenticatedUserId,
      userSubscriptionTier
    );

    return NextResponse.json({
      resultUrl: processedImageUrl,
      remainingCredits: updatedCreditCheck.remainingCreditsCount,
      tierLimit: updatedCreditCheck.tierCreditLimit,
      isPaidUser: userSubscriptionTier === "basic" || userSubscriptionTier === "pro",
    });
  } catch (generationError) {
    console.error("Generation API error:", generationError);

    /**
     * Distinguish between fal.ai errors and other errors.
     * fal.ai errors usually have a message property with useful info
     * (e.g., "Invalid image URL", "Model not found").
     */
    const errorMessage =
      generationError instanceof Error
        ? generationError.message
        : "An unexpected error occurred during processing.";

    return NextResponse.json(
      { error: `Processing failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
