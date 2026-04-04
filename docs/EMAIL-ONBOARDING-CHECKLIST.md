# Email onboarding checklist — new web SKU (clone factory)

**BridgeMind:** AI Tool Competitor Cloning Factory — task `12a7ce54-928a-4111-ac60-5b6583c4a65b`  
**Audience:** Builders scaffolding a new product from `Github/saas-clone-template`  
**Holding-company standard:** Resend org owner **`buildngrowsv@gmail.com`** — read before editing DNS or env:

- `Github/business-operations/general-sops/HOLDING-COMPANY-TRANSACTIONAL-AND-MARKETING-EMAIL-STANDARD.md`
- `Github/business-operations/general-sops/RESEND-ACCOUNT-SETUP-RUNBOOK-buildngrowsv.md`
- `UserRoot/.claude/rules/holding-company-email-deliverability.md`

**Secrets:** Never commit API keys or Resend tokens. Use Vercel / Cloudflare / Convex env only.

---

## 1. Minimum transactional (launch-safe)

Complete before calling the SKU “email-ready” for real users:

| # | Item | Notes |
|---|------|--------|
| 1.1 | **Sending domain** added in Resend; SPF + DKIM DNS at Cloudflare (or registrar) | Prefer subdomain e.g. `mail.<product>.symplyai.io` for reputation isolation |
| 1.2 | **`RESEND_API_KEY`** in production env (Vercel etc.) | Not in git |
| 1.3 | **From** address uses verified domain | Matches Resend verified sender |
| 1.4 | **Verify email** flow — if product has signup, confirmation mail sends and link works | Test on preview first |
| 1.5 | **Password reset** — if Better Auth / NextAuth exposes it, mail delivers and link hits prod URL | Set `BETTER_AUTH_URL` / callback URLs |
| 1.6 | **Receipt or subscription notice** — if Stripe checkout exists, webhook + optional “payment received” template | Transactional stream; not mixed with promo |

---

## 2. Optional marketing (post-transactional trust)

| # | Item | Notes |
|---|------|--------|
| 2.1 | Resend **Marketing** product / audience (when ready) | Separate from password resets |
| 2.2 | **Welcome drip** — single welcome email after verify | Rate-limit; clear unsubscribe |
| 2.3 | **One-click unsubscribe** on any bulk/marketing send | RFC 8058; see deliverability research log |

---

## 3. Env var naming (conventions)

| Variable | Typical use |
|----------|-------------|
| `RESEND_API_KEY` | Server-side send |
| `EMAIL_FROM` or template default in code | Must match verified domain |
| `NEXT_PUBLIC_APP_URL` | Links inside emails must point at **canonical** prod host, not `*.vercel.app` |

Document product-specific names in child repo **`STATUS.md`**.

---

## 4. DNS / subdomain pattern (Symply portfolio)

- **Apex or product host** on Cloudflare (see `HOSTING-ACCOUNTS-AND-BROWSER-OPS.md`).
- **Sending subdomain** CNAME or TXT records per Resend wizard.
- Do **not** use Cloudflare Email Routing alone as “the app sends mail” — outbound API is **Resend** (or documented exception).

---

## 5. Test procedure (before launch)

1. Send **single** test to operator mailbox from **production** env (not localhost with prod key unless intentional).
2. Verify **headers**: SPF/DKIM pass in Gmail “Show original”.
3. For marketing templates: **List-Unsubscribe** present if message class is promotional.
4. Log **pass** in BridgeMind `taskKnowledge` + child repo `STATUS.md` (no secrets).

---

## 6. Reference implementations (update as Tier 1 ships)

Check **`STATUS.md`** and email code paths in:

- `Github/genflix-movie-generator` — patterns evolve  
- `Github/banananano2pro_com` — patterns evolve  

Replace this sentence when a **canonical** reference PR is agreed.

---

## 7. Related template docs

- `docs/OUTPUT-QUALITY-MATRIX.md` — quality rubric (generative outputs)
- `tests/evals/README.md` — eval asset scaffold
- `UserRoot/.claude/rules/clone-factory-quality-gates.md` — Gate 8–10 (consent, privacy, footer)
