/**
 * Cloudflare R2 client — S3-compatible object storage for user uploads and generated outputs.
 *
 * WHY R2:
 * Cloudflare R2 is S3-compatible but has zero egress fees, which is critical for SaaS
 * products that serve files to users. S3 egress costs can be devastating at scale.
 * R2 uses the same AWS SDK (S3Client), so the code is portable to S3 if needed.
 *
 * UPLOAD ARCHITECTURE:
 * This template uses presigned URLs for uploads. The flow is:
 *   1. Client requests a presigned PUT URL from /api/upload/*/presigned-url
 *   2. Server generates a time-limited URL (10 min) using R2 credentials
 *   3. Client uploads the file directly to R2 (bypasses our server entirely)
 *   4. Client sends the R2 object key to the API for processing
 *
 * WHY PRESIGNED URLS:
 * Direct client-to-R2 uploads avoid routing large files through serverless functions.
 * Vercel has a 4.5MB request body limit on serverless functions, and even within
 * that limit, you're paying for function execution time while bytes stream through.
 * Presigned URLs let the client upload multi-GB files directly to R2.
 *
 * LAZY INITIALIZATION:
 * Like stripe.ts and auth.ts, the R2 client is lazily initialized to avoid
 * crashing at Next.js build time when env vars aren't available.
 *
 * IMPORTED BY:
 * - src/app/api/upload/image/presigned-url/route.ts
 * - src/app/api/upload/video/presigned-url/route.ts
 * - src/app/api/upload/audio/presigned-url/route.ts
 * - Any API route that needs to read from or write to R2
 *
 * SETUP:
 * 1. Create a Cloudflare R2 bucket in the Cloudflare dashboard
 * 2. Create an R2 API token with read/write permissions
 * 3. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env.local
 * 4. (Optional) Set up a custom domain for public access and set R2_PUBLIC_URL
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Private singletons — created on first use */
let _r2Client: S3Client | null = null;
let _bucket: string | null = null;

/**
 * Get or create the R2 S3Client singleton.
 *
 * Validates all required env vars on first use and throws a clear error
 * if any are missing. This is much better than creating a client with
 * undefined credentials that would fail with confusing AWS SDK errors later.
 *
 * @returns Configured S3Client pointing to the R2 endpoint
 * @throws Error if any R2 env vars are missing
 */
function getR2Client(): S3Client {
  if (!_r2Client) {
    const requiredVars = {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    };

    const missing = Object.entries(requiredVars)
      .filter(([, val]) => !val)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `[r2] Missing required environment variables: ${missing.join(", ")}. ` +
        "Set them in .env.local or Vercel dashboard."
      );
    }

    /**
     * R2 uses Cloudflare's S3-compatible endpoint format.
     * Region is "auto" because R2 automatically routes to the nearest location.
     */
    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${requiredVars.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requiredVars.R2_ACCESS_KEY_ID!,
        secretAccessKey: requiredVars.R2_SECRET_ACCESS_KEY!,
      },
    });
    _bucket = requiredVars.R2_BUCKET_NAME!;
  }
  return _r2Client;
}

/**
 * Get the bucket name. Ensures the client is initialized first.
 */
function getBucket(): string {
  if (!_bucket) getR2Client();
  return _bucket!;
}

/**
 * Generate a presigned PUT URL for direct client-to-R2 upload.
 *
 * The returned URL allows the client to upload a file directly to R2
 * using an HTTP PUT request. The URL expires after the specified time.
 *
 * @param key - The object key (path) in the bucket, e.g., "uploads/user123/image.png"
 * @param contentType - MIME type of the file being uploaded (e.g., "image/png")
 * @param expiresIn - URL expiry in seconds (default 600 = 10 minutes)
 * @returns Presigned URL string that the client can PUT to
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

/**
 * Generate a presigned GET URL for downloading from R2.
 *
 * Used for private/temporary access to files that shouldn't have permanent public URLs.
 * For example, generated outputs that are only accessible to the user who created them.
 *
 * @param key - The object key in the bucket
 * @param expiresIn - URL expiry in seconds (default 3600 = 1 hour)
 * @returns Presigned URL string for downloading
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

/**
 * Build the public URL for an R2 object using the custom domain.
 *
 * This only works if you've set up a custom domain for your R2 bucket
 * and set R2_PUBLIC_URL in your environment. Without it, you need to
 * use presigned URLs for all access.
 *
 * @param key - The object key in the bucket
 * @returns Full public URL for the object
 */
export function getPublicUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    console.warn("[r2] R2_PUBLIC_URL is not set — public URLs will not work. Use presigned URLs instead.");
  }
  return `${publicUrl || ""}/${key}`;
}
