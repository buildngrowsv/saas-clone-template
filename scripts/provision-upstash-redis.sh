#!/usr/bin/env bash
# =============================================================================
# provision-upstash-redis.sh — Create shared Upstash Redis DB + wire to fleet
# =============================================================================
#
# PURPOSE:
# End-to-end automation for the #1 fleet revenue blocker: Upstash Redis not
# provisioned. Creates one shared database and sets UPSTASH_REDIS_REST_URL +
# UPSTASH_REDIS_REST_TOKEN on all 15 clone Vercel projects that use the T018
# subscription token lifecycle (subscription-store.ts).
#
# PREREQUISITES:
# 1. Upstash account exists at console.upstash.com (buildngrowsv@gmail.com)
# 2. API key from console.upstash.com/account/api saved:
#    npx @upstash/cli auth login --email buildngrowsv@gmail.com --api-key <KEY>
#    OR: export UPSTASH_EMAIL=... UPSTASH_API_KEY=...
# 3. Vercel CLI authenticated (vercel whoami succeeds)
#
# USAGE:
#   bash scripts/provision-upstash-redis.sh              # dry run
#   bash scripts/provision-upstash-redis.sh --create-db   # create DB only
#   bash scripts/provision-upstash-redis.sh --wire        # wire env vars to Vercel
#   bash scripts/provision-upstash-redis.sh --all         # create DB + wire
#
# AUTHOR: Custom 3 (pane1776), 2026-04-14
# =============================================================================

set -uo pipefail

GITHUB_ROOT="/Users/ak/UserRoot/Github"
SECRETS_DIR="/Users/ak/UserRoot/.secrets"

CREATE_DB=false
WIRE=false

case "${1:-}" in
  --create-db) CREATE_DB=true ;;
  --wire)      WIRE=true ;;
  --all)       CREATE_DB=true; WIRE=true ;;
  *)           echo "DRY RUN — pass --create-db, --wire, or --all to execute" ;;
esac

# All 15 clones that use subscription-store.ts (T018 token lifecycle)
# ai-manga-generator already had activateToken fix (commit 4afaf0e)
CLONES=(
  "ai-anime-portrait-generator"
  "ai-background-remover"
  "ai-birthday-card-generator"
  "ai-chart-from-data"
  "ai-chart-generator"
  "ai-coloring-page-generator"
  "ai-image-upscaler"
  "ai-interior-design"
  "ai-logo-generator"
  "ai-manga-generator"
  "ai-mockup-generator"
  "ai-music-generator"
  "ai-product-photo-generator"
  "ai-qr-art-generator"
  "ai-tattoo-generator"
  "ai-text-to-speech"
)

# Step 1: Create the shared Redis database
if $CREATE_DB; then
  echo "=== Step 1: Creating shared Upstash Redis database ==="

  # Check if already exists
  EXISTING=$(npx @upstash/cli redis list --json 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for db in data:
        if 'symplyai' in db.get('database_name', '').lower() or 'clone-fleet' in db.get('database_name', '').lower():
            print(f\"{db['database_id']}|{db['endpoint']}|{db['rest_token']}\")
            break
except: pass
" 2>/dev/null)

  if [[ -n "$EXISTING" ]]; then
    echo "  Database already exists: ${EXISTING%%|*}"
    REST_URL="https://${EXISTING#*|}"
    REST_URL="${REST_URL%%|*}"
    REST_TOKEN="${EXISTING##*|}"
  else
    echo "  Creating 'symplyai-clone-fleet' in us-east-1..."
    CREATE_OUTPUT=$(npx @upstash/cli redis create \
      --name "symplyai-clone-fleet" \
      --region "us-east-1" \
      --json 2>&1)

    if [[ $? -ne 0 ]]; then
      echo "  [FAIL] Database creation failed:"
      echo "  $CREATE_OUTPUT"
      echo ""
      echo "  If auth failed, run first:"
      echo "    npx @upstash/cli auth login --email buildngrowsv@gmail.com --api-key <KEY>"
      exit 1
    fi

    REST_URL=$(echo "$CREATE_OUTPUT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"https://{data['endpoint']}\")" 2>/dev/null)

    REST_TOKEN=$(echo "$CREATE_OUTPUT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data['rest_token'])" 2>/dev/null)

    echo "  Database created successfully."
  fi

  echo "  REST_URL:   $REST_URL"
  echo "  REST_TOKEN: ${REST_TOKEN:0:20}..."

  # Save credentials
  mkdir -p "$SECRETS_DIR"
  printf '%s' "$REST_URL" > "$SECRETS_DIR/upstash-redis-rest-url.txt"
  printf '%s' "$REST_TOKEN" > "$SECRETS_DIR/upstash-redis-rest-token.txt"
  echo "  Credentials saved to $SECRETS_DIR/upstash-redis-*.txt"
  echo ""
fi

# Step 2: Wire env vars to all clone Vercel projects
if $WIRE; then
  echo "=== Step 2: Wiring UPSTASH_REDIS env vars to Vercel projects ==="

  # Read credentials
  if [[ -f "$SECRETS_DIR/upstash-redis-rest-url.txt" ]]; then
    REST_URL=$(cat "$SECRETS_DIR/upstash-redis-rest-url.txt")
    REST_TOKEN=$(cat "$SECRETS_DIR/upstash-redis-rest-token.txt")
  else
    echo "  [FAIL] No credentials found. Run --create-db first."
    exit 1
  fi

  WIRED=0
  SKIPPED=0
  FAILED=0

  for clone in "${CLONES[@]}"; do
    CLONE_DIR="$GITHUB_ROOT/$clone"

    if [[ ! -d "$CLONE_DIR" ]]; then
      echo "  [SKIP] $clone — directory not found"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    echo "  [WIRE] $clone"

    cd "$CLONE_DIR"

    # Check if already set
    EXISTING_URL=$(vercel env ls production 2>&1 | grep -c "UPSTASH_REDIS_REST_URL" || true)

    if [[ "$EXISTING_URL" -gt 0 ]]; then
      echo "         UPSTASH_REDIS_REST_URL already set — skipping (use Vercel dashboard to update)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    # Set both env vars using printf (no trailing newline)
    printf '%s' "$REST_URL" | vercel env add UPSTASH_REDIS_REST_URL production --yes 2>/dev/null
    URL_RC=$?

    printf '%s' "$REST_TOKEN" | vercel env add UPSTASH_REDIS_REST_TOKEN production --yes 2>/dev/null
    TOKEN_RC=$?

    if [[ $URL_RC -eq 0 && $TOKEN_RC -eq 0 ]]; then
      echo "         → env vars set successfully"
      WIRED=$((WIRED + 1))
    else
      echo "         → [FAIL] env var set failed (URL=$URL_RC, TOKEN=$TOKEN_RC)"
      FAILED=$((FAILED + 1))
    fi

    cd "$GITHUB_ROOT"
  done

  echo ""
  echo "================================================================"
  echo "  WIRED: $WIRED | SKIPPED: $SKIPPED | FAILED: $FAILED"
  echo "================================================================"

  if [[ $WIRED -gt 0 ]]; then
    echo ""
    echo "  IMPORTANT: Trigger redeployment for env vars to take effect."
    echo "  For each wired project, run:"
    echo "    cd /Users/ak/UserRoot/Github/<clone> && vercel --prod --yes"
    echo ""
    echo "  Or use fleet-env-deploy.sh to redeploy all at once."
  fi
fi

# Dry run summary
if ! $CREATE_DB && ! $WIRE; then
  echo ""
  echo "=== DRY RUN SUMMARY ==="
  echo "This script will:"
  echo "  1. Create shared Upstash Redis database 'symplyai-clone-fleet' (us-east-1)"
  echo "  2. Save credentials to $SECRETS_DIR/upstash-redis-*.txt"
  echo "  3. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN on ${#CLONES[@]} Vercel projects"
  echo ""
  echo "Clones to wire:"
  for clone in "${CLONES[@]}"; do
    echo "    $clone"
  done
  echo ""
  echo "Prerequisites:"
  echo "  1. Upstash account at console.upstash.com (buildngrowsv@gmail.com)"
  echo "  2. npx @upstash/cli auth login --email buildngrowsv@gmail.com --api-key <KEY>"
  echo "  3. Vercel CLI authenticated (vercel whoami)"
  echo ""
  echo "Run: bash scripts/provision-upstash-redis.sh --all"
fi
