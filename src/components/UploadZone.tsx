/**
 * UploadZone — Drag-and-drop file upload component for AI processing.
 * 
 * WHY THIS COMPONENT:
 * Most of our AI tool clones accept image input (background remover, upscaler,
 * QR art, etc.). This component provides a polished drag-and-drop upload
 * experience that:
 *   1. Accepts drag-and-drop OR click-to-browse (covers all user preferences)
 *   2. Shows a preview of the uploaded file before processing
 *   3. Validates file type and size before sending to the API
 *   4. Has loading states during upload/processing
 * 
 * DESIGN DECISIONS:
 * - Dashed border with hover effect — universal "drop zone" indicator
 * - Large click target — the entire zone is clickable, not just a small button
 * - File size limit displayed — prevents confused users from uploading 50MB files
 * - Preview shown inside the zone after upload — user confirms it's the right file
 * 
 * REUSABILITY:
 * The component accepts callbacks for the upload result and is agnostic about
 * what happens after upload. The parent component (dashboard page) handles
 * calling the generation API.
 */

"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

/**
 * Maximum file size in bytes — 10MB.
 * WHY 10MB: Large enough for high-quality photos (our primary use case),
 * small enough to prevent abuse and keep API response times reasonable.
 * fal.ai also has its own limits, so this pre-validates client-side.
 */
const MAXIMUM_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Accepted file types — images only for the template.
 * For text-based tools (AI writing, code generation), this would be different.
 * Configure per-clone if needed.
 */
const ACCEPTED_IMAGE_MIME_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

interface UploadZoneProps {
  /**
   * Called when a file is successfully selected/dropped and validated.
   * The parent component receives the File object to send to the API.
   */
  readonly onFileSelected: (selectedFile: File) => void;

  /**
   * Whether processing is in progress. When true, the upload zone shows
   * a loading state and prevents additional uploads.
   */
  readonly isProcessing: boolean;

  /**
   * Optional: override accepted file types for non-image tools.
   */
  readonly acceptedMimeTypes?: Record<string, string[]>;
}

export function UploadZone({
  onFileSelected,
  isProcessing,
  acceptedMimeTypes = ACCEPTED_IMAGE_MIME_TYPES,
}: UploadZoneProps) {
  const [uploadedFilePreviewUrl, setUploadedFilePreviewUrl] = useState<
    string | null
  >(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(
    null
  );

  /**
   * onDrop callback — fires when the user drops a file or selects via dialog.
   * 
   * WHY useCallback: This function is passed as a prop to useDropzone.
   * Without useCallback, it would be recreated on every render, causing
   * useDropzone to re-initialize its event listeners unnecessarily.
   */
  const handleFileDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFileValidationError(null);

      if (acceptedFiles.length === 0) {
        setFileValidationError(
          "Invalid file type. Please upload a PNG, JPEG, or WebP image."
        );
        return;
      }

      const droppedFile = acceptedFiles[0];

      /**
       * Client-side size validation — catches oversized files before
       * they're sent to the server, saving bandwidth and time.
       */
      if (droppedFile.size > MAXIMUM_FILE_SIZE_BYTES) {
        setFileValidationError(
          `File too large (${(droppedFile.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 10MB.`
        );
        return;
      }

      /**
       * Create a preview URL using URL.createObjectURL.
       * WHY not FileReader: createObjectURL is synchronous and more performant
       * for displaying previews. It creates a blob URL that the browser can
       * render directly in an <img> tag.
       */
      const previewUrl = URL.createObjectURL(droppedFile);
      setUploadedFilePreviewUrl(previewUrl);
      setUploadedFileName(droppedFile.name);
      onFileSelected(droppedFile);
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: acceptedMimeTypes,
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        {...getRootProps()}
        className={`glass-card p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-brand-400 bg-brand-500/10 scale-[1.02]"
            : "hover:border-white/20 hover:bg-white/[0.03]"
        } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          /**
           * Processing state — shows a spinner and status text.
           * The spinner is a simple CSS animation (Tailwind's animate-spin).
           */
          <div className="py-8">
            <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Processing your file...</p>
          </div>
        ) : uploadedFilePreviewUrl ? (
          /**
           * Preview state — shows the uploaded image with its filename.
           * User can click again to replace the file.
           */
          <div className="py-4">
            <img
              src={uploadedFilePreviewUrl}
              alt="Upload preview"
              className="max-h-48 mx-auto rounded-lg mb-4 object-contain"
            />
            <p className="text-sm text-text-secondary">{uploadedFileName}</p>
            <p className="text-xs text-text-muted mt-1">
              Click or drop to replace
            </p>
          </div>
        ) : (
          /**
           * Empty state — shows upload instructions.
           * Icon + text clearly communicate what's expected.
           */
          <div className="py-8">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg text-text-secondary mb-2">
              {isDragActive
                ? "Drop your file here"
                : "Drag & drop your image here"}
            </p>
            <p className="text-sm text-text-muted">
              or click to browse — PNG, JPEG, WebP up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Validation error message */}
      {fileValidationError && (
        <p className="mt-3 text-sm text-red-400 text-center">
          {fileValidationError}
        </p>
      )}
    </div>
  );
}
