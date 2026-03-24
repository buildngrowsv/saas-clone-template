"use client";

/**
 * IMAGE UPLOAD DROPZONE COMPONENT — ColorizeAI
 *
 * This is the core interactive component of the AI Photo Colorizer.
 * It handles the entire user flow from image selection to result download:
 *
 * 1. UPLOAD: Drag-and-drop or click-to-select file input
 * 2. PREVIEW: Shows the original B&W image immediately after selection
 * 3. PROCESS: Sends the image to our /api/colorize endpoint
 * 4. RESULT: Displays the colorized image side-by-side with the original
 * 5. DOWNLOAD: One-click download of the colorized result as PNG
 *
 * WHY THIS IS A SINGLE COMPONENT (not split into sub-components):
 * The upload -> process -> result flow is tightly coupled state-wise.
 * Splitting it would require prop drilling or context for the image state,
 * processing state, and result state. Since this is the ONLY interactive
 * section of the landing page, keeping it unified is simpler and more
 * maintainable. If we add features like batch processing or history,
 * we'd extract sub-components at that point.
 *
 * KEY DIFFERENCE FROM CLONE-1 (BG Remover):
 * Instead of a checkerboard transparency pattern for the result, we show
 * a side-by-side before/after comparison. The "before" shows the original
 * grayscale image and the "after" shows the AI-colorized version. This
 * before/after comparison is critical for colorization because the VALUE
 * proposition is visual — users need to SEE the transformation to
 * appreciate it and be willing to pay for more.
 *
 * IMPORTANT TECHNICAL NOTE ON FILE HANDLING:
 * We use FormData to send the image as multipart/form-data to the API.
 * This is necessary because image processing APIs expect binary image
 * data, not base64. We also create local object URLs
 * (URL.createObjectURL) for instant preview without waiting for upload.
 */

import React, { useState, useCallback, useRef } from "react";
import { Upload, Download, Loader2, ImageIcon, X, Palette, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Allowed image MIME types for upload.
 * We support JPEG, PNG, and WebP because:
 * - JPEG: Most common photo format — old scanned photos are usually JPEG
 * - PNG: Common for photos downloaded from the internet or scanned at high quality
 * - WebP: Modern format with good compression, growing usage
 *
 * We intentionally exclude GIF (animated images don't make sense for colorization),
 * SVG (vector, not raster), and TIFF (too large for web upload, though common
 * in archival scanning — we may add this later for Pro users).
 */
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Maximum file size: 10MB
 * This is reasonable for web uploads and covers most scanned photos.
 * High-resolution archival scans can exceed this, but those users are
 * likely Pro-tier anyway and we can increase the limit for them.
 * We enforce this client-side to avoid wasting API calls on oversized files.
 */
const MAXIMUM_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * ImageUploadDropzone — Main interactive component for photo colorization
 *
 * Renders a drag-and-drop zone that handles the full image processing flow.
 * Used in the landing page (src/app/page.tsx) as the primary call-to-action.
 *
 * State machine:
 * IDLE -> (file selected) -> PREVIEW -> (colorize clicked) -> PROCESSING -> RESULT
 *                                                                         |
 *                                                                    (reset) -> IDLE
 */
export default function ImageUploadDropzone() {
  /**
   * STATE MANAGEMENT
   *
   * We track five pieces of state:
   * - originalImagePreviewUrl: Object URL for the uploaded image (instant preview)
   * - colorizedImageResultUrl: Object URL for the colorized result from the API
   * - isCurrentlyProcessing: Loading state while the API processes the image
   * - currentErrorMessage: Any error from validation or API failure
   * - selectedImageFile: The actual File object needed for FormData upload
   *
   * Note: We renamed "processedImageResultUrl" to "colorizedImageResultUrl"
   * for clarity — in this clone, "processed" means "colorized," and using
   * domain-specific naming makes the code self-documenting.
   */
  const [originalImagePreviewUrl, setOriginalImagePreviewUrl] = useState<string | null>(null);
  const [colorizedImageResultUrl, setColorizedImageResultUrl] = useState<string | null>(null);
  const [isCurrentlyProcessing, setIsCurrentlyProcessing] = useState(false);
  const [currentErrorMessage, setCurrentErrorMessage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isDragActiveOverDropzone, setIsDragActiveOverDropzone] = useState(false);

  /**
   * Hidden file input ref — we trigger this programmatically when the user
   * clicks the dropzone. This is the standard pattern for custom file upload
   * UIs because the native <input type="file"> is impossible to style
   * consistently across browsers.
   */
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  /**
   * validateAndSetSelectedFile — Validates the file and sets it for upload
   *
   * This function handles all client-side validation before we even try
   * to send the image to the API. We check:
   * 1. File type (must be JPEG, PNG, or WebP)
   * 2. File size (must be under 10MB)
   *
   * If validation passes, we create an object URL for instant preview and
   * store the file for later upload. We also clear any previous results
   * or errors so the UI is clean for the new image.
   *
   * Called by: onDrop handler, onChange handler (file input)
   */
  const validateAndSetSelectedFile = useCallback((file: File) => {
    /* Clear any previous state so the UI resets cleanly */
    setCurrentErrorMessage(null);
    setColorizedImageResultUrl(null);

    /* Validate MIME type — reject unsupported formats with a helpful message */
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      setCurrentErrorMessage(
        "Unsupported file format. Please upload a JPEG, PNG, or WebP image."
      );
      return;
    }

    /* Validate file size — the 10MB limit protects both the user (upload time)
       and our API (processing time and cost per request) */
    if (file.size > MAXIMUM_FILE_SIZE_BYTES) {
      setCurrentErrorMessage(
        "File is too large. Maximum size is 10MB. Try compressing your image first."
      );
      return;
    }

    /**
     * Create a local object URL for instant preview.
     * This is a blob: URL that points to the file in memory.
     * It's much faster than reading the file as base64 because
     * it doesn't require encoding the entire image into a string.
     *
     * For colorization, instant preview is especially important because
     * users want to see their old photo immediately and feel the
     * emotional connection before hitting "Colorize."
     */
    const previewObjectUrl = URL.createObjectURL(file);
    setOriginalImagePreviewUrl(previewObjectUrl);
    setSelectedImageFile(file);
  }, []);

  /**
   * handleDragOver — Prevents default browser behavior during drag
   *
   * Without preventDefault(), the browser would try to open the file
   * instead of letting our drop handler process it. We also set the
   * visual drag-active state so the dropzone highlights with our
   * warm amber color.
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActiveOverDropzone(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActiveOverDropzone(false);
  }, []);

  /**
   * handleDrop — Processes the dropped file
   *
   * Extracts the first file from the DataTransfer object and validates it.
   * We only process the first file because this is a single-image tool.
   * Multi-file batch processing would be a Pro feature in the future,
   * which would be especially useful for people with entire albums of
   * old family photos to colorize.
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragActiveOverDropzone(false);
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        validateAndSetSelectedFile(droppedFile);
      }
    },
    [validateAndSetSelectedFile]
  );

  /**
   * handleFileInputChange — Processes file selected via the native file picker
   *
   * This fires when the user clicks the dropzone and selects a file from
   * the OS file picker dialog. Same validation flow as drag-and-drop.
   */
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const chosenFile = event.target.files?.[0];
      if (chosenFile) {
        validateAndSetSelectedFile(chosenFile);
      }
      /**
       * Reset the input value so the same file can be re-selected.
       * Without this, selecting the same file twice does nothing because
       * the onChange event doesn't fire if the value hasn't changed.
       */
      event.target.value = "";
    },
    [validateAndSetSelectedFile]
  );

  /**
   * processImageColorization — Sends the image to our API for AI colorization
   *
   * This is the core business logic: send the image to /api/colorize,
   * which proxies to fal.ai's colorization model (or similar service),
   * and display the colorized result. We use FormData for multipart upload
   * because image processing APIs expect binary data, not base64 strings.
   *
   * Error handling covers:
   * - Network failures (fetch throws)
   * - API errors (non-200 response with error message)
   * - Rate limit exceeded (429 responses)
   *
   * The loading state (isCurrentlyProcessing) shows a spinner overlay
   * on the image with a colorization-specific message ("Adding color...")
   * which is more engaging than a generic "Processing..." message.
   */
  const processImageColorization = useCallback(async () => {
    if (!selectedImageFile) return;

    setIsCurrentlyProcessing(true);
    setCurrentErrorMessage(null);

    try {
      /**
       * Build the FormData with the image file.
       * The key "image_file" matches what our API route expects.
       * We use FormData because:
       * 1. It handles multipart encoding automatically
       * 2. It streams the file efficiently (no base64 bloat)
       * 3. It's the standard for file uploads in web APIs
       */
      const uploadFormData = new FormData();
      uploadFormData.append("image_file", selectedImageFile);

      const apiResponse = await fetch("/api/colorize", {
        method: "POST",
        body: uploadFormData,
      });

      if (!apiResponse.ok) {
        /**
         * Parse the error response to show the user a helpful message.
         * Our API returns JSON with an "error" field for all error cases.
         * If parsing fails (shouldn't happen), fall back to a generic message.
         */
        const errorResponseBody = await apiResponse.json().catch(() => ({
          error: "Something went wrong. Please try again.",
        }));
        setCurrentErrorMessage(
          errorResponseBody.error || "Colorization failed. Please try again."
        );
        return;
      }

      /**
       * The API returns the colorized image as a binary PNG/JPEG blob.
       * We create an object URL from the blob for display in an <img> tag.
       * This is the same pattern as the preview — fast and memory-efficient.
       */
      const resultImageBlob = await apiResponse.blob();
      const resultObjectUrl = URL.createObjectURL(resultImageBlob);
      setColorizedImageResultUrl(resultObjectUrl);
    } catch (networkError) {
      /**
       * Network errors (no internet, DNS failure, CORS, etc.)
       * These are distinct from API errors and get a different message
       * because the user action to fix them is different (check connection
       * vs. try different image).
       */
      setCurrentErrorMessage(
        "Network error — please check your connection and try again."
      );
    } finally {
      setIsCurrentlyProcessing(false);
    }
  }, [selectedImageFile]);

  /**
   * downloadColorizedImage — Triggers a browser download of the result
   *
   * Creates a temporary <a> element with the download attribute to trigger
   * a save dialog. The filename "colorized-photo-[timestamp].png" is
   * descriptive so users can find it later. The timestamp prevents
   * conflicts if multiple photos are colorized in the same session.
   */
  const downloadColorizedImage = useCallback(() => {
    if (!colorizedImageResultUrl) return;

    const temporaryDownloadLink = document.createElement("a");
    temporaryDownloadLink.href = colorizedImageResultUrl;
    temporaryDownloadLink.download = `colorized-photo-${Date.now()}.png`;
    document.body.appendChild(temporaryDownloadLink);
    temporaryDownloadLink.click();
    document.body.removeChild(temporaryDownloadLink);
  }, [colorizedImageResultUrl]);

  /**
   * resetToInitialState — Clears everything and returns to the upload view
   *
   * Revokes object URLs to free memory, then resets all state.
   * Called when the user clicks the "X" button to start over with a
   * different photo.
   */
  const resetToInitialState = useCallback(() => {
    if (originalImagePreviewUrl) URL.revokeObjectURL(originalImagePreviewUrl);
    if (colorizedImageResultUrl) URL.revokeObjectURL(colorizedImageResultUrl);
    setOriginalImagePreviewUrl(null);
    setColorizedImageResultUrl(null);
    setSelectedImageFile(null);
    setCurrentErrorMessage(null);
    setIsCurrentlyProcessing(false);
  }, [originalImagePreviewUrl, colorizedImageResultUrl]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/**
       * EMPTY STATE — The dropzone when no image is selected
       *
       * Shows a large, inviting drag-and-drop area with clear instructions.
       * The dashed border and icon are the universal "drop here" pattern.
       * We highlight it with an amber border when the user is actively
       * dragging a file over it to confirm they're in the right place.
       *
       * The copy says "old photo" and "black and white" to reinforce
       * what this tool is for — users who land here from search should
       * immediately feel "yes, this is what I was looking for."
       */}
      {!originalImagePreviewUrl && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => hiddenFileInputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed
            transition-all duration-300 ease-out
            p-12 sm:p-16 text-center
            ${
              isDragActiveOverDropzone
                ? "border-primary bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/[0.02]"
            }
          `}
        >
          <input
            ref={hiddenFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload photo for AI colorization"
          />

          <div className="flex flex-col items-center gap-4">
            <div
              className={`
                rounded-full p-5 transition-colors duration-300
                ${isDragActiveOverDropzone ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}
              `}
            >
              <Upload className="w-10 h-10" />
            </div>

            <div>
              <p className="text-xl font-semibold text-foreground mb-1">
                Drop your black & white photo here
              </p>
              <p className="text-muted-foreground">
                or{" "}
                <span className="text-primary font-medium underline underline-offset-4">
                  click to browse
                </span>
              </p>
            </div>

            <p className="text-xs text-muted-foreground/70 mt-2">
              Supports JPEG, PNG, WebP up to 10MB
            </p>
          </div>
        </div>
      )}

      {/**
       * ERROR STATE — Shows validation or API errors
       *
       * Displayed as a subtle red banner below the dropzone or above the
       * image preview. Uses AlertCircle icon for visual recognition.
       */}
      {currentErrorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{currentErrorMessage}</p>
        </div>
      )}

      {/**
       * IMAGE PREVIEW + RESULT STATE
       *
       * Once an image is selected, we show a side-by-side (or stacked on mobile)
       * view of the original and the colorized result. If the result hasn't been
       * generated yet, we show a "Colorize Photo" CTA button instead of the result.
       *
       * The before/after layout is CRITICAL for colorization because the entire
       * value proposition is visual. Users need to see the grayscale original
       * next to the vibrant colorized version to experience the "wow" moment
       * that drives sharing and upgrades.
       *
       * Labels: "Original" for the B&W input, "Colorized" for the AI output.
       * Using "Colorized" (not "Result") reinforces what the tool does.
       */}
      {originalImagePreviewUrl && (
        <div className="mt-6 space-y-6">
          {/* Reset button — always visible when an image is loaded */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToInitialState}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Start Over
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ORIGINAL IMAGE — Left side (the B&W input) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Original
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border bg-muted/30 aspect-square flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalImagePreviewUrl}
                  alt="Original uploaded photo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            {/* COLORIZED RESULT IMAGE — Right side */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary uppercase tracking-wider">
                  Colorized
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border aspect-square flex items-center justify-center">
                {colorizedImageResultUrl ? (
                  /**
                   * COLORIZED RESULT DISPLAY
                   * Unlike clone-1 which uses a checkerboard for transparency,
                   * we just show the colorized image on a clean background.
                   * The "wow factor" comes from the vivid colors against the
                   * user's expectation of a B&W photo — no special background
                   * pattern needed. The result speaks for itself.
                   */
                  <div className="w-full h-full bg-muted/10 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={colorizedImageResultUrl}
                      alt="AI-colorized photo with realistic colors"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  /**
                   * EMPTY RESULT PLACEHOLDER
                   * Before processing, we show a subtle prompt with the Palette
                   * icon to reinforce what's about to happen. The processing
                   * state shows "Adding color..." which is more exciting and
                   * specific than "Processing..."
                   */
                  <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center gap-3 p-6">
                    {isCurrentlyProcessing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground font-medium">
                          Adding color to your photo...
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          This usually takes 5-10 seconds
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                        <Palette className="w-10 h-10" />
                        <p className="text-sm">Colorized result will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!colorizedImageResultUrl && !isCurrentlyProcessing && (
              <Button
                size="lg"
                onClick={processImageColorization}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200"
              >
                <Palette className="w-5 h-5 mr-2" />
                Colorize Photo
              </Button>
            )}

            {colorizedImageResultUrl && (
              <>
                <Button
                  size="lg"
                  onClick={downloadColorizedImage}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Colorized Photo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetToInitialState}
                  className="px-8 py-6 text-lg rounded-xl"
                >
                  Colorize Another Photo
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
