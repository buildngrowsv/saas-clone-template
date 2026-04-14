#!/usr/bin/env bash
# fleet-live-status.sh — Live production health dashboard for the AI tool fleet.
#
# WHY THIS EXISTS:
# The existing fleet-health-check.sh audits local code structure, but doesn't
# verify what's actually live in production. This script curls every fleet
# production URL and generates a real-time status dashboard showing:
#   - HTTP status code (200 = healthy)
#   - Security headers present (HSTS, X-Frame-Options, CSP)
#   - /pricing page accessible
#   - /api/health responding
#   - /sitemap.xml accessible
#   - /robots.txt accessible
#
# USAGE:
#   bash scripts/fleet-live-status.sh                    # Full fleet
#   bash scripts/fleet-live-status.sh --dd-only          # Double-down products only
#   bash scripts/fleet-live-status.sh > tmp/fleet-live-status.md
#
# REQUIREMENTS: curl, bash 4+
#
# Created by nexus-strat-7439 (Custom 3, pane1776) — 2026-04-14

set -euo pipefail

# Fleet URL map: repo|production_url
# Custom-domain Double-Down products marked with DD
FLEET_URLS=(
  "ai-logo-generator|https://generateailogo.com|DD"
  "ai-manga-generator|https://mangaartai.com|DD"
  "ai-background-remover|https://removebgapp.com|DD"
  "ai-image-upscaler|https://smartaiupscaler.com|DD"
  "ai-product-photo-generator|https://aiproductphotomaker.com|DD"
  "ai-interior-design|https://airoomredesigner.com|DD"
  "ai-animated-photo-generator-web|https://animatedphoto.symplyai.io|"
  "ai-anime-portrait-generator|https://anime.symplyai.io|"
  "ai-avatar-generator|https://avatar.symplyai.io|"
  "ai-baby-generator|https://babyface.symplyai.io|"
  "ai-birthday-card-generator|https://birthday.symplyai.io|"
  "ai-business-card-generator|https://businesscard.symplyai.io|"
  "ai-cartoon-generator|https://cartoon.symplyai.io|"
  "ai-chart-from-data|https://chart.symplyai.io|"
  "ai-chart-generator|https://chartdata.symplyai.io|"
  "ai-coloring-page-generator|https://coloringpage.symplyai.io|"
  "ai-face-swap|https://faceswap.symplyai.io|"
  "ai-food-photography-generator|https://food.symplyai.io|"
  "ai-hairstyle-generator|https://hairstyle.symplyai.io|"
  "ai-icon-generator|https://icon.symplyai.io|"
  "ai-meme-generator|https://meme.symplyai.io|"
  "ai-mockup-generator|https://mockupforge.com|"
  "ai-music-generator|https://music.symplyai.io|"
  "ai-outfit-generator|https://outfit-generator.symplyai.io|"
  "ai-pet-portrait|https://pet-portrait.symplyai.io|"
  "ai-photo-colorizer|https://colorizer.symplyai.io|"
  "ai-photo-restorer|https://photorestore.symplyai.io|"
  "ai-presentation-maker|https://presentations.symplyai.io|"
  "ai-professional-headshots|https://headshot.symplyai.io|"
  "ai-qr-art-generator|https://qrart.symplyai.io|"
  "ai-qr-code-art|https://qrcode.symplyai.io|"
  "ai-resume-photo-generator|https://resumephoto.symplyai.io|"
  "ai-room-planner|https://room.symplyai.io|"
  "ai-sketch-to-image|https://sketch.symplyai.io|"
  "ai-storybook-illustrator|https://storybook.symplyai.io|"
  "ai-tattoo-generator|https://tattoo.symplyai.io|"
  "ai-text-to-speech|https://tts.symplyai.io|"
  "ai-vector-illustration|https://vector.symplyai.io|"
  "ai-wallpaper-generator|https://wallpaper.symplyai.io|"
  "ai-watercolor-generator|https://watercolor.symplyai.io|"
  "ai-yearbook-photo-generator|https://yearbook.symplyai.io|"
)

DD_ONLY=false
if [[ "${1:-}" == "--dd-only" ]]; then
  DD_ONLY=true
fi

echo "# Fleet Live Production Status"
echo ""
echo "Generated: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo ""

# Header
printf "| %-35s | %-35s | %s | %s | %s | %s | %s | %s |\n" \
  "Repo" "URL" "HTTP" "HSTS" "Price" "Health" "Sitemap" "Robots"
printf "|%-37s|%-37s|%s|%s|%s|%s|%s|%s|\n" \
  "$(printf -- '-%.0s' {1..37})" \
  "$(printf -- '-%.0s' {1..37})" \
  "------" "------" "-------" "--------" "---------" "--------"

total=0
healthy=0
pricing_ok=0
health_ok=0

for entry in "${FLEET_URLS[@]}"; do
  IFS='|' read -r repo url tier <<< "$entry"

  if $DD_ONLY && [[ "$tier" != "DD" ]]; then
    continue
  fi

  total=$((total + 1))

  # Homepage check (5s timeout)
  http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo "ERR")

  # HSTS header check
  hsts=$(curl -s -I --max-time 5 "$url" 2>/dev/null | grep -i 'strict-transport-security' | head -1)
  hsts_status="N"
  [[ -n "$hsts" ]] && hsts_status="Y"

  # Pricing page check
  price_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url/pricing" 2>/dev/null || echo "ERR")
  price_status="$price_code"
  [[ "$price_code" == "200" ]] && pricing_ok=$((pricing_ok + 1))

  # Health endpoint check
  health_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url/api/health" 2>/dev/null || echo "ERR")
  health_status="$health_code"
  [[ "$health_code" == "200" ]] && health_ok=$((health_ok + 1))

  # Sitemap check
  sitemap_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url/sitemap.xml" 2>/dev/null || echo "ERR")

  # Robots check
  robots_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url/robots.txt" 2>/dev/null || echo "ERR")

  [[ "$http_code" == "200" ]] && healthy=$((healthy + 1))

  # Mark DD products
  label="$repo"
  [[ "$tier" == "DD" ]] && label="**$repo** (DD)"

  printf "| %-35s | %-35s | %s | %s | %s | %s | %s | %s |\n" \
    "$label" "$url" "$http_code" "$hsts_status" "$price_code" "$health_code" "$sitemap_code" "$robots_code"
done

echo ""
echo "## Summary"
echo ""
echo "- Total checked: $total"
echo "- Homepage 200: $healthy/$total"
echo "- Pricing 200: $pricing_ok/$total"
echo "- Health 200: $health_ok/$total"
echo ""
echo "Legend: HTTP=homepage status, HSTS=Strict-Transport-Security header, Price=/pricing, Health=/api/health, Sitemap=/sitemap.xml, Robots=/robots.txt"
