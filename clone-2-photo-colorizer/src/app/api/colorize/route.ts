/**
 * PHOTO COLORIZATION API ROUTE — /api/colorize
 *
 * This is the core API endpoint that powers the ColorizeAI product.
 * It accepts an image upload via POST (multipart/form-data) and returns
 * the colorized image as a PNG/JPEG blob.
 *
 * ARCHITECTURE DECISION — Why we proxy through our own API instead of
 * calling fal.ai directly from the client:
 *
 * 1. API KEY SECURITY: The fal.ai API key must stay server-side.
 *    Exposing it in client code would let anyone steal our credits.
 *
 * 2. RATE LIMITING: We enforce per-IP rate limits here (3/day for free
 *    tier) before forwarding to the external API. This protects our
 *    API credits from abuse and creates the free -> paid upgrade funnel.
 *
 * 3. FLEXIBILITY: If we switch from fal.ai to a different provider
 *    (e.g., DeepAI, Replicate, self-hosted DeOldify, or a custom ML
 *    model), we only change this file. The client never knows or cares.
 *
 * 4. CORS: Direct browser-to-API calls often hit CORS issues. Our
 *    server-side proxy avoids this entirely.
 *
 * PROVIDER: fal.ai (https://fal.ai/)
 * - Supports various image processing models including colorization
 * - Pay-per-use pricing model (cost per inference)
 * - Returns colorized image as PNG/JPEG
 *
 * TODO: Verify the exact fal.ai model ID for colorization. The model
 * endpoint below is a placeholder structure. Possible models:
 * - fal-ai/colorize (if available)
 * - fal-ai/deoldify (popular colorization model)
 * - Or use Replicate's DeOldify endpoint as an alternative
 *
 * RATE LIMITING STRATEGY:
 * Currently uses an in-memory Map keyed by IP address. This works for
 * single-server deployments but does NOT work with serverless (Vercel)
 * because each cold start gets a fresh Map. For production, we need:
 * - Vercel KV (Redis) for rate limit counters
 * - Or Upstash Redis via REST API
 * - Or Cloudflare KV if deployed to CF Pages
 *
 * TODO: Replace in-memory rate limiting with Redis/KV for production.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limit store
 *
 * Maps IP addresses to their usage count and the date of first use.
 * Resets daily (we check the date on each request).
 *
 * IMPORTANT: This is ephemeral — it resets on server restart and doesn't
 * share state across serverless function instances. See the TODO above
 * about replacing this with Redis/KV for production.
 *
 * Structure: Map<ipAddress, { count: number, date: string }>
 * - count: Number of images colorized today
 * - date: ISO date string (YYYY-MM-DD) for daily reset detection
 */
const inMemoryRateLimitStore = new Map<
  string,
  { count: number; date: string }
>();

/**
 * FREE_TIER_DAILY_LIMIT — Maximum colorizations per day for free users
 *
 * Set to 3 because it's enough for users to experience the emotional
 * impact of seeing their old photos come alive in color, but low enough
 * to create upgrade pressure for anyone with an entire album to process.
 * The emotional "wow" of the first colorization is the best sales pitch
 * for the Pro tier — we just need to give them enough to get hooked.
 */
const FREE_TIER_DAILY_LIMIT = 3;

/**
 * extractClientIpAddress — Gets the real IP from the request
 *
 * In production behind a reverse proxy (Vercel, Cloudflare, etc.),
 * the real client IP is in the X-Forwarded-For header. We use the
 * first IP in the chain (leftmost) because that's the client's real IP.
 * Subsequent IPs are proxies.
 *
 * Fallback to "unknown" for local development where headers aren't set.
 */
function extractClientIpAddress(request: NextRequest): string {
  const forwardedForHeader = request.headers.get("x-forwarded-for");
  if (forwardedForHeader) {
    /* Take the first IP — that's the actual client, rest are proxies */
    return forwardedForHeader.split(",")[0].trim();
  }
  /* Fallback for local development or direct connections */
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * checkAndUpdateRateLimit — Enforces daily usage limits
 *
 * Returns an object with:
 * - allowed: boolean — whether the request should proceed
 * - currentCount: number — how many images have been colorized today
 * - limit: number — the daily limit (for display in error messages)
 *
 * Side effect: increments the count in the store if allowed.
 * The date check ensures counters reset at midnight UTC.
 *
 * Called by: POST handler below, before forwarding to the colorization API
 */
function checkAndUpdateRateLimit(ipAddress: string): {
  allowed: boolean;
  currentCount: number;
  limit: number;
} {
  const todayDateString = new Date().toISOString().split("T")[0];
  const existingRecord = inMemoryRateLimitStore.get(ipAddress);

  /**
   * If no record exists or the record is from a previous day,
   * start fresh with count = 1 (this request).
   */
  if (!existingRecord || existingRecord.date !== todayDateString) {
    inMemoryRateLimitStore.set(ipAddress, {
      count: 1,
      date: todayDateString,
    });
    return { allowed: true, currentCount: 1, limit: FREE_TIER_DAILY_LIMIT };
  }

  /**
   * Record exists and is from today — check if under limit.
   * We check >= because count starts at 1 (not 0).
   */
  if (existingRecord.count >= FREE_TIER_DAILY_LIMIT) {
    return {
      allowed: false,
      currentCount: existingRecord.count,
      limit: FREE_TIER_DAILY_LIMIT,
    };
  }

  /* Under the limit — increment and allow */
  existingRecord.count += 1;
  inMemoryRateLimitStore.set(ipAddress, existingRecord);
  return {
    allowed: true,
    currentCount: existingRecord.count,
    limit: FREE_TIER_DAILY_LIMIT,
  };
}

/**
 * POST /api/colorize — Main photo colorization endpoint
 *
 * Accepts: multipart/form-data with an "image_file" field
 * Returns: Colorized image blob (on success) or JSON error (on failure)
 *
 * Flow:
 * 1. Extract image from FormData
 * 2. Validate file exists and has content
 * 3. Check rate limit
 * 4. Forward to fal.ai colorization API (or placeholder)
 * 5. Return the colorized image
 *
 * Error responses always include:
 * - error: string — human-readable error message
 * - code: string — machine-readable error code for client-side handling
 */
export async function POST(request: NextRequest) {
  try {
    /**
     * STEP 1: Extract the image file from the multipart form data.
     * The client sends it with the key "image_file" — this must match
     * what the ImageUploadDropzone component uses in its FormData.
     */
    const formData = await request.formData();
    const uploadedImageFile = formData.get("image_file") as File | null;

    if (!uploadedImageFile || uploadedImageFile.size === 0) {
      return NextResponse.json(
        {
          error: "No image file provided. Please select an image to upload.",
          code: "MISSING_FILE",
        },
        { status: 400 }
      );
    }

    /**
     * STEP 2: Check rate limit before spending API credits.
     * We do this BEFORE the API call to avoid wasting credits on
     * requests that would be rate-limited anyway.
     */
    const clientIp = extractClientIpAddress(request);
    const rateLimitResult = checkAndUpdateRateLimit(clientIp);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${rateLimitResult.limit} free colorizations per day). Upgrade to Pro for unlimited photo colorization.`,
          code: "RATE_LIMIT_EXCEEDED",
          limit: rateLimitResult.limit,
          used: rateLimitResult.currentCount,
        },
        { status: 429 }
      );
    }

    /**
     * STEP 3: Check for the API key.
     *
     * The FAL_KEY environment variable must be set in .env.local
     * (for development) or in the deployment environment (Vercel/Cloudflare).
     *
     * Get an API key at: https://fal.ai/dashboard/keys
     * fal.ai uses a pay-per-inference model, so each colorization has
     * a small cost (~$0.01-0.05 per image depending on model and resolution).
     */
    const falApiKey = process.env.FAL_KEY;

    if (!falApiKey) {
      /**
       * Missing API key — this is a configuration error, not a user error.
       * Log it server-side for debugging, but show a generic message to the user
       * to avoid exposing internal architecture details.
       */
      console.error(
        "[colorize] FAL_KEY environment variable is not set. " +
          "Get a key at https://fal.ai/dashboard/keys"
      );
      return NextResponse.json(
        {
          error:
            "Colorization service is not configured. Please contact support.",
          code: "SERVICE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    /**
     * STEP 4: Forward the image to fal.ai's colorization model.
     *
     * fal.ai expects images as base64 data URIs in their REST API.
     * We convert the uploaded file to base64 and send it as a JSON payload.
     *
     * TODO: Verify the exact model endpoint. The model ID below is a
     * placeholder. Potential fal.ai colorization models:
     * - "fal-ai/colorize" (if available on the platform)
     * - "fal-ai/deoldify" (popular open-source colorization model)
     * - "fal-ai/stable-diffusion-img2img" (with colorization prompt)
     *
     * Alternative providers if fal.ai doesn't have a dedicated colorization model:
     * - Replicate: run "arielreplicate/deoldify_image" model
     * - DeepAI: colorizer endpoint
     * - Self-hosted: run DeOldify or DDColor as a Docker container
     *
     * The base64 approach is used because fal.ai's REST API expects
     * images as data URIs, not as multipart form uploads. This is
     * different from remove.bg's API design in clone-1.
     */
    const imageFileBytes = await uploadedImageFile.arrayBuffer();
    const imageBase64String = Buffer.from(imageFileBytes).toString("base64");
    const imageDataUri = `data:${uploadedImageFile.type};base64,${imageBase64String}`;

    /**
     * Call the fal.ai colorization API.
     *
     * TODO: Replace "fal-ai/colorize" with the verified model ID.
     * The request structure follows fal.ai's standard REST API pattern:
     * POST to https://fal.run/<model-id> with JSON body containing
     * the input parameters.
     *
     * The Authorization header uses "Key" prefix for fal.ai API keys
     * (not "Bearer" like most APIs — this is fal.ai specific).
     */
    const colorizationApiResponse = await fetch(
      "https://fal.run/fal-ai/colorize", /* TODO: Verify this model ID exists on fal.ai */
      {
        method: "POST",
        headers: {
          Authorization: `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageDataUri,
        }),
      }
    );

    /**
     * STEP 5: Handle the API response.
     *
     * fal.ai returns JSON with the result URL or error details.
     * On success, the response contains an "image" or "output" field
     * with a URL to the colorized image that we need to fetch and
     * forward to the client.
     */
    if (!colorizationApiResponse.ok) {
      const errorBody = await colorizationApiResponse.json().catch(() => null);
      const errorMessage =
        errorBody?.detail || errorBody?.message || "Colorization failed";

      console.error("[colorize] API error:", {
        status: colorizationApiResponse.status,
        error: errorMessage,
      });

      /**
       * Map specific HTTP status codes to user-friendly messages.
       * 402/403 = out of API credits or invalid key
       * 429 = API rate limit (different from our per-user limit)
       */
      if (
        colorizationApiResponse.status === 402 ||
        colorizationApiResponse.status === 403
      ) {
        return NextResponse.json(
          {
            error:
              "Service temporarily unavailable. Please try again later.",
            code: "API_CREDITS_EXHAUSTED",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: `Colorization failed: ${errorMessage}`,
          code: "API_ERROR",
        },
        { status: colorizationApiResponse.status }
      );
    }

    /**
     * STEP 6: Extract the colorized image URL from the fal.ai response
     * and fetch the actual image data to return to the client.
     *
     * fal.ai typically returns JSON like:
     * { "image": { "url": "https://...", "content_type": "image/png" } }
     * or
     * { "output": "https://..." }
     *
     * We try both patterns because different fal.ai models use different
     * response structures. Once we verify the exact model, we can simplify
     * this to match the specific response format.
     */
    const colorizationResult = await colorizationApiResponse.json();

    /**
     * Extract the result image URL from the response.
     * Try multiple common fal.ai response structures because
     * different models return results in slightly different formats.
     */
    const resultImageUrl =
      colorizationResult?.image?.url ||
      colorizationResult?.output?.url ||
      colorizationResult?.output ||
      colorizationResult?.image;

    if (!resultImageUrl || typeof resultImageUrl !== "string") {
      console.error(
        "[colorize] Unexpected response structure:",
        JSON.stringify(colorizationResult).substring(0, 500)
      );
      return NextResponse.json(
        {
          error: "Colorization completed but could not retrieve the result. Please try again.",
          code: "RESULT_PARSE_ERROR",
        },
        { status: 500 }
      );
    }

    /**
     * Fetch the actual colorized image from the URL that fal.ai returned.
     * fal.ai stores results temporarily on their CDN, so we need to
     * download it and forward it to our client before it expires.
     */
    const colorizedImageResponse = await fetch(resultImageUrl);

    if (!colorizedImageResponse.ok) {
      console.error("[colorize] Failed to fetch result image:", {
        url: resultImageUrl,
        status: colorizedImageResponse.status,
      });
      return NextResponse.json(
        {
          error: "Failed to retrieve colorized image. Please try again.",
          code: "RESULT_FETCH_ERROR",
        },
        { status: 500 }
      );
    }

    /**
     * STEP 7: Return the colorized image to the client.
     *
     * We stream the image data directly to the client as a binary blob.
     * The Content-Type is set to match whatever fal.ai returned
     * (typically image/png or image/jpeg).
     *
     * We also include rate limit info in response headers so the
     * frontend could optionally show "2/3 free colorizations used today."
     */
    const colorizedImageBuffer = await colorizedImageResponse.arrayBuffer();
    const contentType =
      colorizedImageResponse.headers.get("content-type") || "image/png";

    return new NextResponse(colorizedImageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        /**
         * Custom headers for rate limit visibility on the client side.
         * These follow the standard X-RateLimit-* convention.
         */
        "X-RateLimit-Limit": String(rateLimitResult.limit),
        "X-RateLimit-Remaining": String(
          rateLimitResult.limit - rateLimitResult.currentCount
        ),
      },
    });
  } catch (unexpectedError) {
    /**
     * Catch-all for truly unexpected errors (out of memory, network failures, etc.)
     * Log the full error for debugging but show a generic message to users.
     */
    console.error("[colorize] Unexpected error:", unexpectedError);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
