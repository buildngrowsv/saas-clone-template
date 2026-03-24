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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PRODUCT_CONFIG } from "@/lib/config";
import {
  checkUserCreditAvailability,
  deductOneCreditForUser,
  type SubscriptionTier,
} from "@/lib/credits";
import * as fal from "@fal-ai/client";

/**
 * Configure the fal.ai client with our API key.
 * This runs once when the module is first imported.
 */
fal.config({
  credentials: process.env.FAL_KEY,
});

/**
 * Helper to get the user's subscription tier.
 * 
 * TODO (PRODUCTION): Look up the user's active subscription in the database:
 *   const subscription = await db.query.subscriptions.findFirst({
 *     where: and(
 *       eq(subscriptions.userEmail, userEmail),
 *       eq(subscriptions.status, 'active')
 *     )
 *   });
 *   return subscription?.tier ?? 'free';
 * 
 * For the template, we default to "free" since there's no database.
 * The Stripe webhook handler would normally set this in the DB.
 */
function getUserSubscriptionTier(_userEmail: string): SubscriptionTier {
  /**
   * TEMPLATE PLACEHOLDER: Always returns "free".
   * In production, query the database for the user's active subscription tier.
   */
  return "free";
}

export async function POST(request: NextRequest) {
  try {
    /**
     * Step 1: Authentication check.
     * Every generation costs us money (fal.ai charges per inference),
     * so we MUST verify the user is authenticated. Anonymous users
     * should never reach this endpoint.
     */
    const session = await getServerSession(authOptions);

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
      getUserSubscriptionTier(authenticatedUserEmail);
    const creditCheckResult = checkUserCreditAvailability(
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
    deductOneCreditForUser(authenticatedUserId, userSubscriptionTier);

    /**
     * Re-check credits after deduction to include the updated count
     * in the response. The frontend uses this to show "X credits remaining".
     */
    const updatedCreditCheck = checkUserCreditAvailability(
      authenticatedUserId,
      userSubscriptionTier
    );

    return NextResponse.json({
      resultUrl: processedImageUrl,
      remainingCredits: updatedCreditCheck.remainingCreditsCount,
      tierLimit: updatedCreditCheck.tierCreditLimit,
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
