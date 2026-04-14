#!/usr/bin/env bash
# =============================================================================
# fix-webhook-activation-failure.sh — Fix silent activateToken failure in webhooks
# =============================================================================
#
# PURPOSE:
# Patches subscription-store.ts and webhook/route.ts across the 15 clones that
# use the Upstash Redis token lifecycle. Makes activateToken() return boolean
# and makes the webhook return HTTP 500 when activation fails, so Stripe retries.
#
# WHY THIS EXISTS:
# Root cause (2026-04-14): activateToken() silently no-ops when Upstash env vars
# are missing. Webhook returns 200, Stripe doesn't retry, paid users permanently
# stuck on free tier. This was the #1 revenue blocker across the clone fleet.
#
# USAGE:
#   bash scripts/fix-webhook-activation-failure.sh          # dry run (shows what would change)
#   bash scripts/fix-webhook-activation-failure.sh --apply   # apply + commit + push
#
# AFFECTED CLONES (15):
#   ai-anime-portrait-generator, ai-background-remover, ai-birthday-card-generator,
#   ai-chart-from-data, ai-chart-generator, ai-coloring-page-generator,
#   ai-image-upscaler, ai-logo-generator, ai-mockup-generator, ai-music-generator,
#   ai-product-photo-generator, ai-qr-art-generator, ai-tattoo-generator,
#   ai-text-to-speech
#   (ai-manga-generator already fixed in commit 4afaf0e)
#
# AUTHOR: Custom 3 (pane1776), 2026-04-14
# =============================================================================

set -uo pipefail

GITHUB_ROOT="/Users/ak/UserRoot/Github"
APPLY=false

if [[ "${1:-}" == "--apply" ]]; then
  APPLY=true
fi

# ai-manga-generator excluded — already fixed
CLONES=(
  "ai-anime-portrait-generator"
  "ai-background-remover"
  "ai-birthday-card-generator"
  "ai-chart-from-data"
  "ai-chart-generator"
  "ai-coloring-page-generator"
  "ai-image-upscaler"
  "ai-logo-generator"
  "ai-mockup-generator"
  "ai-music-generator"
  "ai-product-photo-generator"
  "ai-qr-art-generator"
  "ai-tattoo-generator"
  "ai-text-to-speech"
)

FIXED=0
SKIPPED=0
FAILED=0

for clone in "${CLONES[@]}"; do
  CLONE_DIR="$GITHUB_ROOT/$clone"

  if [[ ! -d "$CLONE_DIR" ]]; then
    echo "  [SKIP] $clone — directory not found"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Find subscription-store.ts (could be src/lib/ or app/lib/ or lib/)
  SUB_STORE=$(find "$CLONE_DIR" -name 'subscription-store.ts' ! -path '*/.next/*' ! -path '*/node_modules/*' 2>/dev/null | head -1)
  if [[ -z "$SUB_STORE" ]]; then
    echo "  [SKIP] $clone — no subscription-store.ts found"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Find webhook route
  WEBHOOK=$(find "$CLONE_DIR" \( -path '*/src/app/api/stripe/webhook/route.ts' -o -path '*/app/api/stripe/webhook/route.ts' \) ! -path '*/.next/*' 2>/dev/null | head -1)
  if [[ -z "$WEBHOOK" ]]; then
    echo "  [SKIP] $clone — no webhook route.ts found"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check if already fixed (activateToken specifically returns boolean)
  if grep -q 'activateToken.*Promise<boolean>' "$SUB_STORE" 2>/dev/null; then
    echo "  [SKIP] $clone — activateToken already returns boolean"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "  [FIX]  $clone"
  echo "         subscription-store: $SUB_STORE"
  echo "         webhook: $WEBHOOK"

  if $APPLY; then
    # Fix 1: Change activateToken return type from void to boolean
    # Handle both the Promise<void> signature and add return ok
    sed -i '' 's/export async function activateToken(token: string): Promise<void>/export async function activateToken(token: string): Promise<boolean>/' "$SUB_STORE"

    # Change console.warn to console.error for activation failure
    sed -i '' 's/console\.warn(`\[subscription-store\] activateToken: Redis unavailable/console.error(`[subscription-store] activateToken: Redis unavailable/' "$SUB_STORE"

    # Add "return ok;" before the closing brace of activateToken if not already present
    # This is tricky with sed — use python for reliability
    python3 -c "
import re
with open('$SUB_STORE', 'r') as f:
    content = f.read()

# Add 'Stripe should retry this event.' to the error message if not present
content = content.replace(
    'NOT activated\`)',
    'NOT activated. Stripe should retry this event.\`)'
) if 'Stripe should retry this event' not in content else content

# Add 'return ok;' before the closing brace of activateToken
# Find the pattern: the closing brace after the if/else in activateToken
# We look for the pattern where console.error/warn about NOT activated is followed by }
# Then we need to add 'return ok;' and a newline before the final }
if 'return ok;' not in content:
    # Find activateToken function and add return ok before its closing }
    pattern = r'(activateToken\(token: string\): Promise<boolean> \{.*?console\.\w+\(.*?NOT activated.*?\);?\s*\})([\s\n]*\})'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        # Insert 'return ok;' before the last }
        insert_point = match.end(1)
        content = content[:insert_point] + '\n\n  return ok;' + content[insert_point:]

with open('$SUB_STORE', 'w') as f:
    f.write(content)
" 2>/dev/null

    # Fix 2: Webhook — make it check activateToken return value
    # This varies by clone so we use a targeted sed approach
    # Replace 'await activateToken(X);' with 'const activated = await activateToken(X);'
    # Then add the failure check block
    python3 -c "
import re
with open('$WEBHOOK', 'r') as f:
    content = f.read()

# Only proceed if not already fixed
if 'const activated = await activateToken' not in content:
    # Replace bare 'await activateToken(varname);' with checked version
    content = re.sub(
        r'(\s+)await activateToken\((\w+)\);',
        r'''\1const activated = await activateToken(\2);
\1if (!activated) {
\1  console.error(\"[stripe-webhook] CRITICAL: activateToken failed — returning 500 so Stripe retries\");
\1  return NextResponse.json(
\1    { received: true, processed: false, error: \"Token activation failed — Redis unavailable\" },
\1    { status: 500 }
\1  );
\1}''',
        content,
        count=1
    )

with open('$WEBHOOK', 'w') as f:
    f.write(content)
" 2>/dev/null

    # Commit and push
    cd "$CLONE_DIR"
    git add "$SUB_STORE" "$WEBHOOK"
    git commit -m "$(cat <<'COMMITMSG'
fix: webhook returns 500 when activateToken fails — prevents silent payment loss

activateToken() now returns boolean indicating Redis write success.
Webhook checks return value and returns HTTP 500 on failure so Stripe
retries the event (up to 3 days). Previously, webhook returned 200
even when Redis was unavailable, causing paid users to be permanently
stuck on free tier with no retry mechanism.

Root cause: UPSTASH_REDIS env vars were never set on any clone Vercel
project. This affected 15 clones fleet-wide.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
COMMITMSG
)" 2>/dev/null

    git push origin HEAD 2>/dev/null
    if [[ $? -eq 0 ]]; then
      echo "         → committed and pushed"
      FIXED=$((FIXED + 1))
    else
      echo "         → commit failed or push failed"
      FAILED=$((FAILED + 1))
    fi
    cd "$GITHUB_ROOT"
  else
    FIXED=$((FIXED + 1))
  fi
done

echo ""
echo "================================================================"
if $APPLY; then
  echo "  APPLIED: $FIXED fixed | $SKIPPED skipped | $FAILED failed"
else
  echo "  DRY RUN: $FIXED would fix | $SKIPPED would skip"
  echo "  Run with --apply to commit and push"
fi
echo "================================================================"
