#!/usr/bin/env bash
# fleet-env-deploy.sh — Set environment variables across all fleet Vercel projects.
#
# WHY THIS EXISTS:
# 42 clone repos all need the same FAL_KEY and DATABASE_URL to function.
# Setting these manually in the Vercel dashboard (42 projects × 2+ vars = 84+
# manual operations) is the #1 operational blocker to revenue. This script
# uses the Vercel CLI to set env vars programmatically across the entire fleet.
#
# WHAT IT DOES:
# 1. Reads the fleet manifest (fleet-clones.json)
# 2. For each clone, checks if a Vercel project exists (via vercel ls)
# 3. Sets specified env vars using printf (no trailing newline — critical)
# 4. Reports success/failure per project
#
# WHAT IT DOES NOT DO:
# - Does NOT create Vercel projects (must be connected via dashboard first)
# - Does NOT store secrets in this script (reads from .secrets/ or args)
# - Does NOT redeploy (Vercel auto-deploys on next push if git-connected)
#
# USAGE:
#   bash scripts/fleet-env-deploy.sh --check                    # audit which vars are set
#   bash scripts/fleet-env-deploy.sh --set FAL_KEY              # set FAL_KEY from .secrets/
#   bash scripts/fleet-env-deploy.sh --set DATABASE_URL --value "postgres://..."  # set specific value
#   bash scripts/fleet-env-deploy.sh --set-all                  # set FAL_KEY + DATABASE_URL
#
# SAFETY:
# - Dry-run by default (add --apply to execute)
# - Uses printf '%s' to avoid trailing newline corruption
# - Never prints secret values (masks to first 8 chars)
#
# AUTHORED: flux-exec-4419, 2026-04-14

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$SCRIPT_DIR/fleet-clones.json"
SECRETS_DIR="/Users/ak/UserRoot/.secrets"

# Parse arguments
ACTION=""
VAR_NAME=""
VAR_VALUE=""
APPLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)   ACTION="check"; shift ;;
    --set)     ACTION="set"; VAR_NAME="$2"; shift 2 ;;
    --set-all) ACTION="set-all"; shift ;;
    --value)   VAR_VALUE="$2"; shift 2 ;;
    --apply)   APPLY=true; shift ;;
    *)         echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$ACTION" ]]; then
  echo "Usage: fleet-env-deploy.sh [--check | --set VAR_NAME | --set-all] [--value VAL] [--apply]"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq required" >&2
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: fleet manifest not found: $MANIFEST" >&2
  exit 1
fi

# Map known var names to their secret file
resolve_secret_value() {
  local var_name="$1"
  case "$var_name" in
    FAL_KEY)
      if [[ -f "$SECRETS_DIR/fal-ai-key.txt" ]]; then
        cat "$SECRETS_DIR/fal-ai-key.txt" | tr -d '\n'
      else
        echo ""
      fi
      ;;
    DATABASE_URL)
      if [[ -f "$SECRETS_DIR/neon-database-url.txt" ]]; then
        cat "$SECRETS_DIR/neon-database-url.txt" | tr -d '\n'
      else
        echo ""
      fi
      ;;
    *)
      echo ""
      ;;
  esac
}

mask_value() {
  local val="$1"
  if [[ ${#val} -gt 8 ]]; then
    echo "${val:0:8}..."
  else
    echo "****"
  fi
}

# Get clone names from manifest
CLONE_NAMES=$(jq -r '.clones[].name' "$MANIFEST")
TOTAL=$(echo "$CLONE_NAMES" | wc -l | tr -d ' ')

echo "# Fleet Env Deploy — $(date '+%Y-%m-%d %H:%M')"
echo "# Action: $ACTION"
echo "# Fleet size: $TOTAL clones"
if [[ "$APPLY" == false && "$ACTION" != "check" ]]; then
  echo "# Mode: DRY-RUN (add --apply to execute)"
fi
echo ""

# ─── CHECK: Audit which repos have Vercel projects ───────────────────────
if [[ "$ACTION" == "check" ]]; then
  echo "# Checking Vercel project status for fleet..."
  echo ""
  HAS_PROJECT=0
  NO_PROJECT=0

  for name in $CLONE_NAMES; do
    repo_path="/Users/ak/UserRoot/Github/$name"
    if [[ ! -d "$repo_path" ]]; then
      echo "  MISSING  $name (no local repo)"
      continue
    fi

    # Check if .vercel/project.json exists (linked to Vercel)
    if [[ -f "$repo_path/.vercel/project.json" ]]; then
      project_id=$(jq -r '.projectId // "unknown"' "$repo_path/.vercel/project.json" 2>/dev/null)
      echo "  LINKED   $name (projectId: ${project_id:0:12}...)"
      HAS_PROJECT=$((HAS_PROJECT + 1))
    else
      echo "  UNLINKED $name (no .vercel/project.json)"
      NO_PROJECT=$((NO_PROJECT + 1))
    fi
  done

  echo ""
  echo "# Summary: $HAS_PROJECT linked, $NO_PROJECT unlinked"
  exit 0
fi

# ─── SET: Deploy a single env var ────────────────────────────────────────
deploy_env_var() {
  local var_name="$1"
  local var_value="$2"

  if [[ -z "$var_value" ]]; then
    echo "  ERROR: No value for $var_name (check .secrets/ or --value)"
    return 1
  fi

  local masked
  masked=$(mask_value "$var_value")
  echo "# Setting $var_name = $masked across fleet"
  echo ""

  local ok=0
  local fail=0
  local skip=0

  for name in $CLONE_NAMES; do
    repo_path="/Users/ak/UserRoot/Github/$name"

    if [[ ! -d "$repo_path" ]]; then
      echo "  SKIP     $name (no local repo)"
      skip=$((skip + 1))
      continue
    fi

    if [[ ! -f "$repo_path/.vercel/project.json" ]]; then
      echo "  SKIP     $name (not linked to Vercel)"
      skip=$((skip + 1))
      continue
    fi

    if [[ "$APPLY" == true ]]; then
      # Use printf to avoid trailing newline (critical for auth tokens)
      # --force overwrites existing value without prompting
      if printf '%s' "$var_value" | (cd "$repo_path" && vercel env add "$var_name" production --force 2>/dev/null); then
        echo "  SET      $name"
        ok=$((ok + 1))
      else
        echo "  FAIL     $name"
        fail=$((fail + 1))
      fi
    else
      echo "  WOULD    $name"
      ok=$((ok + 1))
    fi
  done

  echo ""
  echo "# $var_name Results: $ok set, $fail failed, $skip skipped"
}

if [[ "$ACTION" == "set" ]]; then
  # Resolve value: --value flag > .secrets/ file
  if [[ -z "$VAR_VALUE" ]]; then
    VAR_VALUE=$(resolve_secret_value "$VAR_NAME")
  fi
  deploy_env_var "$VAR_NAME" "$VAR_VALUE"
fi

if [[ "$ACTION" == "set-all" ]]; then
  echo "# Deploying all revenue-critical env vars"
  echo ""

  # FAL_KEY
  fal_value=$(resolve_secret_value "FAL_KEY")
  if [[ -n "$fal_value" ]]; then
    deploy_env_var "FAL_KEY" "$fal_value"
  else
    echo "# SKIP FAL_KEY — no secret file at $SECRETS_DIR/fal-ai-key.txt"
  fi

  echo ""

  # DATABASE_URL
  db_value=$(resolve_secret_value "DATABASE_URL")
  if [[ -n "$db_value" ]]; then
    deploy_env_var "DATABASE_URL" "$db_value"
  else
    echo "# SKIP DATABASE_URL — no secret file at $SECRETS_DIR/neon-database-url.txt"
    echo "# Create the Neon project first, then save the URL to $SECRETS_DIR/neon-database-url.txt"
  fi
fi

echo ""
if [[ "$APPLY" == false && "$ACTION" != "check" ]]; then
  echo "# Dry-run complete. Re-run with --apply to execute."
fi
