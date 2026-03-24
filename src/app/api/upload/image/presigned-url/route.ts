/**
 * POST /api/upload/image/presigned-url
 *
 * Returns a presigned PUT URL for the client to upload an image directly to R2.
 *
 * WHY PRESIGNED URLS:
 * Direct client-to-R2 uploads bypass our serverless functions entirely.
 * This avoids Vercel's 4.5MB body size limit and eliminates the latency
 * of streaming file bytes through a serverless function.
 *
 * FLOW:
 * 1. Client calls this endpoint with { contentType, filename }
 * 2. Server generates a presigned URL valid for 10 minutes
 * 3. Client PUTs the file directly to R2 using that URL
 * 4. Client sends the returned `key` to the processing API
 *
 * AUTHENTICATION:
 * Requires a valid Better Auth session. The file is namespaced by user ID
 * in the R2 bucket to prevent one user from overwriting another's files.
 *
 * REQUEST BODY:
 * { contentType: string, filename: string }
 *
 * RESPONSE:
 * { url: string, key: string }
 *
 * CALLED BY:
 * Client-side upload components in your product pages.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generatePresignedUploadUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  /**
   * STEP 1: Authenticate the user.
   * We need the user ID to namespace the upload in R2.
   */
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /**
   * STEP 2: Parse and validate the request body.
   * contentType is required for the Content-Type header on the presigned URL.
   * filename is used to determine the file extension.
   */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { contentType, filename } = body;
  if (!contentType || !filename) {
    return NextResponse.json({ error: "Missing contentType or filename" }, { status: 400 });
  }

  /**
   * STEP 3: Generate a unique key for the upload.
   * Format: uploads/{userId}/{uuid}.{ext}
   * The UUID prevents filename collisions and the user ID ensures
   * files are organized by user in the R2 bucket.
   */
  const ext = filename.split(".").pop() || "png";
  const key = `uploads/${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const url = await generatePresignedUploadUrl(key, contentType);

  return NextResponse.json({ url, key });
}
