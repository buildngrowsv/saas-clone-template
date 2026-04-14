#!/usr/bin/env bash
# fleet-revenue-readiness.sh — Audit which clones are ready to generate revenue.
#
# WHY THIS EXISTS:
# With 42 clones, manually checking each one's revenue readiness is impractical.
# This script checks every gate that must be green for a clone to accept payments
# and enforce credit limits, giving the operator a single view of what's blocking
# each product from earning money.
#
# CHECKS PER CLONE:
#   1. DB schema files exist (src/db/ or db/)
#   2. credits.ts is DB-backed (imports @/db, not Map-based)
#   3. drizzle.config.ts exists (needed for schema push)
#   4. Generate route exists and uses @fal-ai/client
#   5. Stripe checkout route exists
#   6. Stripe webhook route exists
#   7. Pricing page exists
#   8. Vercel project is linked
#
# USAGE:
#   bash scripts/fleet-revenue-readiness.sh          # full audit
#   bash scripts/fleet-revenue-readiness.sh --brief   # summary only
#
# AUTHORED: flux-exec-4419, 2026-04-14

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GITHUB_DIR="/Users/ak/UserRoot/Github"

BRIEF=false
[[ "${1:-}" == "--brief" ]] && BRIEF=true

echo "# Fleet Revenue Readiness Audit — $(date '+%Y-%m-%d %H:%M')"
echo ""

TOTAL=0
READY=0
PARTIAL=0
NOT_READY=0

# Helper: find the app directory (src/app or app)
find_app_dir() {
  local repo="$1"
  if [ -d "$repo/src/app" ]; then
    echo "$repo/src/app"
  elif [ -d "$repo/app" ]; then
    echo "$repo/app"
  else
    echo ""
  fi
}

for repo_path in "$GITHUB_DIR"/ai-*/; do
  [ ! -f "$repo_path/package.json" ] && continue
  repo=$(basename "$repo_path")
  TOTAL=$((TOTAL + 1))

  app_dir=$(find_app_dir "$repo_path")
  if [ -z "$app_dir" ]; then
    [[ "$BRIEF" == false ]] && echo "  SKIP    $repo (no app/ or src/app/)"
    NOT_READY=$((NOT_READY + 1))
    continue
  fi

  # Determine prefix for lib/db paths
  if [ -d "$repo_path/src/app" ]; then
    lib_prefix="$repo_path/src"
    db_prefix="$repo_path/src"
  else
    lib_prefix="$repo_path"
    db_prefix="$repo_path"
  fi

  score=0
  max=8
  details=""

  # 1. DB schema
  if [ -d "$db_prefix/db/schema" ]; then
    score=$((score + 1))
  else
    details="$details -db_schema"
  fi

  # 2. DB-backed credits
  cred_file="$lib_prefix/lib/credits.ts"
  if [ -f "$cred_file" ] && grep -q 'import.*from.*@/db\|import.*from.*"@/db"' "$cred_file" 2>/dev/null; then
    score=$((score + 1))
  else
    details="$details -db_credits"
  fi

  # 3. drizzle.config.ts
  if [ -f "$repo_path/drizzle.config.ts" ]; then
    score=$((score + 1))
  else
    details="$details -drizzle_config"
  fi

  # 4. Generate route with fal.ai
  gen_route=$(find "$repo_path" -name "route.ts" -path "*/api/*" -not -path "*node_modules*" -not -path "*.next*" 2>/dev/null | xargs grep -l '@fal-ai/\|fal.run\|queue.fal.run' 2>/dev/null | head -1)
  if [ -n "$gen_route" ]; then
    score=$((score + 1))
  else
    details="$details -fal_route"
  fi

  # 5. Stripe checkout route
  checkout_route=$(find "$app_dir" -name "route.ts" -path "*stripe*checkout*" -not -path "*node_modules*" 2>/dev/null | head -1)
  if [ -n "$checkout_route" ]; then
    score=$((score + 1))
  else
    details="$details -stripe_checkout"
  fi

  # 6. Stripe webhook route
  webhook_route=$(find "$app_dir" -name "route.ts" -path "*stripe*webhook*" -not -path "*node_modules*" 2>/dev/null | head -1)
  if [ -n "$webhook_route" ]; then
    score=$((score + 1))
  else
    details="$details -stripe_webhook"
  fi

  # 7. Pricing page
  pricing_page=$(find "$app_dir" -name "page.tsx" -path "*pricing*" -not -path "*node_modules*" 2>/dev/null | head -1)
  if [ -n "$pricing_page" ]; then
    score=$((score + 1))
  else
    details="$details -pricing_page"
  fi

  # 8. Vercel linked
  if [ -f "$repo_path/.vercel/project.json" ]; then
    score=$((score + 1))
  else
    details="$details -vercel"
  fi

  # Classify
  if [ "$score" -eq "$max" ]; then
    READY=$((READY + 1))
    [[ "$BRIEF" == false ]] && echo "  READY   $repo ($score/$max)"
  elif [ "$score" -ge 5 ]; then
    PARTIAL=$((PARTIAL + 1))
    [[ "$BRIEF" == false ]] && echo "  PARTIAL $repo ($score/$max) missing:$details"
  else
    NOT_READY=$((NOT_READY + 1))
    [[ "$BRIEF" == false ]] && echo "  NOTYET  $repo ($score/$max) missing:$details"
  fi
done

echo ""
echo "# Summary"
echo "  Total:     $TOTAL"
echo "  Ready:     $READY (all 8 gates green)"
echo "  Partial:   $PARTIAL (5-7 gates, close to ready)"
echo "  Not ready: $NOT_READY (<5 gates)"
echo ""

if [ "$READY" -eq 0 ]; then
  echo "# CRITICAL: No clones are fully revenue-ready."
  echo "# Run propagate-credits-db.sh --apply to fix DB infrastructure (biggest blocker)."
else
  echo "# $READY clones can start earning revenue once env vars are set."
fi
