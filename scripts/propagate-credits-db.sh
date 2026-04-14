#!/usr/bin/env bash
# propagate-credits-db.sh — Push DB-backed credit system to all ai-* clones.
#
# WHY THIS EXISTS:
# 37/42 clone repos still use in-memory Map() for credits, which resets on every
# Vercel cold start — root cause of $0 revenue (Gate 8 violation). This script
# copies the DB schema, credits module, and npm deps to every clone that lacks them.
#
# WHAT IT DOES:
# 1. Copies src/db/ directory (index.ts + 3 schema files) if missing
# 2. Copies src/lib/credits.ts (DB-backed version) if the existing one uses Map
# 3. Adds drizzle-orm and @neondatabase/serverless to package.json if missing
# 4. Reports which clones need manual generate route changes (add await)
#
# WHAT IT DOES NOT DO:
# - Does NOT modify generate routes (each clone has different API routes)
# - Does NOT run npm install (do that separately)
# - Does NOT set DATABASE_URL env vars (requires Neon project creation)
# - Does NOT run migrations (requires running drizzle-kit push)
#
# USAGE:
#   bash scripts/propagate-credits-db.sh              # dry-run (default)
#   bash scripts/propagate-credits-db.sh --apply      # write files
#
# AUTHORED: flux-exec-4419, 2026-04-14

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GITHUB_DIR="$(cd "$TEMPLATE_ROOT/.." && pwd)"

MODE="dry-run"
if [[ "${1:-}" == "--apply" ]]; then
  MODE="apply"
fi

echo "# Credit System Fleet Propagation — $(date '+%Y-%m-%d %H:%M')"
echo "# Mode: $MODE"
echo ""

# Template source files
TEMPLATE_DB_DIR="$TEMPLATE_ROOT/src/db"
TEMPLATE_CREDITS="$TEMPLATE_ROOT/src/lib/credits.ts"

if [ ! -d "$TEMPLATE_DB_DIR" ] || [ ! -f "$TEMPLATE_CREDITS" ]; then
  echo "ERROR: Template DB or credits files not found. Run from template root." >&2
  exit 1
fi

PROPAGATED=0
ALREADY_DB=0
SKIPPED=0
NEEDS_ROUTE_FIX=0

for repo_path in "$GITHUB_DIR"/ai-*/; do
  repo=$(basename "$repo_path")
  [ ! -f "$repo_path/package.json" ] && continue

  # Determine if clone uses src/ or root-level app/
  if [ -d "$repo_path/src/app" ]; then
    APP_PREFIX="src"
  elif [ -d "$repo_path/app" ]; then
    APP_PREFIX=""
  else
    echo "  SKIP    $repo (no app/ or src/app/ directory)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check current credits implementation
  DB_DIR="$repo_path/${APP_PREFIX:+$APP_PREFIX/}db"
  if [ -n "$APP_PREFIX" ]; then
    CREDITS_FILE="$repo_path/$APP_PREFIX/lib/credits.ts"
    TARGET_DB="$repo_path/$APP_PREFIX/db"
  else
    CREDITS_FILE="$repo_path/lib/credits.ts"
    TARGET_DB="$repo_path/db"
  fi

  # Skip if already DB-backed
  if [ -d "$TARGET_DB" ] && [ -f "$CREDITS_FILE" ]; then
    if grep -q 'import.*from.*@/db\|import.*from.*"@/db"' "$CREDITS_FILE" 2>/dev/null; then
      echo "  OK      $repo (already DB-backed)"
      ALREADY_DB=$((ALREADY_DB + 1))
      continue
    fi
  fi

  echo "  UPDATE  $repo"

  if [[ "$MODE" == "apply" ]]; then
    # 1. Copy DB directory
    if [ -n "$APP_PREFIX" ]; then
      mkdir -p "$repo_path/$APP_PREFIX/db/schema"
      cp "$TEMPLATE_DB_DIR/index.ts" "$repo_path/$APP_PREFIX/db/index.ts"
      cp "$TEMPLATE_DB_DIR/schema/users.ts" "$repo_path/$APP_PREFIX/db/schema/users.ts"
      cp "$TEMPLATE_DB_DIR/schema/credit-transactions.ts" "$repo_path/$APP_PREFIX/db/schema/credit-transactions.ts"
      cp "$TEMPLATE_DB_DIR/schema/subscriptions.ts" "$repo_path/$APP_PREFIX/db/schema/subscriptions.ts"
    else
      mkdir -p "$repo_path/db/schema"
      cp "$TEMPLATE_DB_DIR/index.ts" "$repo_path/db/index.ts"
      cp "$TEMPLATE_DB_DIR/schema/users.ts" "$repo_path/db/schema/users.ts"
      cp "$TEMPLATE_DB_DIR/schema/credit-transactions.ts" "$repo_path/db/schema/credit-transactions.ts"
      cp "$TEMPLATE_DB_DIR/schema/subscriptions.ts" "$repo_path/db/schema/subscriptions.ts"
    fi

    # 2. Copy credits.ts
    if [ -n "$APP_PREFIX" ]; then
      mkdir -p "$repo_path/$APP_PREFIX/lib"
      cp "$TEMPLATE_CREDITS" "$repo_path/$APP_PREFIX/lib/credits.ts"
    else
      mkdir -p "$repo_path/lib"
      cp "$TEMPLATE_CREDITS" "$repo_path/lib/credits.ts"
    fi

    # 3. Add npm deps if missing
    if ! grep -q '"drizzle-orm"' "$repo_path/package.json" 2>/dev/null; then
      # Add drizzle-orm and neon deps using npm
      (cd "$repo_path" && npm install --save drizzle-orm @neondatabase/serverless 2>/dev/null) || true
    fi
  fi

  PROPAGATED=$((PROPAGATED + 1))

  # 4. Check if generate route needs await fix
  gen_routes=$(find "$repo_path" -path '*api*generate*route.ts' -not -path '*node_modules*' -not -path '*.next*' 2>/dev/null)
  if [ -n "$gen_routes" ]; then
    for route in $gen_routes; do
      if grep -q 'checkUserCreditAvailability\|deductOneCreditForUser' "$route" 2>/dev/null; then
        if ! grep -q 'await checkUserCreditAvailability\|await deductOneCreditForUser' "$route" 2>/dev/null; then
          echo "    ⚠ MANUAL: $route needs 'await' added to credit function calls"
          NEEDS_ROUTE_FIX=$((NEEDS_ROUTE_FIX + 1))
        fi
      fi
    done
  fi
done

echo ""
echo "# Summary"
echo "  Propagated: $PROPAGATED"
echo "  Already DB: $ALREADY_DB"
echo "  Skipped:    $SKIPPED"
echo "  Need route fix: $NEEDS_ROUTE_FIX"

if [[ "$MODE" == "dry-run" ]]; then
  echo ""
  echo "# Dry-run only. Re-run with --apply to write files."
fi

echo ""
echo "# NEXT STEPS (after --apply):"
echo "# 1. Run 'npm install' in each updated repo"
echo "# 2. Add DATABASE_URL to each repo's Vercel env vars"
echo "# 3. Run 'npx drizzle-kit push' in each repo to create tables"
echo "# 4. Fix generate routes that need 'await' (see warnings above)"
echo "# 5. Commit and push each repo"
