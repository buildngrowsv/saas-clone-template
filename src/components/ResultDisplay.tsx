/**
 * ResultDisplay — Shows the before/after result of AI processing.
 * 
 * WHY THIS COMPONENT:
 * The "before and after" comparison is the money shot for any AI image tool.
 * It's what makes users go "wow, I need this" and drives conversions.
 * This component shows:
 *   1. Side-by-side comparison of original and processed images
 *   2. Download button for the processed result
 *   3. "Process Another" button to encourage additional usage
 * 
 * DESIGN DECISIONS:
 * - Side by side on desktop, stacked on mobile — responsive layout
 * - Subtle labels ("Original" / "Result") so users know which is which
 * - Download button is prominent — this is the moment of highest satisfaction,
 *   and also the moment to show upgrade prompts (handled by parent)
 * - Glassmorphism card matches the rest of the UI
 */

"use client";

interface ResultDisplayProps {
  /**
   * URL of the original uploaded image (from createObjectURL or a data URL).
   */
  readonly originalImageUrl: string;

  /**
   * URL of the AI-processed result image (from fal.ai CDN).
   */
  readonly processedResultUrl: string;

  /**
   * Called when user clicks "Process Another" — resets the upload state.
   */
  readonly onProcessAnother: () => void;

  /**
   * Remaining credits after this generation — shown to encourage upgrades
   * when running low. -1 means unlimited (Pro tier).
   */
  readonly remainingCreditsAfterGeneration: number;
}

export function ResultDisplay({
  originalImageUrl,
  processedResultUrl,
  onProcessAnother,
  remainingCreditsAfterGeneration,
}: ResultDisplayProps) {
  /**
   * handleDownloadResult — Triggers a browser download of the processed image.
   * 
   * WHY fetch + blob instead of just <a href download>:
   * Cross-origin images (from fal.ai CDN) can't be downloaded directly via
   * the download attribute due to CORS restrictions. By fetching the image
   * as a blob first and creating a local URL, we bypass this limitation.
   * This is a well-known pattern for downloading cross-origin resources.
   */
  const handleDownloadResult = async () => {
    try {
      const imageResponse = await fetch(processedResultUrl);
      const imageBlob = await imageResponse.blob();
      const downloadUrl = URL.createObjectURL(imageBlob);

      const downloadAnchorElement = document.createElement("a");
      downloadAnchorElement.href = downloadUrl;
      downloadAnchorElement.download = `processed-result-${Date.now()}.png`;
      document.body.appendChild(downloadAnchorElement);
      downloadAnchorElement.click();
      document.body.removeChild(downloadAnchorElement);
      URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      console.error("Failed to download result:", downloadError);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass-card p-8">
        {/* Before/After comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Original image */}
          <div>
            <p className="text-sm text-text-muted mb-3 text-center font-medium uppercase tracking-wider">
              Original
            </p>
            <div className="rounded-xl overflow-hidden bg-surface-secondary">
              <img
                src={originalImageUrl}
                alt="Original uploaded image"
                className="w-full h-auto object-contain max-h-80"
              />
            </div>
          </div>

          {/* Processed result */}
          <div>
            <p className="text-sm text-brand-400 mb-3 text-center font-medium uppercase tracking-wider">
              Result
            </p>
            <div className="rounded-xl overflow-hidden bg-surface-secondary">
              <img
                src={processedResultUrl}
                alt="AI-processed result"
                className="w-full h-auto object-contain max-h-80"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleDownloadResult}
            className="px-8 py-3 bg-gradient-to-r from-brand-500 to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:from-brand-400 hover:to-purple-400"
          >
            Download Result
          </button>

          <button
            onClick={onProcessAnother}
            className="px-8 py-3 border border-white/10 hover:border-white/20 text-text-secondary hover:text-text-primary rounded-xl transition-all duration-200"
          >
            Process Another
          </button>
        </div>

        {/* 
          Credits remaining indicator — shows how many uses are left.
          This creates natural upgrade pressure when credits are low.
          For unlimited (Pro) users, we show "Unlimited" as a reward/validation.
        */}
        <div className="mt-6 text-center">
          {remainingCreditsAfterGeneration === -1 ? (
            <p className="text-sm text-text-muted">
              Unlimited uses remaining on your Pro plan
            </p>
          ) : remainingCreditsAfterGeneration <= 3 ? (
            <p className="text-sm text-amber-400">
              {remainingCreditsAfterGeneration} uses remaining —{" "}
              <a href="#pricing" className="underline hover:text-amber-300">
                Upgrade for more
              </a>
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              {remainingCreditsAfterGeneration} uses remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
