"use client";

/**
 * IMAGE UPSCALE DROPZONE COMPONENT — ImageUpscaleDropzone
 *
 * This is the core interactive component of the UpscaleAI tool.
 * It handles the entire user flow from image selection to upscaled result download:
 *
 * 1. UPLOAD: Drag-and-drop or click-to-select file input
 * 2. PREVIEW: Shows the original image immediately after selection
 * 3. SCALE SELECT: User chooses 2x, 4x, or 8x upscale factor
 * 4. PROCESS: Sends the image + scale factor to our /api/upscale endpoint
 * 5. RESULT: Displays before/after comparison of original vs upscaled
 * 6. DOWNLOAD: One-click download of the upscaled image
 *
 * KEY DIFFERENCE FROM BG REMOVER (Clone #1):
 * The background remover is a one-click operation (upload → remove → download).
 * The upscaler adds a SCALE SELECTION step between upload and processing,
 * because the user needs to choose how much they want to enlarge. This
 * makes the component slightly more complex but much more useful — users
 * can control the output size based on their specific needs.
 *
 * WHY THIS IS A SINGLE COMPONENT (not split into sub-components):
 * The upload → scale-select → process → result flow is tightly coupled state-wise.
 * Splitting it would require prop drilling or context for the image state,
 * scale state, processing state, and result state. Since this is the ONLY
 * interactive section of the landing page, keeping it unified is simpler and
 * more maintainable. If we add features like batch processing or comparison
 * slider, we'd extract sub-components at that point.
 *
 * IMPORTANT TECHNICAL NOTE ON FILE HANDLING:
 * We use FormData to send the image as multipart/form-data to the API.
 * The scale factor is included as a separate field in the FormData.
 * We also create local object URLs (URL.createObjectURL) for instant
 * preview without waiting for upload, which is critical for perceived
 * performance — users see their image immediately even on slow connections.
 *
 * SCALE FACTOR OPTIONS (2x, 4x, 8x):
 * These are industry-standard upscale factors used by Real-ESRGAN, Topaz
 * Gigapixel, and Let's Enhance. We offer three options because:
 * - 2x: Good for slightly improving resolution (e.g., social media images)
 * - 4x: The sweet spot for most use cases (e.g., print-quality enhancement)
 * - 8x: Maximum enhancement for very low-res source images
 * Higher factors (16x+) produce diminishing returns and artifacts, so we
 * cap at 8x to maintain quality expectations.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  Download,
  Loader2,
  Image as ImageIcon,
  X,
  ArrowUpCircle,
  AlertCircle,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Allowed image MIME types for upload.
 * We support JPEG, PNG, and WebP because:
 * - JPEG: Most common photo format (phone cameras, downloads)
 * - PNG: Lossless format, good for graphics and screenshots
 * - WebP: Modern format with good compression, growing usage
 *
 * We intentionally exclude GIF (animated images don't upscale well),
 * SVG (vector, doesn't need upscaling), and TIFF (too large for web upload).
 * BMP is also excluded because it's uncompressed and nobody uses it on the web.
 */
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Maximum file size: 10MB
 * Upscaling is computationally expensive (especially at 8x), and larger
 * source images produce proportionally larger outputs (an 8x upscale of
 * a 5MB image could produce a 50MB+ result). We keep the limit at 10MB
 * to balance user needs with server processing costs and response times.
 */
const MAXIMUM_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Available upscale factors — the core feature differentiator of this tool.
 *
 * Each option includes:
 * - value: The numeric scale factor sent to the API
 * - label: Display text shown in the selector button
 * - description: Brief explanation of the use case for this scale
 *
 * These are defined as a typed constant array to enable iteration in the
 * UI while maintaining TypeScript safety. The order (2x → 4x → 8x) is
 * deliberate — we present them smallest-to-largest so users naturally
 * start with the most common option (2x) and can upgrade if needed.
 *
 * WHY NOT 1x? A 1x "upscale" would just be image enhancement without
 * enlargement. While useful, it muddies the value prop. Users come here
 * to ENLARGE images, not just sharpen them. We might add a "enhance only"
 * option later as a separate feature.
 */
const UPSCALE_FACTOR_OPTIONS = [
  {
    value: 2,
    label: "2x",
    description: "Double resolution",
  },
  {
    value: 4,
    label: "4x",
    description: "Quadruple resolution",
  },
  {
    value: 8,
    label: "8x",
    description: "Maximum enhancement",
  },
] as const;

/**
 * Type for the upscale factor value — derived from the options array.
 * This ensures we can only pass valid scale factors to the API,
 * preventing bugs where an invalid factor like 3x or 16x is sent.
 */
type UpscaleFactorValue = (typeof UPSCALE_FACTOR_OPTIONS)[number]["value"];

/**
 * ImageUpscaleDropzone — Main interactive component
 *
 * Renders a drag-and-drop zone with scale selector that handles the full
 * image upscaling flow. Used in the landing page (src/app/page.tsx) as
 * the primary call-to-action.
 *
 * State machine:
 * IDLE → (file selected) → PREVIEW + SCALE_SELECT → (upscale clicked) → PROCESSING → RESULT
 *                                                                                    ↓
 *                                                                               (reset) → IDLE
 */
export default function ImageUpscaleDropzone() {
  /**
   * STATE MANAGEMENT
   *
   * We track seven pieces of state (two more than clone-1 because of
   * the scale selector and the processing status message):
   *
   * - originalImagePreviewUrl: Object URL for the uploaded image (instant preview)
   * - upscaledImageResultUrl: Object URL for the result from the API
   * - isCurrentlyProcessingUpscale: Loading state while the API processes
   * - imageUpscaleProcessingStatusMessage: Progress text shown during processing
   * - currentErrorMessage: Any error from validation or API failure
   * - selectedImageFile: The actual File object needed for FormData upload
   * - selectedUpscaleFactorValue: The chosen scale (2, 4, or 8)
   *
   * The processing status message is new vs clone-1 because upscaling takes
   * longer than bg removal (8-15s vs 3-5s), so we need to communicate progress
   * to prevent users from thinking the tool is stuck.
   */
  const [originalImagePreviewUrl, setOriginalImagePreviewUrl] = useState<string | null>(null);
  const [upscaledImageResultUrl, setUpscaledImageResultUrl] = useState<string | null>(null);
  const [isCurrentlyProcessingUpscale, setIsCurrentlyProcessingUpscale] = useState(false);
  const [imageUpscaleProcessingStatusMessage, setImageUpscaleProcessingStatusMessage] = useState<string>("");
  const [currentErrorMessage, setCurrentErrorMessage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedUpscaleFactorValue, setSelectedUpscaleFactorValue] = useState<UpscaleFactorValue>(2);
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
    setUpscaledImageResultUrl(null);
    setImageUpscaleProcessingStatusMessage("");

    /* Validate MIME type — reject unsupported formats with a helpful message */
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      setCurrentErrorMessage(
        "Unsupported file format. Please upload a JPEG, PNG, or WebP image."
      );
      return;
    }

    /* Validate file size — the 10MB limit protects both the user (upload time)
       and our API (processing time and cost per request). Upscaling at 8x can
       be very compute-intensive, so we need to keep source images reasonable. */
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
     * IMPORTANT: We should revoke old URLs to prevent memory leaks,
     * but for a single-image tool this is negligible. If we add
     * batch processing, we'd need to track and revoke URLs.
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
   * visual drag-active state so the dropzone highlights.
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
   * Multi-file batch processing would be a Pro feature in the future.
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
   * processImageUpscale — Sends the image to our API for upscaling
   *
   * This is the core business logic: send the image + scale factor to
   * /api/upscale, which proxies to fal.ai's Real-ESRGAN model (or similar),
   * and display the upscaled result.
   *
   * We use FormData for multipart upload because image processing APIs
   * expect binary data, not base64 strings. The scale factor is included
   * as a separate form field.
   *
   * Error handling covers:
   * - Network failures (fetch throws)
   * - API errors (non-200 response with error message)
   * - Rate limit exceeded (429 response)
   *
   * The loading state (isCurrentlyProcessingUpscale) shows a spinner overlay
   * with a status message. Upscaling takes longer than bg removal (8-15s),
   * so we show progress messages to keep users engaged and prevent abandonment.
   *
   * Called from: the "Upscale Image" button click handler
   * Depends on: selectedImageFile, selectedUpscaleFactorValue
   */
  const processImageUpscale = useCallback(async () => {
    if (!selectedImageFile) return;

    setIsCurrentlyProcessingUpscale(true);
    setCurrentErrorMessage(null);
    setImageUpscaleProcessingStatusMessage("Uploading image...");

    try {
      /**
       * Build the FormData with the image file and scale factor.
       * The key "image_file" matches what our API route expects.
       * The key "scale" tells the API which upscale factor to use.
       *
       * We use FormData because:
       * 1. It handles multipart encoding automatically
       * 2. It streams the file efficiently (no base64 bloat)
       * 3. It's the standard for file uploads in web APIs
       */
      const uploadFormData = new FormData();
      uploadFormData.append("image_file", selectedImageFile);
      uploadFormData.append("scale", String(selectedUpscaleFactorValue));

      /**
       * Update status message after a delay to show progress.
       * This is a UX technique: showing changing text during a long
       * operation makes users perceive the wait as shorter. We change
       * the message after 2s and 5s to maintain engagement.
       */
      const statusUpdateTimerTwo = setTimeout(() => {
        setImageUpscaleProcessingStatusMessage("AI is enhancing details...");
      }, 2000);
      const statusUpdateTimerFive = setTimeout(() => {
        setImageUpscaleProcessingStatusMessage("Generating high-resolution output...");
      }, 5000);

      const apiResponse = await fetch("/api/upscale", {
        method: "POST",
        body: uploadFormData,
      });

      /* Clear the status update timers since we got a response */
      clearTimeout(statusUpdateTimerTwo);
      clearTimeout(statusUpdateTimerFive);

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
          errorResponseBody.error || "Image upscaling failed. Please try again."
        );
        return;
      }

      /**
       * The API returns the upscaled image as a binary PNG/JPEG blob.
       * We create an object URL from the blob for display in an <img> tag.
       * This is the same pattern as the preview — fast and memory-efficient.
       */
      const resultImageBlob = await apiResponse.blob();
      const resultObjectUrl = URL.createObjectURL(resultImageBlob);
      setUpscaledImageResultUrl(resultObjectUrl);
      setImageUpscaleProcessingStatusMessage("");
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
      setIsCurrentlyProcessingUpscale(false);
    }
  }, [selectedImageFile, selectedUpscaleFactorValue]);

  /**
   * downloadUpscaledImage — Triggers a browser download of the result
   *
   * Creates a temporary <a> element with the download attribute to trigger
   * a save dialog. This is the standard way to programmatically download
   * a blob URL in modern browsers. The filename includes the scale factor
   * and a timestamp to be descriptive and avoid conflicts if the user
   * processes multiple images.
   */
  const downloadUpscaledImage = useCallback(() => {
    if (!upscaledImageResultUrl) return;

    const temporaryDownloadLink = document.createElement("a");
    temporaryDownloadLink.href = upscaledImageResultUrl;
    temporaryDownloadLink.download = `upscaled-${selectedUpscaleFactorValue}x-${Date.now()}.png`;
    document.body.appendChild(temporaryDownloadLink);
    temporaryDownloadLink.click();
    document.body.removeChild(temporaryDownloadLink);
  }, [upscaledImageResultUrl, selectedUpscaleFactorValue]);

  /**
   * resetToInitialState — Clears everything and returns to the upload view
   *
   * Revokes object URLs to free memory, then resets all state including
   * the scale factor back to the default (2x). Called when the user
   * clicks the "X" / "Start Over" button to process a different image.
   */
  const resetToInitialState = useCallback(() => {
    if (originalImagePreviewUrl) URL.revokeObjectURL(originalImagePreviewUrl);
    if (upscaledImageResultUrl) URL.revokeObjectURL(upscaledImageResultUrl);
    setOriginalImagePreviewUrl(null);
    setUpscaledImageResultUrl(null);
    setSelectedImageFile(null);
    setCurrentErrorMessage(null);
    setIsCurrentlyProcessingUpscale(false);
    setImageUpscaleProcessingStatusMessage("");
    setSelectedUpscaleFactorValue(2);
  }, [originalImagePreviewUrl, upscaledImageResultUrl]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/**
       * EMPTY STATE — The dropzone when no image is selected
       *
       * Shows a large, inviting drag-and-drop area with clear instructions.
       * The dashed border and icon are the universal "drop here" pattern.
       * We highlight it with a teal border when the user is actively
       * dragging a file over it to confirm they're in the right place.
       *
       * The ArrowUpCircle icon reinforces the "upscale" concept even in
       * the empty state, keeping the messaging consistent throughout.
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
            aria-label="Upload image for AI upscaling"
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
                Drop your image here
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
       * The error message is always specific (not generic) because we
       * set it with context about what went wrong.
       */}
      {currentErrorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{currentErrorMessage}</p>
        </div>
      )}

      {/**
       * IMAGE PREVIEW + SCALE SELECTOR + RESULT STATE
       *
       * Once an image is selected, we show:
       * 1. The original image preview (left/top)
       * 2. A scale factor selector (2x / 4x / 8x buttons)
       * 3. The upscaled result (right/bottom) — or a placeholder if not yet processed
       *
       * The before/after layout is key for conversion — users need to see
       * the transformation to understand the value and be willing to pay.
       * For upscaling, this comparison is even MORE important than for
       * bg removal because the improvement is in detail/sharpness which
       * requires side-by-side viewing to appreciate.
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

          {/**
           * SCALE FACTOR SELECTOR — The key interactive element unique to upscaling
           *
           * Three pill-style buttons (2x, 4x, 8x) that the user clicks to choose
           * their desired scale. The selected option gets the primary color treatment
           * while unselected options are subtle/muted.
           *
           * This selector is shown BEFORE processing and can be changed BEFORE
           * clicking "Upscale Image." After processing, it shows the factor that
           * was used but is disabled (can't change without starting over).
           *
           * WHY PILL BUTTONS (not a dropdown)?
           * - Only 3 options — dropdown would be overkill
           * - All options visible at once — user can compare at a glance
           * - Pill buttons feel more interactive and "app-like"
           * - Mobile-friendly — easy tap targets
           */}
          {!upscaledImageResultUrl && (
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Select upscale factor:
              </span>
              <div className="flex gap-2">
                {UPSCALE_FACTOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedUpscaleFactorValue(option.value)}
                    disabled={isCurrentlyProcessingUpscale}
                    className={`
                      px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        selectedUpscaleFactorValue === option.value
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }
                    `}
                    aria-label={`Upscale ${option.label} — ${option.description}`}
                  >
                    <span className="text-lg font-bold">{option.label}</span>
                    <span className="block text-xs opacity-75 mt-0.5">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Before/After image comparison grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ORIGINAL IMAGE — Left side */}
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
                  alt="Original uploaded image before upscaling"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>

            {/* UPSCALED RESULT IMAGE — Right side */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary uppercase tracking-wider">
                  Upscaled {selectedUpscaleFactorValue}x
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border aspect-square flex items-center justify-center">
                {upscaledImageResultUrl ? (
                  /**
                   * RESULT DISPLAY — Shows the upscaled image
                   *
                   * Unlike the bg-remover which uses a checkerboard pattern
                   * (to show transparency), we use a clean background because
                   * upscaled images are opaque. The comparison-grid-bg could
                   * be used to help users see detail improvement, but a clean
                   * background keeps the focus on the image quality itself.
                   */
                  <div className="w-full h-full bg-muted/10 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={upscaledImageResultUrl}
                      alt={`Image upscaled ${selectedUpscaleFactorValue}x with AI enhancement`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  /**
                   * EMPTY RESULT PLACEHOLDER / PROCESSING STATE
                   *
                   * Before processing: shows a subtle prompt to click "Upscale Image."
                   * During processing: shows a spinner with a changing status message.
                   *
                   * The status messages change over time (Uploading → Enhancing → Generating)
                   * to keep users engaged during the 8-15 second processing time.
                   * This is longer than bg removal, so we need better progress feedback.
                   */
                  <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center gap-3 p-6">
                    {isCurrentlyProcessingUpscale ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground font-medium">
                          {imageUpscaleProcessingStatusMessage || "Processing..."}
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          Upscaling to {selectedUpscaleFactorValue}x — this usually takes 8-15 seconds
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                        <Maximize className="w-10 h-10" />
                        <p className="text-sm">Upscaled result will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS — Upscale or Download depending on state */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!upscaledImageResultUrl && !isCurrentlyProcessingUpscale && (
              /**
               * PRIMARY CTA — "Upscale Image" button
               *
               * This is the main action button that triggers the upscaling.
               * It's styled with the primary color and a large touch target
               * for mobile users. The ArrowUpCircle icon reinforces the
               * "upscale" action at a glance.
               *
               * The button text includes the selected scale factor (e.g.,
               * "Upscale Image 4x") so users know exactly what will happen.
               */
              <Button
                size="lg"
                onClick={processImageUpscale}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200"
              >
                <ArrowUpCircle className="w-5 h-5 mr-2" />
                Upscale Image {selectedUpscaleFactorValue}x
              </Button>
            )}

            {upscaledImageResultUrl && (
              <>
                {/**
                 * DOWNLOAD BUTTON — Appears after successful upscaling
                 *
                 * Primary action post-processing. The filename includes the
                 * scale factor so users can identify which version is which
                 * if they process the same image at different scales.
                 */}
                <Button
                  size="lg"
                  onClick={downloadUpscaledImage}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Upscaled Image
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetToInitialState}
                  className="px-8 py-6 text-lg rounded-xl"
                >
                  Upscale Another Image
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
