#!/usr/bin/env bash
# =============================================================================
# fleet-revenue-verify.sh — Verify checkout readiness across clone fleet
# =============================================================================
#
# PURPOSE:
# Quick verification that all double-down tier clones have:
# 1. Stripe checkout route files (checks BOTH app/ and src/app/ directories)
# 2. Stripe webhook route files
# 3. Pricing page
# 4. .env.example with Stripe vars
# 5. Live HTTP responses from production domains
#
# WHY THIS EXISTS:
# During pane1776 swarm (2026-04-14), an audit incorrectly reported
# ai-background-remover and ai-image-upscaler as having "no payment routes"
# because it only searched src/app/api/ when the routes were under app/api/.
# This script checks BOTH locations to prevent that class of error.
#
# USAGE:
#   bash scripts/fleet-revenue-verify.sh
#   bash scripts/fleet-revenue-verify.sh --live  # also checks production URLs
#
# AUTHOR: steel-coord-7742 (Coordinator 2), 2026-04-14
# =============================================================================

set -euo pipefail

GITHUB_DIR="/Users/ak/UserRoot/Github"

# Double-down tier repos and their custom domains (parallel arrays to avoid bash associative array hyphen issues)
REPOS=("ai-logo-generator" "ai-product-photo-generator" "ai-interior-design" "ai-manga-generator" "ai-background-remover" "ai-image-upscaler")
DOMAINS=("generateailogo.com" "aiproductphotomaker.com" "airoomredesigner.com" "mangaartai.com" "removebgapp.com" "smartaiupscaler.com")

CHECK_LIVE=false
if [[ "${1:-}" == "--live" ]]; then
  CHECK_LIVE=true
fi

echo "================================================================"
echo "  CLONE FLEET REVENUE VERIFICATION"
echo "  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "================================================================"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

for i in "${!REPOS[@]}"; do
  repo="${REPOS[$i]}"
  domain="${DOMAINS[$i]}"
  repo_path="$GITHUB_DIR/$repo"

  echo "── $repo ($domain) ──"

  if [[ ! -d "$repo_path" ]]; then
    echo "  [FAIL] Repo directory not found: $repo_path"
    ((FAIL_COUNT++))
    echo ""
    continue
  fi

  # 1. Find Stripe checkout route (check BOTH app/ and src/app/)
  checkout_route=""
  for search_dir in "$repo_path/app/api" "$repo_path/src/app/api"; do
    if [[ -d "$search_dir" ]]; then
      found=$(find "$search_dir" -type f -name "route.ts" \( -path "*checkout*" -o -path "*stripe*create*" \) 2>/dev/null | head -1)
      if [[ -n "$found" ]]; then
        checkout_route="$found"
        break
      fi
    fi
  done

  if [[ -n "$checkout_route" ]]; then
    rel_path="${checkout_route#$repo_path/}"
    echo "  [PASS] Checkout route: $rel_path"
    ((PASS_COUNT++))
  else
    echo "  [FAIL] No checkout route found in app/api/ or src/app/api/"
    ((FAIL_COUNT++))
  fi

  # 2. Find Stripe webhook route
  webhook_route=""
  for search_dir in "$repo_path/app/api" "$repo_path/src/app/api"; do
    if [[ -d "$search_dir" ]]; then
      found=$(find "$search_dir" -type f -name "route.ts" -path "*webhook*" 2>/dev/null | head -1)
      if [[ -n "$found" ]]; then
        webhook_route="$found"
        break
      fi
    fi
  done

  if [[ -n "$webhook_route" ]]; then
    rel_path="${webhook_route#$repo_path/}"
    echo "  [PASS] Webhook route: $rel_path"
    ((PASS_COUNT++))
  else
    echo "  [WARN] No webhook route found"
    ((WARN_COUNT++))
  fi

  # 3. Check pricing page
  pricing_page=""
  for search_path in "$repo_path/app" "$repo_path/src/app"; do
    found=$(find "$search_path" -type f -name "page.tsx" -path "*pricing*" 2>/dev/null | head -1)
    if [[ -n "$found" ]]; then
      pricing_page="$found"
      break
    fi
  done

  if [[ -n "$pricing_page" ]]; then
    echo "  [PASS] Pricing page exists"
    ((PASS_COUNT++))
  else
    echo "  [FAIL] No pricing page found"
    ((FAIL_COUNT++))
  fi

  # 4. Check .env.example for Stripe vars
  env_example=""
  for env_path in "$repo_path/.env.example" "$repo_path/app/.env.example"; do
    if [[ -f "$env_path" ]]; then
      env_example="$env_path"
      break
    fi
  done

  if [[ -n "$env_example" ]]; then
    stripe_vars=$(grep -c "STRIPE" "$env_example" 2>/dev/null || echo "0")
    if [[ "$stripe_vars" -gt 0 ]]; then
      echo "  [PASS] .env.example has $stripe_vars Stripe vars"
      ((PASS_COUNT++))
    else
      echo "  [WARN] .env.example exists but has no STRIPE vars"
      ((WARN_COUNT++))
    fi
  else
    echo "  [WARN] No .env.example found"
    ((WARN_COUNT++))
  fi

  # 5. Check create-stripe-products script
  stripe_script=""
  for script_path in "$repo_path/scripts/create-stripe-products-and-prices.mjs" "$repo_path/scripts/create-stripe-products.mjs"; do
    if [[ -f "$script_path" ]]; then
      stripe_script="$script_path"
      break
    fi
  done

  if [[ -n "$stripe_script" ]]; then
    echo "  [PASS] Stripe setup script exists"
    ((PASS_COUNT++))
  else
    echo "  [WARN] No create-stripe-products script"
    ((WARN_COUNT++))
  fi

  # 6. Live HTTP check (optional)
  if $CHECK_LIVE; then
    # Check pricing page
    pricing_code=$(curl -sL --max-time 10 -o /dev/null -w "%{http_code}" "https://$domain/pricing" 2>/dev/null || echo "000")
    if [[ "$pricing_code" == "200" ]]; then
      echo "  [PASS] https://$domain/pricing -> HTTP $pricing_code"
      ((PASS_COUNT++))
    else
      echo "  [FAIL] https://$domain/pricing -> HTTP $pricing_code"
      ((FAIL_COUNT++))
    fi
  fi

  echo ""
done

echo "================================================================"
echo "  SUMMARY: $PASS_COUNT passed | $FAIL_COUNT failed | $WARN_COUNT warnings"
echo "================================================================"

if [[ $FAIL_COUNT -gt 0 ]]; then
  exit 1
fi
