# saas-clone-template CHANGELOG

Template-level changelog. Every commit worth syncing to downstream clones
gets a line here. Operators read this file to decide which SHAs to pull
via `scripts/sync-from-template.sh`.

Format: `SHA — date — priority — summary — files`

Priorities follow `SYNC-PROCEDURE.md`:
- **P0** = security / deploy-blocking
- **P1** = revenue / auth correctness
- **P2** = quality gates
- **P3** = docs / nice-to-have

---

## 2026-04-08

- **T18** — today — P0 — Template sync tooling: `scripts/sync-from-template.sh` (allow-list + dry-run), `scripts/fleet-clones.json` (5-clone manifest), `scripts/fleet-sync-all.sh` (batch runner), `CHANGELOG.md` (this file). Closes SYNC-PROCEDURE.md follow-ups 1–4. Files: `scripts/sync-from-template.sh`, `scripts/fleet-clones.json`, `scripts/fleet-sync-all.sh`, `CHANGELOG.md`.
- **85a557c** — 2026-04-08 — P3 — Document template-sync procedure (T17): manual SOP, priority buckets, subtree/submodule rejection rationale, follow-up list. Files: `SYNC-PROCEDURE.md`.
- **d6c143d** — 2026-04-08 — P0 — Baseline security headers + env whitespace guard (T16): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locked down; `WHITESPACE_SENSITIVE` expanded from 4→12 keys covering Stripe/FAL/DB/BetterAuth secrets. Files: `next.config.ts`, `scripts/validate-env-configuration.mjs`.

---

## How to add an entry

When you land a template commit that should propagate to clones:
1. Add a line at the top of the current date section (or create a new date).
2. Include SHA, priority, summary, and affected files.
3. If the file isn't already in `scripts/sync-from-template.sh` `ALLOW_LIST`, add it there too.
4. Operators run `./scripts/fleet-sync-all.sh` to propagate.
