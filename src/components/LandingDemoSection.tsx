/**
 * LandingDemoSection — Before/After showcase for the landing page.
 * 
 * WHY: Showing a visual before/after is the single most convincing element
 * for any AI image tool. It's proof that the tool works, without requiring
 * the visitor to sign up first. This section should be customized per clone
 * with real examples of the specific tool's output.
 * 
 * TEMPLATE VERSION:
 * This template version shows a placeholder with instructions to add
 * product-specific demo images. In each clone, replace the placeholder
 * with actual before/after images from that tool.
 */

import { PRODUCT_CONFIG } from "@/lib/config";

export function LandingDemoSection() {
  return (
    <section className="py-24 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          See It In <span className="gradient-text">Action</span>
        </h2>
        <p className="text-text-secondary text-center mb-16 max-w-2xl mx-auto">
          Professional results in seconds, powered by state-of-the-art AI models.
        </p>

        {/* 
          Demo placeholder — replace with actual before/after images per clone.
          
          CUSTOMIZATION INSTRUCTIONS:
          1. Add before/after images to the public/ directory
          2. Replace the placeholder divs below with <img> tags
          3. Optionally add a slider interaction for before/after comparison
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="glass-card p-6">
            <p className="text-sm text-text-muted mb-3 text-center font-medium uppercase tracking-wider">
              Before
            </p>
            <div className="aspect-square rounded-xl bg-surface-secondary flex items-center justify-center">
              <div className="text-center px-8">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-text-muted/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-text-muted text-sm">
                  Add a &quot;before&quot; demo image to{" "}
                  <code className="text-brand-400">public/demo-before.png</code>
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <p className="text-sm text-brand-400 mb-3 text-center font-medium uppercase tracking-wider">
              After — {PRODUCT_CONFIG.name}
            </p>
            <div className="aspect-square rounded-xl bg-surface-secondary flex items-center justify-center">
              <div className="text-center px-8">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-brand-400/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p className="text-text-muted text-sm">
                  Add an &quot;after&quot; demo image to{" "}
                  <code className="text-brand-400">public/demo-after.png</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
