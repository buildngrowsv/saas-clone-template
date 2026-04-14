#!/usr/bin/env bash
# verify-clone.sh — Combined pre-deploy verification for clone apps.
#
# Runs all automatable quality gates from clone-factory-quality-gates.md:
#   Gate 1: Build passes (npm run build)
#   Gate 2: Environment variables validated (validate-env-configuration.mjs)
#   Gate 3: No secrets in client-side code
#   Gate 4: .env.example covers all process.env references
#   Gate 7: Paid API routes have rate limiting
#
# Usage: npm run verify   (add "verify": "bash scripts/verify-clone.sh" to package.json)
# Usage: bash scripts/verify-clone.sh [--skip-build]
#
# Created: 2026-04-14 (iron-pulse-6183, Builder 1, pane1776)
# Referenced by: UserRoot/.claude/rules/clone-factory-quality-gates.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

PASS=0
FAIL=0
WARN=0
SKIP_BUILD=false

[ "${1:-}" = "--skip-build" ] && SKIP_BUILD=true

gate() {
  local status="$1" name="$2" detail="$3"
  case "$status" in
    PASS) PASS=$((PASS + 1)); printf "  [PASS] %-40s %s\n" "$name" "$detail" ;;
    FAIL) FAIL=$((FAIL + 1)); printf "  [FAIL] %-40s %s\n" "$name" "$detail" ;;
    WARN) WARN=$((WARN + 1)); printf "  [WARN] %-40s %s\n" "$name" "$detail" ;;
  esac
}

echo "============================================"
echo "  Clone Verification — $(basename "$PROJECT_DIR")"
echo "  Time: $(date '+%Y-%m-%d %H:%M')"
echo "============================================"
echo ""

# --- Gate 1: Build ---
echo "--- Gate 1: Build ---"
if [ "$SKIP_BUILD" = true ]; then
  gate "WARN" "npm run build" "Skipped (--skip-build)"
else
  if npm run build > /tmp/clone-verify-build.log 2>&1; then
    gate "PASS" "npm run build" "Build succeeded"
  else
    gate "FAIL" "npm run build" "Build failed — see /tmp/clone-verify-build.log"
  fi
fi
echo ""

# --- Gate 2: Environment Variables ---
echo "--- Gate 2: Environment Variables ---"
if [ -f "scripts/validate-env-configuration.mjs" ]; then
  if node scripts/validate-env-configuration.mjs > /tmp/clone-verify-env.log 2>&1; then
    gate "PASS" "env validation" "All required vars present"
  else
    gate "WARN" "env validation" "Some vars missing — see /tmp/clone-verify-env.log"
  fi
else
  gate "WARN" "env validation" "validate-env-configuration.mjs not found"
fi
echo ""

# --- Gate 3: No Secrets in Client Code ---
echo "--- Gate 3: Secret Scan ---"
secret_patterns='sk_live\|sk_test\|whsec_\|sk-proj-\|STRIPE_SECRET\|FAL_KEY\|BETTER_AUTH_SECRET'
# Only scan source files, not node_modules/.next/dist
secret_hits=$(grep -rn "$secret_patterns" src/ --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.mjs' 2>/dev/null | grep -v '\.env\.' | grep -v 'process\.env\.' | grep -v '//' | head -5 || true)

if [ -z "$secret_hits" ]; then
  gate "PASS" "no hardcoded secrets" "Clean"
else
  gate "FAIL" "hardcoded secrets found" "$(echo "$secret_hits" | wc -l | tr -d ' ') matches"
  echo "$secret_hits" | head -3
fi

# Check for VITE_ prefix on server secrets
vite_secret_hits=$(grep -rn 'VITE_.*SECRET\|VITE_.*KEY\|VITE_.*WEBHOOK' src/ --include='*.ts' --include='*.tsx' 2>/dev/null || true)
if [ -z "$vite_secret_hits" ]; then
  gate "PASS" "no VITE_ server secrets" "Clean"
else
  gate "FAIL" "VITE_ prefix on secrets" "Server keys exposed to client bundle"
fi
echo ""

# --- Gate 4: .env.example Coverage ---
echo "--- Gate 4: .env.example Coverage ---"
if [ -f ".env.example" ]; then
  # Find process.env references in source
  env_refs=$(grep -roh 'process\.env\.\w\+' src/ --include='*.ts' --include='*.tsx' --include='*.mjs' 2>/dev/null | sort -u | sed 's/process\.env\.//' || true)
  missing=""
  for var in $env_refs; do
    if ! grep -q "$var" .env.example 2>/dev/null; then
      missing="$missing $var"
    fi
  done
  if [ -z "$missing" ]; then
    gate "PASS" ".env.example coverage" "All process.env vars documented"
  else
    gate "WARN" ".env.example gaps" "Missing:$missing"
  fi
else
  gate "FAIL" ".env.example" "File not found"
fi
echo ""

# --- Gate 7: API Route Protection ---
echo "--- Gate 7: Paid API Route Protection ---"
api_routes=$(find src/app/api -name 'route.ts' -o -name 'route.tsx' 2>/dev/null || true)
if [ -n "$api_routes" ]; then
  unprotected=""
  for route in $api_routes; do
    # Skip health, webhook, and public routes
    case "$route" in
      *health*|*webhook*|*sitemap*|*og*|*opengraph*) continue ;;
    esac
    # Check for rate limiting or auth
    if ! grep -qE 'rateLimit|rateLimiter|auth|getServerSession|session|requireAuth' "$route" 2>/dev/null; then
      unprotected="$unprotected $(echo "$route" | sed 's|src/app/api/||')"
    fi
  done
  if [ -z "$unprotected" ]; then
    gate "PASS" "API route protection" "All paid routes have auth/rate-limit"
  else
    gate "WARN" "unprotected API routes" "$unprotected"
  fi
else
  gate "WARN" "API routes" "No API routes found"
fi
echo ""

# --- Summary ---
echo "============================================"
echo "  PASS: $PASS  |  FAIL: $FAIL  |  WARN: $WARN"
if [ "$FAIL" -eq 0 ]; then
  echo "  VERDICT: READY TO DEPLOY"
else
  echo "  VERDICT: NOT READY ($FAIL failures to fix)"
fi
echo "============================================"

# Exit with failure code if any FAIL
[ "$FAIL" -eq 0 ]
