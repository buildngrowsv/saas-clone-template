#!/usr/bin/env bash
# fleet-health-check.sh — Quick fleet-wide health audit for all ai-* clones.
#
# WHY THIS EXISTS:
# With 40+ AI tool clones, infrastructure gaps (missing robots.txt, no 404
# page, broken env validation) silently accumulate. This script runs in under
# 10 seconds and outputs a markdown table showing exactly what each clone
# has and what it's missing.
#
# USAGE:
#   bash scripts/fleet-health-check.sh              # Run from template root
#   bash scripts/fleet-health-check.sh /path/to/Github  # Specify parent dir
#
# OUTPUT:
#   Markdown table to stdout. Pipe to a file for docs:
#   bash scripts/fleet-health-check.sh > tmp/fleet-health.md
#
# CHECKS (each column is a Y/N):
#   VE  = validate-env in build command
#   ROB = robots.txt or robots.ts
#   SIT = sitemap.ts
#   404 = not-found.tsx
#   ERR = error.tsx
#   GA4 = GoogleAnalytics component
#   COO = Cookie consent component
#   SEC = Security headers in next.config
#   LEG = Privacy + Terms pages
#   JLD = JSON-LD structured data
#   HLT = /api/health endpoint

set -uo pipefail

GITHUB_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

echo "# Fleet Health Check — $(date '+%Y-%m-%d %H:%M')"
echo ""
echo "| Repo | VE | ROB | SIT | 404 | ERR | GA4 | COO | SEC | LEG | JLD | HLT | Score |"
echo "|------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-------|"

total_repos=0
total_score=0

for repo_path in "$GITHUB_DIR"/ai-*/; do
  repo=$(basename "$repo_path")
  [ ! -f "$repo_path/package.json" ] && continue
  total_repos=$((total_repos + 1))
  score=0

  # VE: validate-env in build command
  build_line=$(grep '"build":' "$repo_path/package.json" 2>/dev/null || true)
  if echo "$build_line" | grep -q 'validate-env'; then VE="Y"; score=$((score + 1)); else VE="N"; fi

  # ROB: robots.txt or robots.ts
  if [ -f "$repo_path/public/robots.txt" ] || [ -f "$repo_path/src/app/robots.ts" ]; then
    ROB="Y"; score=$((score + 1))
  else ROB="N"; fi

  # SIT: sitemap
  sit_file=$(find "$repo_path/src/app" -name 'sitemap*' -type f 2>/dev/null | head -1)
  if [ -n "$sit_file" ]; then SIT="Y"; score=$((score + 1)); else SIT="N"; fi

  # 404: not-found page
  nf_file=$(find "$repo_path/src/app" -name 'not-found*' -type f 2>/dev/null | head -1)
  if [ -n "$nf_file" ]; then NF="Y"; score=$((score + 1)); else NF="N"; fi

  # ERR: error page
  err_file=$(find "$repo_path/src/app" -name 'error*' -type f 2>/dev/null | head -1)
  if [ -n "$err_file" ]; then ERR="Y"; score=$((score + 1)); else ERR="N"; fi

  # GA4: Google Analytics component
  ga_file=$(find "$repo_path/src" -name '*oogleAnalytics*' -type f 2>/dev/null | head -1)
  if [ -n "$ga_file" ]; then GA4="Y"; score=$((score + 1)); else GA4="N"; fi

  # COO: Cookie consent
  coo_file=$(find "$repo_path/src" -name '*ookie*onsent*' -type f 2>/dev/null | head -1)
  if [ -n "$coo_file" ]; then COO="Y"; score=$((score + 1)); else COO="N"; fi

  # SEC: Security headers
  config_file=$(ls "$repo_path"/next.config.* 2>/dev/null | head -1)
  if [ -n "$config_file" ] && grep -q 'X-Frame-Options\|Strict-Transport\|securityHeaders' "$config_file" 2>/dev/null; then
    SEC="Y"; score=$((score + 1))
  else SEC="N"; fi

  # LEG: Legal pages (privacy + terms)
  priv=$(find "$repo_path/src/app" -name 'privacy*' -type f 2>/dev/null -o -name 'privacy*' -type d 2>/dev/null | head -1)
  terms=$(find "$repo_path/src/app" -name 'terms*' -type f 2>/dev/null -o -name 'terms*' -type d 2>/dev/null | head -1)
  if [ -n "$priv" ] && [ -n "$terms" ]; then LEG="Y"; score=$((score + 1)); else LEG="N"; fi

  # JLD: JSON-LD structured data
  jld=$(grep -rl 'application/ld+json\|schema.org' "$repo_path/src/" 2>/dev/null | head -1)
  if [ -n "$jld" ]; then JLD="Y"; score=$((score + 1)); else JLD="N"; fi

  # HLT: Health endpoint
  hlt=$(find "$repo_path/src/app/api" -path '*/health*' -type f 2>/dev/null | head -1)
  if [ -n "$hlt" ]; then HLT="Y"; score=$((score + 1)); else HLT="N"; fi

  total_score=$((total_score + score))
  echo "| $repo | $VE | $ROB | $SIT | $NF | $ERR | $GA4 | $COO | $SEC | $LEG | $JLD | $HLT | $score/11 |"
done

max_possible=$((total_repos * 11))
pct=$((total_score * 100 / max_possible))
echo ""
echo "**Fleet score: $total_score / $max_possible ($pct%)**"
echo "**Repos audited: $total_repos**"
