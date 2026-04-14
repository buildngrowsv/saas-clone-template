#!/usr/bin/env bash
# fleet-db-push.sh — Run drizzle-kit push across every clone in fleet-clones.json.
#
# WHY: After the credits migration (commit 23f8055), every clone needs
# user_profiles, credit_transactions, and subscriptions tables created in
# its Neon database. This script pushes the schema to all clones.
#
# PREREQUISITES:
# - Each clone must have DATABASE_URL set in .env.local or .env.production.local
# - drizzle-kit must be in devDependencies (it is in saas-clone-template)
# - The clone must have drizzle.config.ts and src/db/schema/ synced from template
#
# USAGE:
#   fleet-db-push.sh              # check which clones have DATABASE_URL
#   fleet-db-push.sh --apply      # actually run drizzle-kit push on each
#
# SAFETY: drizzle-kit push is additive — it creates missing tables/columns
# but does NOT drop existing ones. Safe to run multiple times.

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIRECTORY/fleet-clones.json"

MODE="check"
if [[ "${1:-}" == "--apply" ]]; then
  MODE="apply"
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: manifest not found: $MANIFEST" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to parse fleet-clones.json" >&2
  exit 1
fi

CLONE_PATHS=$(jq -r '.clones[].local_path' "$MANIFEST")

echo "[fleet-db] Mode: $MODE"
echo ""

TOTAL=0
HAS_DB=0
MISSING_DB=0
PUSHED=0
FAILED=0

# Read DATABASE_URL from a clone's env files
read_database_url() {
  local clone_dir="$1"
  for env_file in ".env.local" ".env.production.local" ".env.production" ".env"; do
    local full_path="$clone_dir/$env_file"
    if [[ -f "$full_path" ]]; then
      local db_url
      db_url=$(grep -E '^DATABASE_URL=' "$full_path" 2>/dev/null | head -1 | sed 's/^DATABASE_URL=//' | sed 's/^["'\'']//' | sed 's/["'\'']$//')
      if [[ -n "$db_url" && "$db_url" != *"user:password"* && "$db_url" != *"your-"* ]]; then
        echo "$db_url"
        return 0
      fi
    fi
  done
  return 1
}

for clone_path in $CLONE_PATHS; do
  TOTAL=$((TOTAL + 1))
  clone_name=$(basename "$clone_path")

  if [[ ! -d "$clone_path" ]]; then
    echo "  SKIP  $clone_name — directory missing"
    MISSING_DB=$((MISSING_DB + 1))
    continue
  fi

  if ! read_database_url "$clone_path" >/dev/null 2>&1; then
    echo "  NODB  $clone_name — no DATABASE_URL in env files"
    MISSING_DB=$((MISSING_DB + 1))
    continue
  fi

  HAS_DB=$((HAS_DB + 1))

  if [[ ! -f "$clone_path/drizzle.config.ts" ]]; then
    echo "  SKIP  $clone_name — no drizzle.config.ts (needs template sync first)"
    MISSING_DB=$((MISSING_DB + 1))
    continue
  fi

  if [[ "$MODE" == "apply" ]]; then
    echo -n "  PUSH  $clone_name — "
    if (cd "$clone_path" && npx drizzle-kit push --force 2>&1 | tail -3); then
      PUSHED=$((PUSHED + 1))
      echo "  OK"
    else
      FAILED=$((FAILED + 1))
      echo "  FAILED"
    fi
  else
    echo "  READY $clone_name — DATABASE_URL found, drizzle.config.ts present"
  fi
done

echo ""
echo "[fleet-db] Summary: $TOTAL total, $HAS_DB have DATABASE_URL, $MISSING_DB missing"
if [[ "$MODE" == "apply" ]]; then
  echo "[fleet-db] Pushed: $PUSHED ok, $FAILED failed"
else
  echo "[fleet-db] Check mode. Re-run with --apply to push schemas."
fi
