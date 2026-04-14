#!/usr/bin/env bash
# ==============================================================================
# fleet-audit.sh — Universal fleet health audit for all ai-* clone repos
#
# WHY THIS EXISTS:
# Multiple agents (Builder 2, Coordinator 2) wasted cycles auditing the fleet
# with ad-hoc scripts that only searched src/app/ — missing clones that use
# app/ (top-level Next.js app dir). This script handles BOTH directory structures
# and produces a clean report that any agent can consume without reinventing.
#
# RECURRING BLOCKER IT PREVENTS:
# - "Missing pricing page" false positives (page exists at app/[locale]/pricing/)
# - "Missing checkout route" false positives (route exists at app/api/stripe/)
# - "No sitemap" false positives (sitemap at app/sitemap.ts not src/app/)
# - Duplicate audit work across agents
#
# USAGE:
#   ./fleet-audit.sh                    # Full audit, output to stdout
#   ./fleet-audit.sh --json             # JSON output
#   ./fleet-audit.sh --report FILE      # Write report to file
#   ./fleet-audit.sh --check pricing      # Only check pricing pages
#   ./fleet-audit.sh --check checkout     # Only check checkout routes
#   ./fleet-audit.sh --check sitemap      # Only check sitemaps
#   ./fleet-audit.sh --check env          # Only check .env.example
#   ./fleet-audit.sh --check middleware   # Only check pSEO middleware paths
#   ./fleet-audit.sh --check error-pages  # Only check 404/error pages
#   ./fleet-audit.sh --check validate-env # Only check validate-env script
#   ./fleet-audit.sh --check all          # All checks (default)
#
# DEPENDS ON:
# - fleet-clones.json in the same directory (list of clone repos)
# - jq for JSON parsing
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLEET_JSON="$SCRIPT_DIR/fleet-clones.json"
GITHUB_DIR="/Users/ak/UserRoot/Github"
CHECK_TYPE="${1:---check}"
CHECK_TARGET="${2:-all}"
OUTPUT_FORMAT="text"
REPORT_FILE=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --json) OUTPUT_FORMAT="json"; shift ;;
    --report) REPORT_FILE="$2"; shift 2 ;;
    --check) CHECK_TARGET="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# ==============================================================================
# CORE HELPER: find_app_dir — resolves the ACTUAL app directory for a clone
#
# WHY: Some clones use src/app/, others use app/ at the top level.
# This is the #1 cause of false audit failures. Always use this function
# instead of hardcoding a path.
# ==============================================================================
find_app_dir() {
  local repo_path="$1"
  if [ -d "$repo_path/src/app" ]; then
    echo "$repo_path/src/app"
  elif [ -d "$repo_path/app" ]; then
    echo "$repo_path/app"
  else
    echo ""
  fi
}

# ==============================================================================
# AUDITORS — each returns a status line per clone
# ==============================================================================

check_pricing() {
  local name="$1" repo="$2"

  # Search BOTH src/app/ and app/ — some repos have content split across both
  local pricing
  pricing=$(find "$repo/src/app" "$repo/app" -path "*/pricing/page.tsx" ! -path "*/.next/*" 2>/dev/null | head -1)
  if [ -n "$pricing" ]; then
    # Check if it has metadata export — either in page.tsx or in layout.tsx (same dir)
    local pricing_dir has_meta
    pricing_dir=$(dirname "$pricing")
    has_meta=$(grep -l "metadata\|generateMetadata" "$pricing" "$pricing_dir/layout.tsx" 2>/dev/null | head -1)
    if [ -n "$has_meta" ]; then
      echo "$name|pricing|OK|$pricing (has metadata)"
    else
      echo "$name|pricing|WARN|$pricing (no metadata export)"
    fi
  else
    echo "$name|pricing|MISSING|no pricing/page.tsx found"
  fi
}

check_checkout() {
  local name="$1" repo="$2"

  # Search BOTH src/app/ and app/ — some repos have Stripe routes in app/ even
  # when most content is in src/app/ (common in clones with i18n restructuring).
  local checkout
  checkout=$(find "$repo/src/app" "$repo/app" -path "*stripe*checkout*route.ts" -o -path "*stripe*create-checkout*route.ts" 2>/dev/null | grep -v ".next" | grep -v node_modules | head -1)
  if [ -n "$checkout" ]; then
    echo "$name|checkout|OK|$checkout"
  else
    # Check for payment link fallback pattern
    local payment_link
    payment_link=$(grep -rl "buy.stripe.com" "$repo/src/app" "$repo/app" 2>/dev/null | head -1)
    if [ -n "$payment_link" ]; then
      echo "$name|checkout|OK|payment link fallback in $payment_link"
    else
      echo "$name|checkout|MISSING|no stripe checkout route"
    fi
  fi
}

check_sitemap() {
  local name="$1" repo="$2"
  local sitemap
  sitemap=$(find "$repo" -name "sitemap.ts" ! -path "*/node_modules/*" ! -path "*/.next/*" 2>/dev/null | head -1)
  if [ -z "$sitemap" ]; then
    echo "$name|sitemap|MISSING|no sitemap.ts"
    return
  fi

  local has_pricing
  has_pricing=$(grep -l "pricing" "$sitemap" 2>/dev/null)
  if [ -n "$has_pricing" ]; then
    echo "$name|sitemap|OK|$sitemap (has /pricing)"
  else
    # Check if a pricing page exists — if so, the sitemap is incomplete
    local app_dir
    app_dir="$(find_app_dir "$repo")"
    local pricing
    pricing=$(find "$app_dir" -path "*/pricing/page.tsx" ! -path "*/.next/*" 2>/dev/null | head -1)
    if [ -n "$pricing" ]; then
      echo "$name|sitemap|GAP|$sitemap (missing /pricing entry but pricing page exists)"
    else
      echo "$name|sitemap|OK|$sitemap (no pricing page to include)"
    fi
  fi
}

check_env() {
  local name="$1" repo="$2"
  if [ -f "$repo/.env.example" ]; then
    local stripe_vars
    stripe_vars=$(grep -c "STRIPE" "$repo/.env.example" 2>/dev/null || echo 0)
    echo "$name|env|OK|.env.example ($stripe_vars Stripe vars)"
  else
    echo "$name|env|MISSING|no .env.example"
  fi
}

# Gate 9 compliance: do pSEO paths appear in middleware PUBLIC_PATHS or matcher?
# Without these, Googlebot hits auth redirects and pages never get indexed.
# Handles two middleware patterns:
#   1. PUBLIC_PATHS array (template-style auth middleware)
#   2. next-intl matcher negative lookahead (i18n middleware)
check_middleware() {
  local name="$1" repo="$2"
  # Next.js uses root-level middleware.ts first, then src/middleware.ts.
  # Check root first to match runtime behavior.
  local mw=""
  if [ -f "$repo/middleware.ts" ]; then
    mw="$repo/middleware.ts"
  elif [ -f "$repo/src/middleware.ts" ]; then
    mw="$repo/src/middleware.ts"
  fi
  if [ -z "$mw" ]; then
    echo "$name|middleware|WARN|no middleware.ts (no auth gating)"
    return
  fi

  local mw_content
  mw_content=$(cat "$mw" 2>/dev/null)
  local missing=""
  # Check both PUBLIC_PATHS array entries AND matcher regex segments.
  # Clones use two patterns:
  #   1. PUBLIC_PATHS: "/vs", "/blog", etc.
  #   2. Matcher regex: |vs|blog| or |vs) etc.
  for path_seg in "vs" "for" "use-cases" "best" "blog" "lp" "testimonials"; do
    if echo "$mw_content" | grep -q "\"/$path_seg\"" 2>/dev/null; then
      continue  # Found in PUBLIC_PATHS
    elif echo "$mw_content" | grep -q "'/$path_seg'" 2>/dev/null; then
      continue  # Found in PUBLIC_PATHS (single quotes)
    elif echo "$mw_content" | grep -qF "$path_seg" 2>/dev/null; then
      continue  # Found anywhere (matcher regex, etc.)
    else
      missing+=" /$path_seg"
    fi
  done

  if [ -z "$missing" ]; then
    echo "$name|middleware|OK|all pSEO paths covered"
  else
    echo "$name|middleware|GAP|missing pSEO paths:$missing"
  fi
}

# Check for branded error handling pages (not-found.tsx, error.tsx)
check_error_pages() {
  local name="$1" repo="$2"
  local app_dir
  app_dir="$(find_app_dir "$repo")"
  [ -z "$app_dir" ] && echo "$name|error-pages|MISSING|no app dir" && return

  local has_404 has_error
  has_404=$(find "$app_dir" -maxdepth 1 -name "not-found.tsx" 2>/dev/null | head -1)
  has_error=$(find "$app_dir" -maxdepth 1 -name "error.tsx" 2>/dev/null | head -1)

  if [ -n "$has_404" ] && [ -n "$has_error" ]; then
    echo "$name|error-pages|OK|both not-found.tsx and error.tsx present"
  elif [ -n "$has_404" ]; then
    echo "$name|error-pages|GAP|has not-found.tsx but missing error.tsx"
  elif [ -n "$has_error" ]; then
    echo "$name|error-pages|GAP|has error.tsx but missing not-found.tsx"
  else
    echo "$name|error-pages|MISSING|no not-found.tsx or error.tsx"
  fi
}

# Gate 8: Credits must be database-backed, not in-memory Map.
# In-memory credits reset on every Vercel cold start = unlimited free usage = $0 MRR.
check_credits() {
  local name="$1" repo="$2"
  local cfile=""
  [ -f "$repo/src/lib/credits.ts" ] && cfile="$repo/src/lib/credits.ts"
  [ -f "$repo/lib/credits.ts" ] && cfile="$repo/lib/credits.ts"

  if [ -z "$cfile" ]; then
    echo "$name|credits|WARN|no credits.ts (may use different pattern)"
    return
  fi

  if grep -q 'new Map' "$cfile" 2>/dev/null; then
    echo "$name|credits|GAP|IN-MEMORY credits (new Map) — $0 MRR risk"
  elif grep -qE 'db|drizzle|prisma|@/db|import.*from.*database' "$cfile" 2>/dev/null; then
    echo "$name|credits|OK|database-backed credits"
  else
    echo "$name|credits|WARN|credits.ts exists but pattern unclear"
  fi
}

# Check for OG image (social sharing preview)
# Without an OG image, every social share (Twitter, LinkedIn, Slack) is text-only
# and gets far fewer clicks. This is a high-impact SEO/marketing gap.
check_og_image() {
  local name="$1" repo="$2"
  local og
  og=$(find "$repo/src/app" "$repo/app" -maxdepth 1 \( -name "opengraph-image.*" -o -name "og-image.*" \) ! -path "*/.next/*" 2>/dev/null | head -1)
  if [ -n "$og" ]; then
    echo "$name|og-image|OK|$og"
  else
    # Check if OG images are defined in metadata
    local layout_og
    layout_og=$(grep -r "openGraph.*images\|og:image\|opengraph" "$repo/src/app/layout.tsx" "$repo/app/layout.tsx" 2>/dev/null | head -1)
    if [ -n "$layout_og" ]; then
      echo "$name|og-image|OK|OG image defined in layout metadata"
    else
      echo "$name|og-image|MISSING|no opengraph-image file or OG image metadata"
    fi
  fi
}

# Check for SeoInternalLinks on homepage
# Without this, homepage PageRank never flows to pSEO pages.
check_seo_links() {
  local name="$1" repo="$2"
  # Find the actual landing page (not a redirect-only stub)
  # Uses grep on non-comment lines to avoid false positives from comments
  # that mention redirect() but don't actually call it.
  local page=""
  for candidate in "$repo/src/app/page.tsx" "$repo/app/page.tsx"; do
    if [ -f "$candidate" ]; then
      # Check if it's a redirect stub: has actual redirect() call (not in comments)
      # and is short (under 50 non-empty lines = stub, not real content page)
      local non_comment_redirect
      non_comment_redirect=$(grep -v '^\s*//' "$candidate" | grep -v '^\s*\*' | grep -c "redirect(" 2>/dev/null || true)
      non_comment_redirect=${non_comment_redirect:-0}
      non_comment_redirect=$(echo "$non_comment_redirect" | tr -d '[:space:]')
      local line_count
      line_count=$(wc -l < "$candidate" 2>/dev/null || true)
      line_count=${line_count:-0}
      line_count=$(echo "$line_count" | tr -d '[:space:]')
      if [ "$non_comment_redirect" -gt 0 ] && [ "$line_count" -lt 50 ]; then
        continue  # Skip redirect stubs
      fi
      page="$candidate"
      break
    fi
  done
  # Check locale pages if root was a redirect
  if [ -z "$page" ]; then
    for candidate in "$repo/src/app/[locale]/page.tsx" "$repo/app/[locale]/page.tsx"; do
      [ -f "$candidate" ] && page="$candidate" && break
    done
  fi
  if [ -z "$page" ]; then
    echo "$name|seo-links|WARN|no landing page found"
    return
  fi
  if grep -q "SeoInternalLinks" "$page" 2>/dev/null; then
    echo "$name|seo-links|OK|SeoInternalLinks on homepage"
  else
    echo "$name|seo-links|GAP|SeoInternalLinks missing from homepage"
  fi
}

# Check for validate-env script
check_validate_env() {
  local name="$1" repo="$2"
  local ve
  ve=$(find "$repo/scripts" -name "validate-env*" 2>/dev/null | head -1)
  if [ -n "$ve" ]; then
    echo "$name|validate-env|OK|$ve"
  else
    echo "$name|validate-env|MISSING|no validate-env script in scripts/"
  fi
}

# ==============================================================================
# MAIN — iterate fleet manifest and run selected checks
# ==============================================================================

if [ ! -f "$FLEET_JSON" ]; then
  echo "ERROR: fleet-clones.json not found at $FLEET_JSON" >&2
  exit 1
fi

# Extract clone names from JSON
CLONES=$(jq -r '.clones[].name' "$FLEET_JSON")

RESULTS=()
TOTAL=0
OK=0
WARN=0
GAP=0
MISSING=0

for clone in $CLONES; do
  repo="$GITHUB_DIR/$clone"
  [ ! -d "$repo" ] && continue
  TOTAL=$((TOTAL + 1))

  case "$CHECK_TARGET" in
    pricing)      result=$(check_pricing "$clone" "$repo") ;;
    checkout)     result=$(check_checkout "$clone" "$repo") ;;
    sitemap)      result=$(check_sitemap "$clone" "$repo") ;;
    env)          result=$(check_env "$clone" "$repo") ;;
    middleware)   result=$(check_middleware "$clone" "$repo") ;;
    error-pages)  result=$(check_error_pages "$clone" "$repo") ;;
    validate-env) result=$(check_validate_env "$clone" "$repo") ;;
    credits)      result=$(check_credits "$clone" "$repo") ;;
    og-image)     result=$(check_og_image "$clone" "$repo") ;;
    seo-links)    result=$(check_seo_links "$clone" "$repo") ;;
    all)
      result=""
      result+="$(check_pricing "$clone" "$repo")\n"
      result+="$(check_checkout "$clone" "$repo")\n"
      result+="$(check_sitemap "$clone" "$repo")\n"
      result+="$(check_env "$clone" "$repo")\n"
      result+="$(check_middleware "$clone" "$repo")\n"
      result+="$(check_error_pages "$clone" "$repo")\n"
      result+="$(check_validate_env "$clone" "$repo")\n"
      result+="$(check_credits "$clone" "$repo")\n"
      result+="$(check_og_image "$clone" "$repo")\n"
      result+="$(check_seo_links "$clone" "$repo")"
      ;;
  esac

  RESULTS+=("$result")

  # Count statuses
  echo -e "$result" | while IFS='|' read -r _ _ status _; do
    case "$status" in
      OK) ;;
      WARN) ;;
      GAP) ;;
      MISSING) ;;
    esac
  done
done

# ==============================================================================
# OUTPUT
# ==============================================================================

header="# Fleet Audit Report — $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Check: $CHECK_TARGET | Clones: $TOTAL
# Format: name|check|status|detail
#   OK = present and correct
#   WARN = present but may need attention
#   GAP = missing element that should exist
#   MISSING = not found
"

output="$header"
for r in "${RESULTS[@]}"; do
  output+="$(echo -e "$r")\n"
done

# Summary counts
ok_count=$(echo -e "$output" | grep -c "|OK|" || true)
warn_count=$(echo -e "$output" | grep -c "|WARN|" || true)
gap_count=$(echo -e "$output" | grep -c "|GAP|" || true)
missing_count=$(echo -e "$output" | grep -c "|MISSING|" || true)

output+="\n# SUMMARY: OK=$ok_count WARN=$warn_count GAP=$gap_count MISSING=$missing_count"

if [ -n "$REPORT_FILE" ]; then
  echo -e "$output" > "$REPORT_FILE"
  echo "Report written to $REPORT_FILE"
else
  echo -e "$output"
fi
