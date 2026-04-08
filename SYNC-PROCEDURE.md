# Template Sync Procedure

**Status as of 2026-04-08:** No automated sync mechanism exists. This document is part finding, part manual SOP, part forward-plan.

## The current reality

Clones are created by one-shot `cp -r`:

```bash
cp -r saas-clone-template/ my-new-ai-tool/
```

(see `README.md` §Quick Start). After that moment, the clone is a **detached fork** with no git relationship to this template repo — not a git submodule, not a git subtree, not a remote. When the template receives a high-leverage fix (security headers, env validation, CVE bump), **nothing propagates automatically**. Each clone drifts at its own pace.

This is a known liability. See `docs/CLF-04-TEMPLATE-DRIFT-AUDIT-atlas7842-2026-04-05.md` for a concrete drift audit between this template and `ai-background-remover` showing 5 critical-to-low divergences that accumulated in ~2 months.

## Which files matter for sync

Upstream changes tend to fall into a few buckets. Prioritize syncing in this order:

| Priority | Files / areas | Why |
|---|---|---|
| **P0** | `next.config.ts` (security headers, image domains), `scripts/validate-env-configuration.mjs`, `scripts/check-secrets.sh`, dependency versions with CVEs in `package.json` | Security + deploy-blocking |
| **P1** | `src/app/api/stripe/*`, `src/lib/stripe.ts`, `src/app/api/auth/[...nextauth]/route.ts`, Better Auth config | Revenue + auth correctness |
| **P2** | `testing/templates/e2e/*`, `scripts/stamp-tests.sh`, `.github/workflows/*` | Quality gates |
| **P3** | `README.md`, `docs/*`, `STATUS.md`, site copy defaults in `src/config/site.ts` | Nice-to-have |

What **never** flows upstream from a clone:
- Product-specific copy, branding, site config
- Clone-specific `app/page.tsx` hero content
- Per-product env values

## Manual sync procedure (today)

Until an automated script exists, this is how an operator or agent syncs one clone:

```bash
# 0. Know what you are syncing and why
# Read the commit(s) on saas-clone-template/main that you want to pull.
# Copy the SHA and subject line into the PR description.

cd /Users/ak/UserRoot/Github/<clone-repo>
git checkout -b sync/template-$(date +%Y%m%d)

# 1. Copy the specific files (do NOT blind-rsync the whole template — you
#    will clobber product-specific page.tsx, site.ts, and env.example)
TEMPLATE=/Users/ak/UserRoot/Github/saas-clone-template
cp "$TEMPLATE/next.config.ts" ./next.config.ts
cp "$TEMPLATE/scripts/validate-env-configuration.mjs" ./scripts/
# ...one file at a time, reviewing diffs before staging

# 2. Re-apply clone-specific edits that live inside the synced file.
#    Example: next.config.ts remotePatterns may include a clone-specific
#    CDN. Re-add it after the sync.

# 3. Validate
npm install
npm run build
npm run env:validate
npx playwright test tests/e2e/smoke.spec.ts  # if wired

# 4. Commit referencing upstream SHA
git add -p
git commit -m "sync: template SHA d6c143d — security headers + env whitespace"
git push -u origin sync/template-<date>

# 5. Open PR, deploy preview, verify curl -I shows new headers
```

## Why not `git subtree`?

Considered and rejected for now:
- **Subtree:** clean history, but requires every clone to have been created with `git subtree add` from day one. Retrofitting ~20 existing clones means rewriting history on each — high risk, low payoff unless we also rebuild the clone-factory tooling.
- **Submodule:** nested repo complicates CI/Vercel builds and makes per-clone edits to template files impossible without detached HEADs.
- **Monorepo:** would require moving all 20 clones into one repo, breaks per-clone Vercel projects and isolated deploys.

**What will probably work:** a thin sync script (`scripts/sync-from-template.sh` in each clone) that rsyncs an **allow-list** of files from a sibling `saas-clone-template/` checkout, runs validation, and opens a branch. Low magic, high transparency, easy to run in parallel across clones.

## Recommended follow-up work (tracked in BridgeMind)

1. **Write `scripts/sync-from-template.sh`** — lives in the template, copies an allow-list of template files into `$1` (target clone path), refuses to overwrite `src/app/page.tsx`, `src/config/site.ts`, `.env.example`, `public/og-image*`, `README.md`. Dry-run by default; `--apply` to write. Prints a diff summary.
2. **Fleet-sweep runner** — a tiny Node or bash script that iterates over a list of clone paths (pulled from `FLEET-HEALTH-SCAN-2026-04-08.md` or a new manifest) and runs the sync script for each, opening a branch per clone. Operator reviews PRs in a batch.
3. **Clone manifest** — `fleet-clones.json` in `saas-clone-template/` listing every live clone (local path, git remote, production URL, owner). Drives both the sweep runner and health checks.
4. **Template CHANGELOG.md** — every template commit worth syncing gets a line. Operators read one file to decide which SHAs to pull.

## Current workaround (zero-script)

Until the script lands, the fastest path to propagate today's T16 security headers + env validation fixes to existing clones is a **manual fleet-sweep PR wave**:

- One agent opens one PR per clone copying `next.config.ts` + `scripts/validate-env-configuration.mjs` from template SHA `d6c143d`
- Each PR's body links this doc and the REVIEWER-T16 report
- Operator batch-merges after preview deploys show headers via `curl -I`

That is painful and slow. Priority should be task (1) above — a 50-line `sync-from-template.sh` removes the pain.

---

**Owner:** Reviewer 1 / pane1775, T17, 2026-04-08
