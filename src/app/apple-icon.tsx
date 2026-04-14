/**
 * apple-icon.tsx — Dynamic Apple Touch Icon (180×180 PNG)
 *
 * WHY: iOS "Add to Home Screen" shows this icon. Without it, Safari takes a
 * screenshot of the page, which looks unprofessional. This generates a clean
 * branded icon on-demand using Next.js ImageResponse (CDN-cached by Vercel).
 *
 * BRANDING: Uses a dark background with gradient accent — matches the fleet's
 * shared dark-mode design language. The "AI" text is generic enough for any
 * clone; customize per-product by changing the emoji and text.
 */

import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export const runtime = "edge";

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(124,58,237,0.25) 0%, transparent 60%)",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: 4,
            lineHeight: 1,
          }}
        >
          ✦
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-1px",
            background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          AI
        </div>
      </div>
    ),
    { ...size }
  );
}
