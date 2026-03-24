/**
 * Dashboard Page — The main tool interface where authenticated users do the work.
 * 
 * WHY THIS PAGE:
 * After signing in, users land here. This is where they:
 *   1. Upload their file
 *   2. See the processing result
 *   3. Download the output
 *   4. Track their credit usage
 * 
 * DESIGN PHILOSOPHY:
 * Keep it dead simple. One clear action: upload → process → download.
 * No unnecessary navigation, no complex multi-step wizards.
 * AI tool users want to get in, do the thing, and get out.
 * 
 * ARCHITECTURE:
 * This is a client component because it manages upload state, API calls,
 * and real-time UI updates. Server components can't handle this interactivity.
 */

"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useCallback } from "react";
import { PRODUCT_CONFIG } from "@/lib/config";
import { UploadZone } from "@/components/UploadZone";
import { ResultDisplay } from "@/components/ResultDisplay";

/**
 * DashboardState tracks the progression through the tool flow:
 * idle → processing → result (→ idle again for "Process Another")
 */
type DashboardViewState = "idle" | "processing" | "result";

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();

  /**
   * View state management — controls which UI is shown.
   * The flow is linear: idle → processing → result → idle (loop)
   */
  const [currentViewState, setCurrentViewState] =
    useState<DashboardViewState>("idle");

  /**
   * File and result state — tracks the uploaded file and processing result.
   */
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(
    null
  );
  const [processedResultUrl, setProcessedResultUrl] = useState<string | null>(
    null
  );
  const [remainingCreditsCount, setRemainingCreditsCount] = useState<number>(0);
  const [processingErrorMessage, setProcessingErrorMessage] = useState<
    string | null
  >(null);

  /**
   * Redirect unauthenticated users to sign in.
   * WHY check here instead of middleware: This gives us more control over
   * the redirect destination and allows showing a loading state while
   * the session is being fetched.
   */
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    signIn("google", { callbackUrl: "/dashboard" });
    return null;
  }

  /**
   * handleFileSelected — Called when the user drops/selects a file in the UploadZone.
   * Stores the file and creates a preview URL for the "before" image.
   */
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setOriginalPreviewUrl(URL.createObjectURL(file));
    setProcessingErrorMessage(null);
  };

  /**
   * handleStartProcessing — Calls our generation API with the uploaded file.
   * 
   * FLOW:
   * 1. Convert the file to a base64 data URL (fal.ai accepts these)
   * 2. POST to /api/generate with the data URL
   * 3. Handle the response (success: show result, error: show message)
   * 
   * WHY base64 data URL:
   * For files under ~5MB, sending as a data URL is simpler than uploading
   * to fal.ai storage first. For larger files, you'd want to use fal.ai's
   * upload endpoint to get a storage URL, then pass that to the model.
   * Since we cap uploads at 10MB and most images are 1-3MB, data URLs work fine.
   */
  const handleStartProcessing = useCallback(async () => {
    if (!selectedFile) return;

    setCurrentViewState("processing");
    setProcessingErrorMessage(null);

    try {
      /**
       * Convert file to base64 data URL.
       * FileReader.readAsDataURL produces a string like:
       * "data:image/png;base64,iVBORw0KGgo..."
       * which fal.ai can consume directly as an image_url input.
       */
      const fileAsDataUrl = await new Promise<string>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.onerror = reject;
        fileReader.readAsDataURL(selectedFile);
      });

      const generationResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: fileAsDataUrl }),
      });

      const generationResult = await generationResponse.json();

      if (!generationResponse.ok) {
        setProcessingErrorMessage(
          generationResult.error || "Processing failed. Please try again."
        );
        setCurrentViewState("idle");
        return;
      }

      setProcessedResultUrl(generationResult.resultUrl);
      setRemainingCreditsCount(generationResult.remainingCredits);
      setCurrentViewState("result");
    } catch (fetchError) {
      console.error("Generation request failed:", fetchError);
      setProcessingErrorMessage(
        "Network error. Please check your connection and try again."
      );
      setCurrentViewState("idle");
    }
  }, [selectedFile]);

  /**
   * handleProcessAnother — Resets all state to allow another upload.
   * Revokes the old preview URL to free memory (createObjectURL URLs
   * persist until explicitly revoked or the page unloads).
   */
  const handleProcessAnother = () => {
    if (originalPreviewUrl) {
      URL.revokeObjectURL(originalPreviewUrl);
    }
    setSelectedFile(null);
    setOriginalPreviewUrl(null);
    setProcessedResultUrl(null);
    setProcessingErrorMessage(null);
    setCurrentViewState("idle");
  };

  return (
    <div className="min-h-screen">
      {/* Dashboard navbar */}
      <nav className="border-b border-white/5 bg-surface-primary/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold gradient-text">
            {PRODUCT_CONFIG.name}
          </a>

          <div className="flex items-center gap-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-text-secondary hidden sm:inline">
              {session.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-center mb-2">
          {PRODUCT_CONFIG.tagline}
        </h1>
        <p className="text-text-secondary text-center mb-12">
          Upload your file below to get started.
        </p>

        {/* Error message display */}
        {processingErrorMessage && (
          <div className="max-w-lg mx-auto mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {processingErrorMessage}
          </div>
        )}

        {/* 
          Conditional rendering based on view state.
          idle: show upload zone + process button
          processing: show upload zone in processing state
          result: show before/after result display
        */}
        {currentViewState === "result" && processedResultUrl && originalPreviewUrl ? (
          <ResultDisplay
            originalImageUrl={originalPreviewUrl}
            processedResultUrl={processedResultUrl}
            onProcessAnother={handleProcessAnother}
            remainingCreditsAfterGeneration={remainingCreditsCount}
          />
        ) : (
          <div>
            <UploadZone
              onFileSelected={handleFileSelected}
              isProcessing={currentViewState === "processing"}
            />

            {/* Process button — only shown after file is selected */}
            {selectedFile && currentViewState === "idle" && (
              <div className="text-center mt-8">
                <button
                  onClick={handleStartProcessing}
                  className="px-10 py-4 bg-gradient-to-r from-brand-500 to-purple-500 text-white font-semibold rounded-xl text-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:from-brand-400 hover:to-purple-400"
                >
                  Process Now
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
