#!/usr/bin/env bash
# =============================================================================
# fleet-deploy-verify.sh — Verify production deployments are live after pushes
# =============================================================================
#
# PURPOSE:
# After fleet-wide git pushes, Vercel's git integration may silently skip
# some projects. This script curls each production domain and checks that
# the response includes expected content, confirming the deploy went through.
#
# WHY THIS EXISTS:
# Root cause table entry: "Fleet push succeeds but production not updated —
# Vercel git integration silently skips some projects." Git push success
# does NOT mean deployed. This script closes that gap.
#
# USAGE:
#   bash scripts/fleet-deploy-verify.sh
#   bash scripts/fleet-deploy-verify.sh --check-header "RelatedTools"
#
# The --check-header flag lets you verify a specific string appears in the
# response, useful for confirming a fleet-wide change (like cross-linking)
# actually deployed.
#
# AUTHOR: steel-coord-7742 (Coordinator 2), 2026-04-14
# =============================================================================

set -euo pipefail

# All custom-domain clones
DOMAINS=(
  "generateailogo.com"
  "aiproductphotomaker.com"
  "airoomredesigner.com"
  "mangaartai.com"
  "removebgapp.com"
  "smartaiupscaler.com"
)

# Symply AI subdomain clones (non-custom-domain tier)
SUBDOMAINS=(
  "anime.symplyai.io"
  "avatar.symplyai.io"
  "baby.symplyai.io"
  "birthday.symplyai.io"
  "chart.symplyai.io"
  "chart-data.symplyai.io"
  "coloring.symplyai.io"
  "face-swap.symplyai.io"
  "hairstyle.symplyai.io"
  "headshots.symplyai.io"
  "icon.symplyai.io"
  "meme.symplyai.io"
  "music.symplyai.io"
  "outfit.symplyai.io"
  "pet.symplyai.io"
  "photo-restore.symplyai.io"
  "presentation.symplyai.io"
  "qr-art.symplyai.io"
  "qr-code.symplyai.io"
  "resume-photo.symplyai.io"
  "storybook.symplyai.io"
  "tattoo.symplyai.io"
  "tts.symplyai.io"
  "video.symplyai.io"
  "wallpaper.symplyai.io"
  "watercolor.symplyai.io"
)

CHECK_STRING=""
CHECK_SUBDOMAINS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check-header)
      CHECK_STRING="$2"
      shift 2
      ;;
    --all)
      CHECK_SUBDOMAINS=true
      shift
      ;;
    *)
      echo "Usage: $0 [--check-header 'string to find'] [--all]"
      exit 1
      ;;
  esac
done

echo "================================================================"
echo "  FLEET DEPLOY VERIFICATION"
echo "  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ -n "$CHECK_STRING" ]]; then
  echo "  Checking for: '$CHECK_STRING'"
fi
echo "================================================================"
echo ""

PASS=0
FAIL=0

check_domain() {
  local domain="$1"
  local url="https://$domain"

  # Check homepage HTTP status
  local status
  status=$(curl -sL --max-time 15 -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [[ "$status" == "200" ]]; then
    echo -n "  [PASS] $domain -> HTTP $status"
    ((PASS++))

    # If checking for a specific string
    if [[ -n "$CHECK_STRING" ]]; then
      local body
      body=$(curl -sL --max-time 15 "$url" 2>/dev/null)
      if echo "$body" | grep -q "$CHECK_STRING"; then
        echo " | '$CHECK_STRING' found"
      else
        echo " | '$CHECK_STRING' NOT FOUND — deploy may be stale"
        ((FAIL++))
        ((PASS--))
      fi
    else
      echo ""
    fi
  else
    echo "  [FAIL] $domain -> HTTP $status"
    ((FAIL++))
  fi
}

echo "── Custom Domain Clones ──"
for domain in "${DOMAINS[@]}"; do
  check_domain "$domain"
done

if $CHECK_SUBDOMAINS; then
  echo ""
  echo "── Subdomain Clones ──"
  for domain in "${SUBDOMAINS[@]}"; do
    check_domain "$domain"
  done
fi

echo ""
echo "================================================================"
echo "  SUMMARY: $PASS passed | $FAIL failed"
echo "================================================================"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
