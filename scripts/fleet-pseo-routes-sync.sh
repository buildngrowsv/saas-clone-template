#!/usr/bin/env bash
#
# fleet-pseo-routes-sync.sh — Propagate pSEO route pages to all clones
#
# WHY THIS SCRIPT EXISTS:
# 36+ clones have seo-pages.ts config data but are missing the actual
# route pages (/for/, /best/, /use-cases/). Without route pages, the
# SEO config generates zero pages — thousands of potential long-tail
# keyword landing pages are invisible. This script copies the template-
# standard route page files to all clones that have seo-pages.ts.
#
# USAGE:
#   ./scripts/fleet-pseo-routes-sync.sh           # Dry run (shows what would change)
#   ./scripts/fleet-pseo-routes-sync.sh --apply    # Actually copy files and commit
#
# SAFETY:
# - Only targets clones with src/config/seo-pages.ts (they have data to render)
# - Only targets clones with @/* -> ./src/* tsconfig mapping (template-standard)
# - Skips clones that already have the route page
# - Creates directories as needed
# - Commits each clone individually with descriptive message
#
# SKIPPED CLONES (non-standard @/* mapping — need manual fix):
# ai-avatar-generator, ai-background-remover, ai-business-card-generator,
# ai-headshots-photos, ai-image-upscaler, ai-room-planner

set -euo pipefail

TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FLEET_DIR="$(cd "$TEMPLATE_DIR/.." && pwd)"
DRY_RUN=true

if [[ "${1:-}" == "--apply" ]]; then
  DRY_RUN=false
fi

# Template route page files to propagate
ROUTE_FILES=(
  "src/app/for/[audience]/page.tsx"
  "src/app/best/[slug]/page.tsx"
  "src/app/use-cases/[use-case]/page.tsx"
)

# Clones with non-standard @/* -> ./* tsconfig (need manual handling)
SKIP_TSCONFIG=(
  "ai-avatar-generator"
  "ai-background-remover"
  "ai-business-card-generator"
  "ai-headshots-photos"
  "ai-image-upscaler"
  "ai-room-planner"
)

SYNCED=0
SKIPPED=0
ALREADY_OK=0
ERRORS=0

is_skipped_tsconfig() {
  local name="$1"
  for skip in "${SKIP_TSCONFIG[@]}"; do
    if [[ "$name" == "$skip" ]]; then
      return 0
    fi
  done
  return 1
}

echo "=== Fleet pSEO Routes Sync ==="
echo "Template: $TEMPLATE_DIR"
echo "Fleet dir: $FLEET_DIR"
echo "Mode: $(if $DRY_RUN; then echo 'DRY RUN'; else echo 'APPLY'; fi)"
echo ""

for clone_dir in "$FLEET_DIR"/ai-*/; do
  clone_name=$(basename "$clone_dir")

  # Skip if no seo-pages.ts config (nothing to render)
  if [[ ! -f "$clone_dir/src/config/seo-pages.ts" ]]; then
    echo "  SKIP     $clone_name (no src/config/seo-pages.ts)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Skip non-standard tsconfig clones
  if is_skipped_tsconfig "$clone_name"; then
    echo "  SKIP     $clone_name (non-standard @/* tsconfig mapping)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check which route files are missing
  missing_files=()
  for route_file in "${ROUTE_FILES[@]}"; do
    if [[ ! -f "$clone_dir/$route_file" ]]; then
      missing_files+=("$route_file")
    fi
  done

  if [[ ${#missing_files[@]} -eq 0 ]]; then
    echo "  OK       $clone_name (all route pages present)"
    ALREADY_OK=$((ALREADY_OK + 1))
    continue
  fi

  echo "  SYNC     $clone_name (missing ${#missing_files[@]} route pages)"

  if ! $DRY_RUN; then
    # Check for uncommitted changes
    if cd "$clone_dir" && [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
      echo "    WARN   $clone_name has uncommitted changes — syncing anyway (additive only)"
    fi

    # Copy missing files
    for route_file in "${missing_files[@]}"; do
      route_dir=$(dirname "$clone_dir/$route_file")
      mkdir -p "$route_dir"
      cp "$TEMPLATE_DIR/$route_file" "$clone_dir/$route_file"
      echo "    COPIED $route_file"
    done

    # Stage and commit
    cd "$clone_dir"
    git add "${missing_files[@]}" 2>/dev/null
    if git diff --cached --quiet 2>/dev/null; then
      echo "    SKIP   nothing to commit"
    else
      git commit -m "seo: add pSEO route pages (/for/, /best/, /use-cases/) for long-tail keyword coverage

Copied template-standard route pages that render audience-specific,
listicle, and use-case landing pages from src/config/seo-pages.ts data.
Each page generates unique title, description, FAQ JSON-LD, and cross-links.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 2>/dev/null && \
      echo "    COMMITTED" || { echo "    ERROR  commit failed"; ERRORS=$((ERRORS + 1)); continue; }
    fi

    SYNCED=$((SYNCED + 1))
  else
    for route_file in "${missing_files[@]}"; do
      echo "    WOULD COPY $route_file"
    done
    SYNCED=$((SYNCED + 1))
  fi
done

echo ""
echo "=== Summary ==="
echo "Synced: $SYNCED"
echo "Already OK: $ALREADY_OK"
echo "Skipped: $SKIPPED"
echo "Errors: $ERRORS"

if $DRY_RUN && [[ $SYNCED -gt 0 ]]; then
  echo ""
  echo "Run with --apply to copy files and commit."
fi
