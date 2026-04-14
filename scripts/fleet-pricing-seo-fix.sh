#!/usr/bin/env bash
# ==============================================================================
# fleet-pricing-seo-fix.sh — Add SEO metadata to pricing pages across the fleet
#
# WHY: 25/41 clones have pricing pages but NO metadata exports (title, description,
# canonical URL, OpenGraph). Since most pricing pages are "use client" components,
# they CANNOT export metadata directly (Next.js restriction). The fix is to add a
# layout.tsx in each pricing directory that exports the metadata.
#
# This gives search engines proper title/description for pricing pages without
# touching the existing page.tsx files.
#
# USAGE:
#   ./fleet-pricing-seo-fix.sh          # Dry run — shows what would be created
#   ./fleet-pricing-seo-fix.sh --apply  # Create files, commit, and push
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_DIR="/Users/ak/UserRoot/Github"
DRY_RUN=true
CREATED=0
SKIPPED=0
FAILED=0

if [[ "${1:-}" == "--apply" ]]; then
  DRY_RUN=false
fi

# Product name map — human-readable names for each clone
# Derived from landing pages, brand names, and config files
declare -A PRODUCT_NAMES=(
  ["ai-animated-photo-generator-web"]="AnimateMe AI"
  ["ai-cartoon-generator"]="CartoonForge AI"
  ["ai-chart-from-data"]="ChartForge AI"
  ["ai-chart-generator"]="ChartForge AI"
  ["ai-coloring-page-generator"]="ColorBook AI"
  ["ai-face-swap"]="FaceSwap AI"
  ["ai-food-photography-generator"]="FoodShot AI"
  ["ai-hairstyle-generator"]="HairStyle AI"
  ["ai-icon-generator"]="IconForge AI"
  ["ai-interior-design"]="RoomVision AI"
  ["ai-logo-generator"]="LogoForge AI"
  ["ai-meme-generator"]="MemeForge AI"
  ["ai-mockup-generator"]="MockupForge AI"
  ["ai-pet-portrait"]="PetPortrait AI"
  ["ai-photo-colorizer"]="ColorizeAI"
  ["ai-photo-restorer"]="RestoreAI"
  ["ai-presentation-maker"]="SlideForge AI"
  ["ai-professional-headshots"]="HeadshotPro AI"
  ["ai-qr-code-art"]="QR Art AI"
  ["ai-resume-photo-generator"]="ResumePhoto AI"
  ["ai-sketch-to-image"]="SketchToImage AI"
  ["ai-storybook-illustrator"]="StoryBook AI"
  ["ai-text-to-speech"]="VoiceForge AI"
  ["ai-vector-illustration"]="VectorForge AI"
  ["ai-yearbook-photo-generator"]="Yearbook AI"
)

# Short description map for each product's pricing page
declare -A PRODUCT_DESCRIPTIONS=(
  ["ai-animated-photo-generator-web"]="AI photo animation"
  ["ai-cartoon-generator"]="AI cartoon creation"
  ["ai-chart-from-data"]="AI chart generation from data"
  ["ai-chart-generator"]="AI chart generation"
  ["ai-coloring-page-generator"]="AI coloring page creation"
  ["ai-face-swap"]="AI face swap"
  ["ai-food-photography-generator"]="AI food photography"
  ["ai-hairstyle-generator"]="AI hairstyle generation"
  ["ai-icon-generator"]="AI icon generation"
  ["ai-interior-design"]="AI interior design"
  ["ai-logo-generator"]="AI logo generation"
  ["ai-meme-generator"]="AI meme creation"
  ["ai-mockup-generator"]="AI mockup generation"
  ["ai-pet-portrait"]="AI pet portrait creation"
  ["ai-photo-colorizer"]="AI photo colorization"
  ["ai-photo-restorer"]="AI photo restoration"
  ["ai-presentation-maker"]="AI presentation creation"
  ["ai-professional-headshots"]="AI professional headshots"
  ["ai-qr-code-art"]="AI QR code art"
  ["ai-resume-photo-generator"]="AI resume photo generation"
  ["ai-sketch-to-image"]="AI sketch to image conversion"
  ["ai-storybook-illustrator"]="AI storybook illustration"
  ["ai-text-to-speech"]="AI text to speech"
  ["ai-vector-illustration"]="AI vector illustration"
  ["ai-yearbook-photo-generator"]="AI yearbook photo generation"
)

# Find the pricing directory for a given repo
find_pricing_dir() {
  local repo_path="$1"
  local pricing
  pricing=$(find "$repo_path" -path "*/pricing/page.tsx" ! -path "*/.next/*" ! -path "*/node_modules/*" 2>/dev/null | head -1)
  if [ -n "$pricing" ]; then
    dirname "$pricing"
  fi
}

# Check if pricing page already has metadata (either in page.tsx or layout.tsx)
has_metadata() {
  local pricing_dir="$1"
  # Check layout.tsx
  if [ -f "$pricing_dir/layout.tsx" ]; then
    if grep -q "metadata\|generateMetadata" "$pricing_dir/layout.tsx" 2>/dev/null; then
      return 0
    fi
  fi
  # Check page.tsx
  if grep -q "export const metadata\|export.*generateMetadata" "$pricing_dir/page.tsx" 2>/dev/null; then
    return 0
  fi
  return 1
}

# Generate layout.tsx content
generate_layout() {
  local product_name="$1"
  local product_desc="$2"

  cat <<LAYOUT_EOF
/**
 * pricing/layout.tsx — SEO metadata for the pricing page.
 *
 * WHY A LAYOUT: The pricing page.tsx is a "use client" component (needs useState
 * for checkout button loading state). Client components CANNOT export metadata
 * in Next.js. This layout.tsx (a Server Component by default) provides the
 * metadata that search engines need: title, description, canonical URL, and
 * OpenGraph tags for social sharing.
 *
 * REFERENCES:
 * - Next.js metadata docs: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
 * - fleet-audit.sh identified this gap across 25 clone repos (2026-04-14)
 */
import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://symplyai.io";

export const metadata: Metadata = {
  title: "Pricing — ${product_name} | Free & Pro Plans",
  description:
    "Compare ${product_name} pricing plans. Start free with daily generations or upgrade to Pro for unlimited ${product_desc}, priority processing, and commercial usage rights.",
  alternates: { canonical: \`\${APP_URL}/pricing\` },
  openGraph: {
    title: "Pricing — ${product_name}",
    description:
      "See ${product_name} pricing. Free plan for trying ${product_desc}, Pro plan for unlimited use and commercial rights.",
    url: \`\${APP_URL}/pricing\`,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
LAYOUT_EOF
}

echo "# Fleet Pricing SEO Fix — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "# Mode: $(if $DRY_RUN; then echo 'DRY RUN'; else echo 'APPLY'; fi)"
echo ""

for repo_name in "${!PRODUCT_NAMES[@]}"; do
  repo_path="$GITHUB_DIR/$repo_name"
  [ ! -d "$repo_path" ] && continue

  pricing_dir=$(find_pricing_dir "$repo_path")
  if [ -z "$pricing_dir" ]; then
    echo "SKIP|$repo_name|no pricing directory found"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if has_metadata "$pricing_dir"; then
    echo "SKIP|$repo_name|already has metadata"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  product_name="${PRODUCT_NAMES[$repo_name]}"
  product_desc="${PRODUCT_DESCRIPTIONS[$repo_name]}"
  layout_path="$pricing_dir/layout.tsx"

  if $DRY_RUN; then
    echo "WOULD_CREATE|$repo_name|$layout_path"
    CREATED=$((CREATED + 1))
  else
    # Generate the layout file
    generate_layout "$product_name" "$product_desc" > "$layout_path"

    # Commit and push
    cd "$repo_path"
    git add "$layout_path"
    git commit -m "$(cat <<EOF
seo: add pricing page metadata via layout.tsx

Pricing page is a client component that cannot export metadata.
This layout.tsx provides title, description, canonical URL, and
OpenGraph tags so search engines properly index the pricing page.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)" 2>/dev/null

    if git push origin HEAD 2>/dev/null; then
      echo "CREATED|$repo_name|$layout_path|pushed"
      CREATED=$((CREATED + 1))
    else
      echo "CREATED|$repo_name|$layout_path|push_failed"
      CREATED=$((CREATED + 1))
      FAILED=$((FAILED + 1))
    fi
  fi
done | sort

echo ""
echo "# SUMMARY: CREATED=$CREATED SKIPPED=$SKIPPED FAILED=$FAILED"
