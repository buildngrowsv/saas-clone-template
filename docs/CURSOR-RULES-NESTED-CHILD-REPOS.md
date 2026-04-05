# Cursor rules — nested child repos

Some template children (e.g. `clone-1-bg-remover/`) are **separate git repositories** (they contain their own `.git/`). Those directories are **not** tracked as paths inside `saas-clone-template`, so `.cursor/rules` placed only there will **not** be committed to the parent repo.

**What to do**

1. Add **parent** rules here: `saas-clone-template/.cursor/rules/parent-clone-fleet-defaults.mdc` (tracked).
2. For each **standalone** clone repo (e.g. `Github/ai-background-remover`), add **child** rules in **that** repo: `.cursor/rules/child-clone-site-only.mdc` (or similar), scoped with `globs: **/*`.

Business memory stays in `Github/business-operations/` regardless of where the code lives.

See `general-sops/BUSINESS-MEMORY-TREE-CURRENT-AND-TARGET-ARCHITECTURE.md` section 2.5–2.6.
