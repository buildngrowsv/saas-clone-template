#!/usr/bin/env bash
#
# fleet-structured-data-audit.sh — Validate JSON-LD structured data across DD clone fleet.
#
# Checks each branded DD clone domain for required JSON-LD types on key pages:
#   - Homepage (/):        SoftwareApplication
#   - /pricing:            FAQPage, BreadcrumbList
#   - /use-cases/* (first): HowTo (if pSEO routes exist)
#   - /best/* (first):     ItemList (if pSEO routes exist)
#
# Output: per-clone pass/fail table with type details.
#
# Usage:
#   ./scripts/fleet-structured-data-audit.sh
#   ./scripts/fleet-structured-data-audit.sh --verbose    # show JSON-LD snippets
#   ./scripts/fleet-structured-data-audit.sh --json       # machine-readable output
#
# Created: 2026-04-15 (Scout 1 — pane1776)

set -euo pipefail

VERBOSE=false
JSON_OUTPUT=false
for arg in "$@"; do
  case "$arg" in
    --verbose) VERBOSE=true ;;
    --json) JSON_OUTPUT=true ;;
  esac
done

DD_DOMAINS=(
  generateailogo.com
  removebgapp.com
  smartaiupscaler.com
  mangaartai.com
  airoomredesigner.com
  aiproductphotomaker.com
)

# Extract JSON-LD @type values from HTML using Python.
# Reads HTML from stdin, outputs one @type per line (or NONE).
#
# NOTE: Uses python3 -c (not heredoc) so that shell stdin (piped HTML)
# flows through to sys.stdin.read() without heredoc consuming it.
JSONLD_EXTRACTOR_PY='
import sys, json
from html.parser import HTMLParser

class JSONLDExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_jsonld = False
        self.scripts = []
        self.current = ""

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "script" and d.get("type") == "application/ld+json":
            self.in_jsonld = True
            self.current = ""

    def handle_data(self, data):
        if self.in_jsonld:
            self.current += data

    def handle_endtag(self, tag):
        if tag == "script" and self.in_jsonld:
            self.in_jsonld = False
            self.scripts.append(self.current.strip())

parser = JSONLDExtractor()
parser.feed(sys.stdin.read())

types = []
for script in parser.scripts:
    try:
        data = json.loads(script)
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "@type" in item:
                    types.append(item["@type"])
        elif isinstance(data, dict):
            if "@type" in data:
                types.append(data["@type"])
            if "@graph" in data:
                for item in data["@graph"]:
                    if isinstance(item, dict) and "@type" in item:
                        types.append(item["@type"])
    except json.JSONDecodeError:
        types.append("INVALID_JSON")

if types:
    print("\n".join(types))
else:
    print("NONE")
'

extract_jsonld_types() {
  python3 -c "$JSONLD_EXTRACTOR_PY"
}

# Check if a list of types contains a required type
has_type() {
  local types="$1"
  local required="$2"
  echo "$types" | grep -q "^${required}$"
}

# Get first pSEO slug from sitemap
get_first_slug() {
  local domain="$1"
  local prefix="$2"
  local sitemap
  sitemap=$(curl -s "https://${domain}/sitemap.xml" --connect-timeout 10 2>/dev/null)
  echo "$sitemap" | grep -oE "https://${domain}${prefix}/[^<]+" | head -1
}

# Main audit
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_CHECKS=0
RESULTS=()

printf "\n%-28s %-12s %-14s %-14s %-10s %-10s\n" "DOMAIN" "HOME:SApp" "PRICING:FAQ" "PRICING:BList" "UC:HowTo" "BEST:IList"
printf "%-28s %-12s %-14s %-14s %-10s %-10s\n" "----------------------------" "------------" "--------------" "--------------" "----------" "----------"

for domain in "${DD_DOMAINS[@]}"; do
  home_pass="—"
  pricing_faq_pass="—"
  pricing_blist_pass="—"
  uc_pass="—"
  best_pass="—"

  # 1. Homepage — SoftwareApplication
  # Check both / and /en/ — next-intl sites may have JSON-LD only in [locale]/layout
  home_html=$(curl -sL "https://${domain}/" --connect-timeout 10 2>/dev/null)
  home_html_locale=$(curl -sL "https://${domain}/en" --connect-timeout 10 2>/dev/null)
  if [ -n "$home_html_locale" ]; then
    locale_count=$(echo "$home_html_locale" | grep -o 'application/ld+json' | wc -l | tr -d ' ')
    base_count=$(echo "$home_html" | grep -o 'application/ld+json' | wc -l | tr -d ' ')
    if [ "$locale_count" -gt "$base_count" ]; then
      home_html="$home_html_locale"
    fi
  fi
  if [ -n "$home_html" ]; then
    home_types=$(echo "$home_html" | extract_jsonld_types 2>/dev/null || echo "ERROR")
    if has_type "$home_types" "SoftwareApplication"; then
      home_pass="PASS"
      TOTAL_PASS=$((TOTAL_PASS + 1))
    else
      home_pass="FAIL"
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
      if $VERBOSE; then echo "  [HOME] $domain types: $home_types"; fi
    fi
  else
    home_pass="DOWN"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # 2. /pricing — FAQPage + BreadcrumbList
  # Next-intl middleware rewrites /pricing to /en/pricing but RSC streaming may
  # not include nested layout JSON-LD in the initial curl response. Check both
  # paths and use whichever has more JSON-LD types (the locale-prefixed version
  # always includes nested layout scripts in SSR output).
  pricing_html=$(curl -sL "https://${domain}/pricing" --connect-timeout 10 2>/dev/null)
  pricing_html_locale=$(curl -sL "https://${domain}/en/pricing" --connect-timeout 10 2>/dev/null)
  # Use the locale-prefixed version if it has more JSON-LD (always does for next-intl sites)
  if [ -n "$pricing_html_locale" ]; then
    locale_count=$(echo "$pricing_html_locale" | grep -o 'application/ld+json' | wc -l | tr -d ' ')
    base_count=$(echo "$pricing_html" | grep -o 'application/ld+json' | wc -l | tr -d ' ')
    if [ "$locale_count" -gt "$base_count" ]; then
      pricing_html="$pricing_html_locale"
    fi
  fi
  if [ -n "$pricing_html" ]; then
    pricing_types=$(echo "$pricing_html" | extract_jsonld_types 2>/dev/null || echo "ERROR")

    if has_type "$pricing_types" "FAQPage"; then
      pricing_faq_pass="PASS"
      TOTAL_PASS=$((TOTAL_PASS + 1))
    else
      pricing_faq_pass="FAIL"
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
      if $VERBOSE; then echo "  [PRICING:FAQ] $domain types: $pricing_types"; fi
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if has_type "$pricing_types" "BreadcrumbList"; then
      pricing_blist_pass="PASS"
      TOTAL_PASS=$((TOTAL_PASS + 1))
    else
      pricing_blist_pass="FAIL"
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
      if $VERBOSE; then echo "  [PRICING:BList] $domain types: $pricing_types"; fi
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  else
    pricing_faq_pass="DOWN"
    pricing_blist_pass="DOWN"
    TOTAL_FAIL=$((TOTAL_FAIL + 2))
    TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
  fi

  # 3. /use-cases/[first-slug] — HowTo
  uc_url=$(get_first_slug "$domain" "/use-cases")
  if [ -n "$uc_url" ]; then
    uc_html=$(curl -sL "$uc_url" --connect-timeout 10 2>/dev/null)
    if [ -n "$uc_html" ]; then
      uc_types=$(echo "$uc_html" | extract_jsonld_types 2>/dev/null || echo "ERROR")
      if has_type "$uc_types" "HowTo"; then
        uc_pass="PASS"
        TOTAL_PASS=$((TOTAL_PASS + 1))
      else
        uc_pass="FAIL"
        TOTAL_FAIL=$((TOTAL_FAIL + 1))
        if $VERBOSE; then echo "  [UC:HowTo] $domain ($uc_url) types: $uc_types"; fi
      fi
    else
      uc_pass="DOWN"
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
    fi
  else
    uc_pass="N/A"
  fi
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  # 4. /best/[first-slug] — ItemList
  best_url=$(get_first_slug "$domain" "/best")
  if [ -n "$best_url" ]; then
    best_html=$(curl -sL "$best_url" --connect-timeout 10 2>/dev/null)
    if [ -n "$best_html" ]; then
      best_types=$(echo "$best_html" | extract_jsonld_types 2>/dev/null || echo "ERROR")
      if has_type "$best_types" "ItemList"; then
        best_pass="PASS"
        TOTAL_PASS=$((TOTAL_PASS + 1))
      else
        best_pass="FAIL"
        TOTAL_FAIL=$((TOTAL_FAIL + 1))
        if $VERBOSE; then echo "  [BEST:IList] $domain ($best_url) types: $best_types"; fi
      fi
    else
      best_pass="DOWN"
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
    fi
  else
    best_pass="N/A"
  fi
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  printf "%-28s %-12s %-14s %-14s %-10s %-10s\n" "$domain" "$home_pass" "$pricing_faq_pass" "$pricing_blist_pass" "$uc_pass" "$best_pass"

  RESULTS+=("$domain|$home_pass|$pricing_faq_pass|$pricing_blist_pass|$uc_pass|$best_pass")
done

echo ""
echo "SUMMARY: $TOTAL_PASS/$TOTAL_CHECKS passed, $TOTAL_FAIL failed"
echo ""

if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo "FAILED CHECKS:"
  for r in "${RESULTS[@]}"; do
    IFS='|' read -r dom h pf pb uc best <<< "$r"
    [ "$h" = "FAIL" ] && echo "  $dom: Homepage missing SoftwareApplication"
    [ "$pf" = "FAIL" ] && echo "  $dom: /pricing missing FAQPage"
    [ "$pb" = "FAIL" ] && echo "  $dom: /pricing missing BreadcrumbList"
    [ "$uc" = "FAIL" ] && echo "  $dom: /use-cases/ missing HowTo"
    [ "$best" = "FAIL" ] && echo "  $dom: /best/ missing ItemList"
  done
fi
