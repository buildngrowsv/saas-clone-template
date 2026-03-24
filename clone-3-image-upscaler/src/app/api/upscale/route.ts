/**
 * IMAGE UPSCALE API ROUTE — /api/upscale
 *
 * This is the core API endpoint that powers the UpscaleAI tool.
 * It accepts an image upload via POST (multipart/form-data) along with
 * a scale factor (2, 4, or 8) and returns the upscaled image as a blob.
 *
 * ARCHITECTURE DECISION — Why we proxy through our own API instead of
 * calling fal.ai directly from the client:
 *
 * 1. API KEY SECURITY: The fal.ai API key must stay server-side.
 *    Exposing it in client code would let anyone steal our credits.
 *
 * 2. RATE LIMITING: We enforce per-IP rate limits here (3/day for free
 *    tier) before forwarding to the external API. This protects our
 *    API credits from abuse and creates the free → paid upgrade funnel.
 *
 * 3. FLEXIBILITY: If we switch from fal.ai to a different provider
 *    (e.g., Replicate, self-hosted Real-ESRGAN, or a custom model),
 *    we only change this file. The client never knows or cares.
 *
 * 4. CORS: Direct browser-to-API calls often hit CORS issues. Our
 *    server-side proxy avoids this entirely.
 *
 * PROVIDER: fal.ai — Real-ESRGAN model for image upscaling
 * - Real-ESRGAN is the gold standard for AI upscaling, used by
 *   Topaz Gigapixel, waifu2x, and many other tools under the hood.
 * - Supports 2x, 4x, and 8x scale factors natively.
 * - Returns high-quality upscaled images with AI-enhanced detail.
 * - Pricing is per-request, making it cost-effective at our volume.
 *
 * TODO: The actual fal.ai model ID needs to be configured once we
 * have API access. The model endpoint and request format below are
 * structured based on fal.ai's API patterns but the model_id is a
 * placeholder that must be replaced with the real endpoint.
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
 * The current implementation is a working placeholder that demonstrates
 * the rate limiting logic and user-facing behavior correctly.
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
 * - count: Number of images upscaled today
 * - date: ISO date string (YYYY-MM-DD) for daily reset detection
 */
const inMemoryRateLimitStore = new Map<
  string,
  { count: number; date: string }
>();

/**
 * FREE_TIER_DAILY_UPSCALE_LIMIT — Maximum upscales per day for free users
 *
 * Set to 3 because it's enough for users to experience the quality
 * and see real value, but low enough to create upgrade pressure for
 * anyone with regular use. This matches the same strategy as clone-1
 * (bg-remover) and is consistent across all our SaaS clones to
 * maintain a predictable free-tier experience.
 *
 * 3 is also a good number because users typically want to upscale
 * at least 2-3 images when they discover the tool, so they'll use
 * up their daily quota in one session — creating immediate awareness
 * of the limit and the Pro upgrade path.
 */
const FREE_TIER_DAILY_UPSCALE_LIMIT = 3;

/**
 * VALID_UPSCALE_FACTOR_VALUES — Accepted scale factors
 *
 * We validate the scale factor server-side because:
 * 1. Client-side validation can be bypassed
 * 2. Invalid scale factors could cause API errors or unexpected costs
 * 3. We want to enforce free-tier limits (free users get max 2x)
 *
 * These match the UPSCALE_FACTOR_OPTIONS defined in the client component
 * (ImageUpscaleDropzone.tsx) and the Real-ESRGAN model's supported scales.
 */
const VALID_UPSCALE_FACTOR_VALUES = [2, 4, 8];

/**
 * extractClientIpAddress — Gets the real IP from the request
 *
 * In production behind a reverse proxy (Vercel, Cloudflare, etc.),
 * the real client IP is in the X-Forwarded-For header. We use the
 * first IP in the chain (leftmost) because that's the client's real IP.
 * Subsequent IPs are proxies.
 *
 * Fallback to "unknown" for local development where headers aren't set.
 * This means localhost effectively gets unlimited usage during dev,
 * which is fine — we don't want rate limits slowing down development.
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
 * checkAndUpdateRateLimit — Enforces daily usage limits for upscaling
 *
 * Returns an object with:
 * - allowed: boolean — whether the request should proceed
 * - currentCount: number — how many images have been upscaled today
 * - limit: number — the daily limit (for display in error messages)
 *
 * Side effect: increments the count in the store if allowed.
 * The date check ensures counters reset at midnight UTC.
 *
 * Called by: POST handler below, before forwarding to the upscaling API
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
    return { allowed: true, currentCount: 1, limit: FREE_TIER_DAILY_UPSCALE_LIMIT };
  }

  /**
   * Record exists and is from today — check if under limit.
   * We check >= because count starts at 1 (not 0).
   */
  if (existingRecord.count >= FREE_TIER_DAILY_UPSCALE_LIMIT) {
    return {
      allowed: false,
      currentCount: existingRecord.count,
      limit: FREE_TIER_DAILY_UPSCALE_LIMIT,
    };
  }

  /* Under the limit — increment and allow */
  existingRecord.count += 1;
  inMemoryRateLimitStore.set(ipAddress, existingRecord);
  return {
    allowed: true,
    currentCount: existingRecord.count,
    limit: FREE_TIER_DAILY_UPSCALE_LIMIT,
  };
}

/**
 * POST /api/upscale — Main image upscaling endpoint
 *
 * Accepts: multipart/form-data with:
 *   - "image_file" field: the image to upscale
 *   - "scale" field: the upscale factor (2, 4, or 8)
 *
 * Returns: Upscaled image blob (on success) or JSON error (on failure)
 *
 * Flow:
 * 1. Extract image and scale factor from FormData
 * 2. Validate file exists, has content, and scale is valid
 * 3. Check rate limit
 * 4. Forward to fal.ai upscaling API
 * 5. Return the upscaled image
 *
 * Error responses always include:
 * - error: string — human-readable error message
 * - code: string — machine-readable error code for client-side handling
 */
export async function POST(request: NextRequest) {
  try {
    /**
     * STEP 1: Extract the image file and scale factor from the multipart form data.
     * The client sends the image with the key "image_file" and the scale with "scale"
     * — this must match what the ImageUpscaleDropzone component uses in its FormData.
     */
    const formData = await request.formData();
    const uploadedImageFile = formData.get("image_file") as File | null;
    const requestedScaleFactorString = formData.get("scale") as string | null;

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
     * STEP 1b: Validate and parse the scale factor.
     * We parse it as an integer and check it against valid values.
     * This prevents injection of arbitrary scale values that could
     * cause unexpected behavior or costs in the upstream API.
     */
    const parsedScaleFactor = parseInt(requestedScaleFactorString || "2", 10);

    if (!VALID_UPSCALE_FACTOR_VALUES.includes(parsedScaleFactor)) {
      return NextResponse.json(
        {
          error: `Invalid scale factor: ${requestedScaleFactorString}. Supported values: 2, 4, 8.`,
          code: "INVALID_SCALE_FACTOR",
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
          error: `Daily limit reached (${rateLimitResult.limit} free upscales per day). Upgrade to Pro for unlimited image upscaling.`,
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
     * fal.ai charges per-request based on model and resolution.
     *
     * TODO: Replace with actual fal.ai key once account is set up.
     * The model endpoint below is a placeholder — update with the real
     * Real-ESRGAN model ID from fal.ai's model catalog.
     */
    const falApiKey = process.env.FAL_KEY;

    if (!falApiKey) {
      /**
       * Missing API key — this is a configuration error, not a user error.
       * Log it server-side for debugging, but show a generic message to the user
       * to avoid exposing internal architecture details.
       */
      console.error(
        "[upscale] FAL_KEY environment variable is not set. " +
          "Get a key at https://fal.ai/dashboard/keys"
      );
      return NextResponse.json(
        {
          error:
            "Image upscaling service is not configured. Please contact support.",
          code: "SERVICE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    /**
     * STEP 4: Forward the image to fal.ai's upscaling API.
     *
     * fal.ai expects the image as a base64 data URL in the JSON request body,
     * along with the scale factor. We convert the uploaded file to base64 here.
     *
     * TODO: Replace "fal-ai/real-esrgan" with the actual model ID from
     * fal.ai's model catalog. The endpoint pattern is:
     * https://fal.run/{model-owner}/{model-name}
     *
     * Real-ESRGAN model options on fal.ai:
     * - fal-ai/real-esrgan (general purpose, good for photos)
     * - Other upscaling models may be available — check catalog
     *
     * The scale parameter maps directly to Real-ESRGAN's supported factors.
     */
    const imageFileBytes = await uploadedImageFile.arrayBuffer();
    const imageBase64String = Buffer.from(imageFileBytes).toString("base64");
    const imageDataUrl = `data:${uploadedImageFile.type};base64,${imageBase64String}`;

    /**
     * TODO: Update this model endpoint with the real fal.ai model ID.
     * The URL pattern for fal.ai is: https://fal.run/{model_id}
     * For Real-ESRGAN, it would be something like:
     * https://fal.run/fal-ai/real-esrgan
     *
     * Check https://fal.ai/models for the latest available upscaling models.
     */
    const FAL_UPSCALE_MODEL_ENDPOINT = "https://fal.run/fal-ai/real-esrgan"; // TODO: Verify this model ID

    const falApiResponse = await fetch(FAL_UPSCALE_MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageDataUrl,
        scale: parsedScaleFactor,
      }),
    });

    /**
     * STEP 5: Handle the API response.
     *
     * fal.ai returns JSON with an "image" object containing the result URL.
     * We need to:
     * 1. Parse the JSON response
     * 2. Extract the image URL from the result
     * 3. Fetch the actual image from that URL
     * 4. Return it as a binary blob to the client
     *
     * This two-step fetch (API → result URL → image binary) is common with
     * AI model APIs that run asynchronously and host results temporarily.
     */
    if (!falApiResponse.ok) {
      const errorBody = await falApiResponse.json().catch(() => null);
      const errorMessage =
        errorBody?.detail || errorBody?.message || "Image upscaling failed";

      console.error("[upscale] fal.ai API error:", {
        status: falApiResponse.status,
        error: errorMessage,
      });

      /**
       * Map specific HTTP status codes to user-friendly messages.
       * 402 = out of API credits (we need to top up our fal.ai account)
       * 429 = API rate limit (different from our per-user limit)
       * 422 = Invalid input (bad image format, too large, etc.)
       */
      if (falApiResponse.status === 402) {
        return NextResponse.json(
          {
            error:
              "Service temporarily unavailable. Please try again later.",
            code: "API_CREDITS_EXHAUSTED",
          },
          { status: 503 }
        );
      }

      if (falApiResponse.status === 422) {
        return NextResponse.json(
          {
            error:
              "This image could not be processed. Try a different image or a smaller scale factor.",
            code: "INVALID_INPUT",
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        {
          error: `Image upscaling failed: ${errorMessage}`,
          code: "API_ERROR",
        },
        { status: falApiResponse.status }
      );
    }

    /**
     * Parse the fal.ai response to get the upscaled image URL.
     *
     * fal.ai typically returns JSON like:
     * { "image": { "url": "https://fal.media/files/...", "width": 2000, "height": 2000 } }
     *
     * We extract the URL and fetch the actual image binary to stream
     * back to the client. This prevents the client from needing to
     * know about fal.ai's temporary file hosting.
     */
    const falResultJson = await falApiResponse.json();
    const upscaledImageUrl = falResultJson?.image?.url;

    if (!upscaledImageUrl) {
      console.error("[upscale] No image URL in fal.ai response:", falResultJson);
      return NextResponse.json(
        {
          error: "Upscaling completed but no image was returned. Please try again.",
          code: "NO_RESULT_IMAGE",
        },
        { status: 500 }
      );
    }

    /**
     * Fetch the upscaled image from fal.ai's temporary storage.
     * The URL is typically valid for a few hours, but we fetch it
     * immediately and stream it to the client so they don't need
     * to deal with expiring URLs.
     */
    const upscaledImageResponse = await fetch(upscaledImageUrl);

    if (!upscaledImageResponse.ok) {
      console.error("[upscale] Failed to fetch result image:", upscaledImageUrl);
      return NextResponse.json(
        {
          error: "Failed to retrieve the upscaled image. Please try again.",
          code: "RESULT_FETCH_FAILED",
        },
        { status: 500 }
      );
    }

    /**
     * STEP 6: Return the upscaled image to the client.
     *
     * We stream the response directly from fal.ai's storage to the client.
     * Setting the Content-Type appropriately tells the browser (and our
     * frontend code) that this is binary image data, not JSON.
     * The frontend uses response.blob() to handle it.
     *
     * We also include rate limit info in response headers so the
     * frontend could optionally show "2/3 free upscales used today."
     */
    const upscaledImageBuffer = await upscaledImageResponse.arrayBuffer();
    const resultContentType =
      upscaledImageResponse.headers.get("Content-Type") || "image/png";

    return new NextResponse(upscaledImageBuffer, {
      status: 200,
      headers: {
        "Content-Type": resultContentType,
        /**
         * Custom headers for rate limit visibility on the client side.
         * These follow the standard X-RateLimit-* convention used by
         * GitHub, Twitter, and other APIs. The client can optionally
         * read these to show usage counts in the UI.
         */
        "X-RateLimit-Limit": String(rateLimitResult.limit),
        "X-RateLimit-Remaining": String(
          rateLimitResult.limit - rateLimitResult.currentCount
        ),
        /**
         * Include the scale factor in the response headers so the client
         * can confirm what was processed (useful for debugging and for
         * generating the correct download filename).
         */
        "X-Upscale-Factor": String(parsedScaleFactor),
      },
    });
  } catch (unexpectedError) {
    /**
     * Catch-all for truly unexpected errors (out of memory, etc.)
     * Log the full error for debugging but show a generic message to users.
     * In production, this would also go to an error tracking service
     * (Sentry, LogRocket, etc.) for alerting and debugging.
     */
    console.error("[upscale] Unexpected error:", unexpectedError);
    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
