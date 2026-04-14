#!/usr/bin/env bash
# sync-from-template.sh — Propagate upstream saas-clone-template fixes
# into one detached clone repo via a strict allow-list.
#
# WHY THIS EXISTS:
# Clones are created by `cp -r saas-clone-template/ my-new-clone/` (README
# Quick Start). After that one-shot copy they become detached forks with
# no git relationship back to the template. When the template gets a
# high-leverage fix (security headers, env validation, CVE bump), nothing
# propagates automatically. This script is the surgical tool that closes
# the gap without introducing git subtree/submodule complexity.
#
# SAFETY MODEL:
# - Dry-run by default. Prints a diff summary; does NOT write.
# - --apply writes files.
# - ALLOW_LIST: explicit files that flow downstream.
# - DENY_LIST: clone-owned files this script will refuse to touch even if
#   they appear in ALLOW_LIST (defense in depth).
# - Refuses to run if the target has uncommitted changes (avoid clobber).
#
# USAGE:
#   sync-from-template.sh <target_clone_path>          # dry-run
#   sync-from-template.sh <target_clone_path> --apply  # write
#
# AUTHORED: T18 pane1775 2026-04-08 (companion to SYNC-PROCEDURE.md).

set -euo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_ROOT="$(cd "$SCRIPT_DIRECTORY/.." && pwd)"

# Files that flow downstream. Keep this list tight and reviewed.
# Each entry is a path relative to the template root.
ALLOW_LIST=(
  "scripts/validate-env-configuration.mjs"
  "scripts/check-secrets.sh"
  "scripts/stamp-tests.sh"
  "scripts/install-secret-guard-hook.sh"
  "scripts/merge-pseo-middleware-paths.mjs"
  "scripts/merge-security-headers.mjs"
  "testing/templates/e2e/smoke.spec.ts"
  "vitest.config.ts"
  "src/app/api/health/route.ts"
  "src/app/not-found.tsx"
  "src/app/error.tsx"
  "src/app/robots.ts"
)

# NOTE (Builder 1, iron-viper-6183, T19 pane1775, 2026-04-08):
# next.config.ts was REMOVED from ALLOW_LIST. 38/41 fleet clones have
# per-product customizations in next.config.ts (next-intl plugin, custom
# headers, product-specific comments). Blindly overwriting it breaks i18n
# routing. Security headers from the template should be added to clones
# via a separate, additive script that merges headers into existing config
# rather than replacing the entire file.

# Files this script will NEVER overwrite even if listed above.
# These hold per-clone branding, copy, env, and pricing — touching them
# silently breaks production sites.
DENY_LIST=(
  "src/app/page.tsx"
  "src/app/layout.tsx"
  "src/config/site.ts"
  ".env.example"
  ".env.local"
  ".env.production"
  "README.md"
  "STATUS.md"
  "package.json"
  "package-lock.json"
)

# ─── Arg parsing ─────────────────────────────────────────────────────────
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <target_clone_path> [--apply]" >&2
  exit 2
fi

TARGET="$1"
MODE="dry-run"
if [[ "${2:-}" == "--apply" ]]; then
  MODE="apply"
fi

if [[ ! -d "$TARGET" ]]; then
  echo "ERROR: target directory does not exist: $TARGET" >&2
  exit 1
fi

TARGET="$(cd "$TARGET" && pwd)"

if [[ "$TARGET" == "$TEMPLATE_ROOT" ]]; then
  echo "ERROR: refusing to sync template into itself ($TARGET)" >&2
  exit 1
fi

# ─── Pre-flight: clean working tree ──────────────────────────────────────
if [[ "$MODE" == "apply" ]]; then
  if [[ -d "$TARGET/.git" ]]; then
    if ! (cd "$TARGET" && git diff --quiet && git diff --cached --quiet); then
      echo "ERROR: target has uncommitted changes. Commit or stash first:" >&2
      (cd "$TARGET" && git status --short) >&2
      exit 1
    fi
  else
    echo "WARN: target is not a git repo — no rollback available." >&2
  fi
fi

# ─── Sync loop ───────────────────────────────────────────────────────────
echo "[sync] Template: $TEMPLATE_ROOT"
echo "[sync] Target:   $TARGET"
echo "[sync] Mode:     $MODE"
echo ""

CHANGED=0
SKIPPED=0
IDENTICAL=0
MISSING_IN_TEMPLATE=0

for relative_path in "${ALLOW_LIST[@]}"; do
  # Deny-list check (defense in depth)
  for denied in "${DENY_LIST[@]}"; do
    if [[ "$relative_path" == "$denied" ]]; then
      echo "  DENIED   $relative_path (in DENY_LIST)"
      SKIPPED=$((SKIPPED + 1))
      continue 2
    fi
  done

  source_file="$TEMPLATE_ROOT/$relative_path"
  target_file="$TARGET/$relative_path"

  if [[ ! -f "$source_file" ]]; then
    echo "  MISSING  $relative_path (not in template)"
    MISSING_IN_TEMPLATE=$((MISSING_IN_TEMPLATE + 1))
    continue
  fi

  if [[ ! -f "$target_file" ]]; then
    echo "  NEW      $relative_path (will be created)"
    CHANGED=$((CHANGED + 1))
    if [[ "$MODE" == "apply" ]]; then
      mkdir -p "$(dirname "$target_file")"
      cp "$source_file" "$target_file"
    fi
    continue
  fi

  if cmp -s "$source_file" "$target_file"; then
    echo "  ==       $relative_path"
    IDENTICAL=$((IDENTICAL + 1))
    continue
  fi

  # Show short diff stat
  line_delta=$(diff "$target_file" "$source_file" | grep -c '^[<>]' || true)
  echo "  CHANGED  $relative_path ($line_delta diff lines)"
  CHANGED=$((CHANGED + 1))
  if [[ "$MODE" == "apply" ]]; then
    cp "$source_file" "$target_file"
  fi
done

echo ""
echo "[sync] Summary: $CHANGED changed, $IDENTICAL identical, $SKIPPED denied, $MISSING_IN_TEMPLATE missing-in-template"

if [[ "$MODE" == "dry-run" ]]; then
  echo "[sync] Dry-run only. Re-run with --apply to write changes."
fi
