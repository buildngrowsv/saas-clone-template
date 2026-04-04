# Output quality matrix — saas-clone-template (default SKU)

**Rule reference:** `UserRoot/.claude/rules/output-quality-personas-and-agent-review-sop.md`  
**Fleet template:** `Github/fleet-e2e-tests/docs/PRODUCT-OUTPUT-QUALITY-MATRIX.template.md`

**Product:** Symply clone-factory template (image / tool SKUs)  
**Repo:** `Github/saas-clone-template`  
**Owner (human):** Coordinators  
**Last updated:** 2026-04-04 (§2.1 SKU archetypes + fleet doc path)

---

## Purpose

New SKUs cloned from this template should **copy** this file to `docs/OUTPUT-QUALITY-MATRIX.md` in the **child repo** and replace product name, routes, and output types. Keep **Gate 5e** in `clone-factory-quality-gates.md` satisfied before launch-ready claims.

---

## Template default — what each child SKU must do

Because downstream agents often open only one repo at a time, we spell out the **minimum** so matrices do not drift:

| Requirement | Detail |
|-------------|--------|
| **Copy** | Duplicate this file into the child repo as `docs/OUTPUT-QUALITY-MATRIX.md` (not a symlink). |
| **Personas** | Define **at least two** personas (e.g. novice vs pro, or budget vs batch). Replace the seed table in §1 with product-specific goals and constraints. |
| **Workflows** | Extend §2 so rows reflect **tool-specific** flows — e.g. logo SKUs: brand + variant steps; interior SKUs: room type + style; generic image gen: prompt → generate → download. |
| **Evals** | Keep `tests/evals/README.md` pattern; add golden prompts or fixtures that match the real API and UI. |
| **Gate 5e** | Cross-check `UserRoot/.claude/rules/clone-factory-quality-gates.md` before any launch-ready language in `STATUS.md` or marketing. |

---

## Fleet rollout (traffic priority — Coordinator source of truth)

Order and dates live in **`Github/business-operations/central-playbooks/testing/PORTFOLIO-OUTPUT-QUALITY-ROLLOUT.md`** (and **`UserRoot/Github/business-operations/...`** in full workspaces) plus BridgeMind **RCC** / **AI Tool Competitor Cloning Factory**. Typical wave:

1. **Tier 1** — ReachMix, banananano2pro, GenFlix (revenue and eval pilots first).
2. **Clone fleet** — remaining Symply SKUs by traffic / revenue priority; each gets its own matrix file, not a shared generic doc.

---

## 1. Personas (seed — customize per SKU)

| Persona ID | Name | Goal | Notes |
|------------|------|------|-------|
| P-NOVICE | First visit | Try one free generation | Mobile + landing |
| P-PRO | Power user | Batch or repeat gen | Rate limits |
| P-BUDGET | Cost-sensitive | Stay within credits | Error copy truth |

---

## 2. Matrix (typical image-gen SKU)

| Feature / surface | Persona | Workflow | Output type | Structural checks | Quality dimensions | Eval method |
|-------------------|---------|----------|-------------|-------------------|-------------------|-------------|
| Generate API | P-PRO | Prompt → POST `/api/generate` | Image | 401/429 when appropriate; JSON shape | relevance, format | Contract + human samples |
| Result UI | P-NOVICE | View + download | Image | DOM states | safety | Spot-check |

---

## 2.1 SKU archetype workflow examples (customize — do not copy blindly)

**Why this section exists:** Fleet task **6543ac9b** calls for **two personas minimum** and **tool-specific workflows** (e.g. **logo** vs **room design** vs generic batch). When you scaffold a child repo, **remove rows that do not apply** and add real routes/APIs for your product. These tables are **illustrative**, not exhaustive.

### A — Logo / brand identity SKU (e.g. AI logo, wordmark tools)

| Feature / surface | Persona | Workflow | Output type | Structural checks | Quality dimensions | Eval method |
|-------------------|---------|----------|-------------|-------------------|-------------------|-------------|
| Brief / category | P-NOVICE | Industry + name → step 1 | Form | Validation copy | clarity | Manual |
| Variant grid | P-PRO | Pick concept → refine color/font | SVG or PNG | Export works; dimensions | legibility, brand fit | Human + spot API |
| Checkout | P-BUDGET | Tier compare → Stripe | — | Price IDs match env | honest limits | Contract |

### B — Interior / room / staging SKU (spatial, photo-conditioned)

| Feature / surface | Persona | Workflow | Output type | Structural checks | Quality dimensions | Eval method |
|-------------------|---------|----------|-------------|-------------------|-------------------|-------------|
| Room photo | P-NOVICE | Upload → room type / mask | Image | Size/type limits | perspective, lighting | Golden images |
| Style / furnish | P-PRO | Preset + regen | Image(s) | Undo / idempotency where promised | coherence, object fit | Human rubric |
| Export | P-PRO | Download / share | File or URL | OG / privacy if share | disclosure | Spot-check |

### C — Generic text-to-image or utility (default clone-template posture)

| Feature / surface | Persona | Workflow | Output type | Structural checks | Quality dimensions | Eval method |
|-------------------|---------|----------|-------------|-------------------|-------------------|-------------|
| Generate API | P-PRO | Prompt → `POST /api/generate` (or product route) | Image | 401/429; JSON shape | relevance, safety | Contract + samples |
| Dashboard / credits | P-BUDGET | View balance → upgrade CTA | — | Copy matches Stripe | no dark patterns | Manual |

---

## 3. Eval scaffold

See **`tests/evals/README.md`** in this repo for `prompts-v1.json`, `rubric.md`, `gallery-manifest.json` pattern.

---

## 4. Gaps

Per-SKU matrices in deployed clones may lag template — Coordinator tracks in **AI Tool Competitor Cloning Factory** BridgeMind project.
