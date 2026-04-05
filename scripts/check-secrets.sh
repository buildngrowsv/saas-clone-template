#!/bin/bash
# Pre-commit secrets scanner — catch leaked API keys before they hit git.
#
# WHY THIS EXISTS (SEC-06, sentinel-4291, 2026-04-05):
#   Multiple clone repos were found with Stripe test keys, webhook secrets,
#   and fal.ai keys in committed .env files or test fixtures. This script
#   catches the most common patterns before they reach git history.
#
# USAGE:
#   bash scripts/check-secrets.sh           # scan staged changes only
#   bash scripts/check-secrets.sh --all     # scan entire src/ directory
#
# FALSE POSITIVES:
#   Test fixtures using "sk_test_placeholder" or "whsec_test123" are expected.
#   The script flags them but doesn't block — review and confirm they're placeholders.
#
# INSTALL AS PRE-COMMIT HOOK:
#   cp scripts/check-secrets.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

PATTERNS=(
  'sk_live_[A-Za-z0-9]{10,}'
  'sk_test_51[A-Za-z0-9]{10,}'
  'whsec_[A-Za-z0-9]{20,}'
  'sk-proj-[A-Za-z0-9]{10,}'
  'AKIA[A-Z0-9]{12,}'
  'fal_[A-Za-z0-9]{20,}'
  'rk_live_[A-Za-z0-9]{10,}'
  'pk_live_[A-Za-z0-9]{10,}'
)

FOUND=0

if [ "${1:-}" = "--all" ]; then
  echo "Scanning src/ directory for secrets..."
  TARGET="src/"
  SEARCH_CMD="grep -rn"
else
  echo "Scanning staged changes for secrets..."
  TARGET=""
  SEARCH_CMD="git diff --cached"
fi

for pattern in "${PATTERNS[@]}"; do
  if [ -n "$TARGET" ]; then
    matches=$(grep -rn "$pattern" "$TARGET" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.env" --include="*.json" 2>/dev/null | grep -v node_modules | grep -v ".env.example" | grep -v "__tests__" || true)
  else
    matches=$(git diff --cached --diff-filter=ACM -- '*.ts' '*.tsx' '*.js' '*.env' '*.json' | grep -E "$pattern" || true)
  fi

  if [ -n "$matches" ]; then
    echo -e "${RED}POTENTIAL SECRET FOUND:${NC} pattern=$pattern"
    echo "$matches" | head -5
    echo
    FOUND=$((FOUND + 1))
  fi
done

if [ "$FOUND" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $FOUND potential secret pattern(s). Review before committing.${NC}"
  echo "  If these are test placeholders, they're safe. If they're real keys, remove them."
  exit 1
else
  echo -e "${GREEN}✅ No secrets detected.${NC}"
  exit 0
fi
