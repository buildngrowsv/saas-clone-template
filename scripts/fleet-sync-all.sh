#!/usr/bin/env bash
# fleet-sync-all.sh — Run sync-from-template.sh across every clone in
# fleet-clones.json. Dry-run by default; --apply writes branches.
#
# WHY: SYNC-PROCEDURE.md §"Recommended follow-up work" (2) — fleet sweep
# runner. Turns a 20-clone manual wave into one command.
#
# USAGE:
#   fleet-sync-all.sh            # dry-run every clone
#   fleet-sync-all.sh --apply    # create sync/template-YYYYMMDD branch
#                                # in each clone, copy allow-list, run
#                                # env:validate, leave uncommitted for PR
#
# SAFETY: per-clone work happens on a fresh branch. Never commits. Never
# pushes. Operator reviews each clone's diff before merging.

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_ROOT="$(cd "$SCRIPT_DIRECTORY/.." && pwd)"
MANIFEST="$SCRIPT_DIRECTORY/fleet-clones.json"
SYNC_SCRIPT="$SCRIPT_DIRECTORY/sync-from-template.sh"

MODE="dry-run"
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

BRANCH_NAME="sync/template-$(date +%Y%m%d)"
CLONE_PATHS=$(jq -r '.clones[].local_path' "$MANIFEST")

echo "[fleet] Template: $TEMPLATE_ROOT"
echo "[fleet] Mode:     $MODE"
echo "[fleet] Branch:   $BRANCH_NAME (apply mode only)"
echo ""

TOTAL=0
OK=0
SKIPPED=0
FAILED=0

for clone_path in $CLONE_PATHS; do
  TOTAL=$((TOTAL + 1))
  clone_name=$(basename "$clone_path")
  echo "──── $clone_name ($clone_path) ────"

  if [[ ! -d "$clone_path" ]]; then
    echo "  SKIP: directory missing"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [[ "$MODE" == "apply" ]]; then
    if [[ ! -d "$clone_path/.git" ]]; then
      echo "  SKIP: not a git repo"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi
    if ! (cd "$clone_path" && git diff --quiet && git diff --cached --quiet); then
      echo "  SKIP: uncommitted changes (commit or stash first)"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi
    (cd "$clone_path" && git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME")
    if "$SYNC_SCRIPT" "$clone_path" --apply; then
      echo "  OK: files copied on branch $BRANCH_NAME (not committed)"
      if [[ -f "$clone_path/package.json" ]] && grep -q '"env:validate"' "$clone_path/package.json" 2>/dev/null; then
        (cd "$clone_path" && npm run env:validate) || echo "  WARN: env:validate reported issues"
      fi
      OK=$((OK + 1))
    else
      echo "  FAIL: sync script errored"
      FAILED=$((FAILED + 1))
    fi
  else
    if "$SYNC_SCRIPT" "$clone_path"; then
      OK=$((OK + 1))
    else
      FAILED=$((FAILED + 1))
    fi
  fi
  echo ""
done

echo "[fleet] Summary: $TOTAL total, $OK ok, $SKIPPED skipped, $FAILED failed"
if [[ "$MODE" == "dry-run" ]]; then
  echo "[fleet] Dry-run. Re-run with --apply to create branches + copy files."
fi
