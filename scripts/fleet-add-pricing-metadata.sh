#!/usr/bin/env bash
# =============================================================================
# fleet-add-pricing-metadata.sh — Add SEO metadata to fleet pricing pages
# =============================================================================
#
# PURPOSE:
# 26/41 clone pricing pages lack `export const metadata` or `generateMetadata`.
# Without metadata, search engines see no title/description for /pricing — the
# highest-intent page on every clone. This script adds metadata to all missing
# clones by splitting client-component pricing pages into server+client pairs.
#
# PATTERN:
# For "use client" pricing pages:
#   1. Rename page.tsx → PricingClient.tsx
#   2. Fix default export name to PricingClient
#   3. Create new server page.tsx that exports metadata and renders <PricingClient />
#
# For server-component pricing pages (no "use client"):
#   1. Add metadata export directly to existing page.tsx
#
# USAGE:
#   bash scripts/fleet-add-pricing-metadata.sh              # dry run
#   bash scripts/fleet-add-pricing-metadata.sh --apply       # apply changes
#   bash scripts/fleet-add-pricing-metadata.sh --apply --push # apply + commit + push
#
# AUTHOR: Custom 3 (pane1776), 2026-04-14
# =============================================================================

set -uo pipefail

GITHUB_ROOT="/Users/ak/UserRoot/Github"
APPLY=false
PUSH=false

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --push)  PUSH=true ;;
  esac
done

# Extract product name from src/lib/config.ts
get_product_name() {
  local clone_dir="$1"
  local config="$clone_dir/src/lib/config.ts"
  [ ! -f "$config" ] && config="$clone_dir/app/lib/config.ts"
  [ ! -f "$config" ] && echo "AI Tool" && return

  # Match: name: "ProductName", or name: 'ProductName', using python for portability
  local name
  name=$(python3 -c "
import re, sys
content = open('$config').read()
m = re.search(r'name:\s*[\"\\x27]([^\"\\x27]+)', content)
print(m.group(1) if m else 'AI Tool')
" 2>/dev/null)
  [ -z "$name" ] && name="AI Tool"
  echo "$name"
}

# Extract tagline/description from src/lib/config.ts
get_product_tagline() {
  local clone_dir="$1"
  local config="$clone_dir/src/lib/config.ts"
  [ ! -f "$config" ] && config="$clone_dir/app/lib/config.ts"
  [ ! -f "$config" ] && echo "AI-powered tool with free and pro plans" && return

  local tagline
  tagline=$(python3 -c "
import re, sys
content = open('$config').read()
m = re.search(r'tagline:\s*[\"\\x27]([^\"\\x27]+)', content)
if not m:
    m = re.search(r'description:\s*\n?\s*[\"\\x27]([^\"\\x27]+)', content)
print(m.group(1) if m else 'AI-powered tool with free and pro plans')
" 2>/dev/null)
  [ -z "$tagline" ] && tagline="AI-powered tool with free and pro plans"
  echo "$tagline"
}

# Get the default export function name from a file
get_default_export_name() {
  local file="$1"
  python3 -c "
import re
content = open('$file').read()
m = re.search(r'export default function (\w+)', content)
print(m.group(1) if m else 'PricingPage')
" 2>/dev/null
}

# Generate server wrapper page.tsx content
generate_server_wrapper() {
  local product_name="$1"
  local tagline="$2"
  local client_import="$3"
  local has_locale="$4"

  cat <<ENDOFFILE
/**
 * Pricing page — server component wrapper for SEO metadata.
 *
 * The actual pricing UI lives in PricingClient.tsx (client component).
 * This server wrapper exists solely to export Next.js metadata so search
 * engines see a proper title and description for /pricing.
 */
import type { Metadata } from "next";
import PricingClient from "./PricingClient";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";

export const metadata: Metadata = {
  title: "Pricing — ${product_name}",
  description:
    "Choose a plan for ${product_name}. Start free, upgrade to Pro for unlimited access. Cancel anytime.",
  alternates: {
    canonical: \`\${SITE_URL}/pricing\`,
  },
  openGraph: {
    title: "Pricing — ${product_name}",
    description:
      "Choose a plan for ${product_name}. Start free, upgrade to Pro for unlimited access. Cancel anytime.",
    url: \`\${SITE_URL}/pricing\`,
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
ENDOFFILE
}

# Count results
FIXED=0
SKIPPED=0
FAILED=0
ALREADY_OK=0

echo "=== Fleet Pricing Page SEO Metadata Fix ==="
echo ""

for clone_dir in "$GITHUB_ROOT"/ai-*/; do
  clone=$(basename "$clone_dir")

  # Find pricing page
  pricing_file=$(find "$clone_dir" -path "*/pricing/page.tsx" ! -path "*/node_modules/*" -print 2>/dev/null | head -1)
  [ -z "$pricing_file" ] && continue

  # Check if already has metadata
  if grep -qE 'export const metadata|generateMetadata' "$pricing_file" 2>/dev/null; then
    ALREADY_OK=$((ALREADY_OK + 1))
    continue
  fi

  # Determine pricing dir
  pricing_dir=$(dirname "$pricing_file")

  # Check if it's a client component
  is_client=$(grep -l '"use client"' "$pricing_file" 2>/dev/null)

  product_name=$(get_product_name "$clone_dir")
  tagline=$(get_product_tagline "$clone_dir")

  # Check if already has PricingClient.tsx
  if [ -f "$pricing_dir/PricingClient.tsx" ]; then
    echo "  [SKIP] $clone — PricingClient.tsx already exists (manual fix needed)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [ -n "$is_client" ]; then
    # Client component — needs split
    has_locale="false"
    echo "$pricing_file" | grep -q '\[locale\]' && has_locale="true"

    if $APPLY; then
      echo "  [FIX]  $clone — splitting client page into server+client pair"

      # Get the original default export name
      orig_name=$(get_default_export_name "$pricing_file")
      [ -z "$orig_name" ] && orig_name="PricingPage"

      # 1. Copy page.tsx to PricingClient.tsx
      cp "$pricing_file" "$pricing_dir/PricingClient.tsx"

      # 2. Rename the default export in PricingClient.tsx
      if [ "$orig_name" != "PricingClient" ]; then
        sed -i '' "s/export default function $orig_name/export default function PricingClient/" "$pricing_dir/PricingClient.tsx"
      fi

      # 3. Create new server wrapper page.tsx
      generate_server_wrapper "$product_name" "$tagline" "./PricingClient" "$has_locale" > "$pricing_file"

      FIXED=$((FIXED + 1))
    else
      echo "  [NEED] $clone — client component, needs split ($pricing_file)"
      FIXED=$((FIXED + 1))
    fi
  else
    # Server component — can add metadata directly
    if $APPLY; then
      echo "  [FIX]  $clone — adding metadata export to server component"

      # Add metadata import if missing
      if ! grep -q 'import type { Metadata }' "$pricing_file"; then
        # Add after first import or at top
        sed -i '' '1,/^import /{ /^import /a\
import type { Metadata } from "next";
}' "$pricing_file"
      fi

      # Add SITE_URL and metadata export before the default export
      local_site_url='const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";'
      metadata_block="
${local_site_url}

export const metadata: Metadata = {
  title: \"Pricing — ${product_name}\",
  description:
    \"Choose a plan for ${product_name}. Start free, upgrade to Pro for unlimited access. Cancel anytime.\",
  alternates: {
    canonical: \`\${SITE_URL}/pricing\`,
  },
  openGraph: {
    title: \"Pricing — ${product_name}\",
    description:
      \"Choose a plan for ${product_name}. Start free, upgrade to Pro for unlimited access. Cancel anytime.\",
    url: \`\${SITE_URL}/pricing\`,
    type: \"website\",
  },
};
"
      # Insert before the export default function line
      # Use python for reliable multi-line insert
      python3 -c "
import sys
content = open('$pricing_file').read()
insert_text = '''$metadata_block'''
# Find 'export default' and insert before it
idx = content.find('export default')
if idx > 0:
    new_content = content[:idx] + insert_text + '\n' + content[idx:]
    open('$pricing_file', 'w').write(new_content)
    print('  OK')
else:
    print('  WARN: no export default found')
"
      FIXED=$((FIXED + 1))
    else
      echo "  [NEED] $clone — server component, metadata can be added directly ($pricing_file)"
      FIXED=$((FIXED + 1))
    fi
  fi
done

echo ""
echo "================================================================"
if $APPLY; then
  echo "  FIXED: $FIXED | SKIPPED: $SKIPPED | ALREADY OK: $ALREADY_OK | FAILED: $FAILED"
else
  echo "  NEED FIX: $FIXED | SKIPPED: $SKIPPED | ALREADY OK: $ALREADY_OK"
  echo ""
  echo "  Run with --apply to fix all clones"
  echo "  Run with --apply --push to fix, commit, and push"
fi
echo "================================================================"

# Commit and push if requested
if $APPLY && $PUSH; then
  echo ""
  echo "=== Committing and pushing changes ==="
  for clone_dir in "$GITHUB_ROOT"/ai-*/; do
    clone=$(basename "$clone_dir")
    cd "$clone_dir"

    # Check if there are changes
    if git diff --quiet && git diff --cached --quiet; then
      # Check for untracked PricingClient.tsx
      if [ -z "$(git ls-files --others --exclude-standard '*/PricingClient.tsx' 2>/dev/null)" ]; then
        continue
      fi
    fi

    echo "  [PUSH] $clone"
    git add -A "*/pricing/page.tsx" "*/pricing/PricingClient.tsx" 2>/dev/null
    git add -A "**/pricing/page.tsx" "**/pricing/PricingClient.tsx" 2>/dev/null
    git commit -m "seo: add pricing page metadata for search engine visibility

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>/dev/null
    git push origin main 2>/dev/null || git push origin master 2>/dev/null
    cd "$GITHUB_ROOT"
  done
  echo ""
  echo "  Done. Verify deploys with: bash scripts/fleet-deploy-verify.sh"
fi
