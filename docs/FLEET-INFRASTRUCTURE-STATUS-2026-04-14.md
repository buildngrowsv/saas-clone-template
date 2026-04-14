# Fleet Infrastructure Status — 2026-04-14

## Executive Summary

**41 AI tool clones** in the fleet. Key metrics:

| Category | OK | WARN | MISSING | Notes |
|----------|-----|------|---------|-------|
| **Pricing pages** | 36 | 5 | 0 | 5 WARN = missing metadata (being fixed) |
| **Pricing SEO metadata** | 36 | 5 | 0 | layout.tsx added to 25 repos this session |
| **Sitemap /pricing entry** | 41 | 0 | 0 | All complete |
| **Production APP_URL** | 41 | 0 | 0 | 12 localhost→production fixed this session |
| **Security headers** | 41 | 0 | 1 | Only ai-headshots-photos (React Native) missing |
| **JSON-LD structured data** | 41 | 0 | 1 | Same (React Native) |
| **Internal linking footer** | 42 | 0 | 0 | All have RelatedTools/footer |
| **Stripe routes** | 41 | 0 | 1 | Only ai-headshots-photos (React Native) |
| **Database config** | 3 | 0 | 39 | **CRITICAL**: 39/42 have NO database |
| **Database-backed credits** | 0 | 3 | 39 | **$0 MRR root cause** |
| **.env.example** | 41 | 0 | 1 | ai-headshots-photos |
| **validate-env script** | TBD | - | TBD | Builder 4 auditing |

## Revenue Blocker Analysis

### Critical Path to First Dollar

The fleet cannot earn revenue because:

1. **39 clones have no database** — credits stored in-memory `new Map()` that resets on every Vercel cold start. Free users get unlimited generations.

2. **3 clones have database config but broken credits** — ai-logo-generator, ai-mockup-generator, ai-qr-code-art have `drizzle.config.ts` and `db:push` but `credits.ts` still uses `new Map()`.

3. **0 clones have working database-backed credit tracking** — even with Stripe checkout working (verified), post-payment entitlement is never enforced.

### Fix Sequence (for any clone to earn revenue)

```
1. Add Neon PostgreSQL database (free tier = 0.5GB)
2. Add drizzle ORM config: drizzle.config.ts + src/db/schema.ts
3. Run db:push to create tables
4. Update credits.ts to query database instead of Map()
5. Update getUserSubscriptionTier() to read from subscriptions table
6. Verify Stripe webhook writes subscription data to database
7. Test: free user → limited, paid user → unlimited
```

### Template Status

The `saas-clone-template` itself has been updated:
- credits.ts no longer uses `new Map()` (references "previous in-memory Map" in comments)
- drizzle.config.ts exists in the template
- Gate 8 and Gate 9 documented in clone-factory-quality-gates.md

The problem is that **39 clones were created before these fixes** and have not been updated.

## SEO Status (Completed This Session)

| Fix | Repos | Status |
|-----|-------|--------|
| Pricing page metadata (layout.tsx) | 25→30 | Committed + pushed |
| Sitemap /pricing entries | 10 | Committed + pushed |
| Localhost APP_URL → production | 12 | Committed + pushed |
| fleet-audit.sh created | 1 | In saas-clone-template |

## Fleet Audit Tool

`saas-clone-template/scripts/fleet-audit.sh` — universal fleet health checker.

```bash
./fleet-audit.sh                    # Full audit
./fleet-audit.sh --check pricing    # Only pricing pages
./fleet-audit.sh --check checkout   # Only checkout routes
./fleet-audit.sh --check sitemap    # Only sitemaps
./fleet-audit.sh --check env        # Only .env.example
```

## Recommendations

1. **P0: Database rollout** — Create a `fleet-db-setup.sh` script that adds Neon + drizzle to any clone in one step. This unblocks ALL revenue.

2. **P1: Credit system migration** — Once databases exist, update credits.ts fleet-wide to use DB instead of Map(). Template has the pattern.

3. **P2: Stripe webhook verification** — Confirm webhook endpoints write subscription data to the database, not just log it.

4. **P3: Continue SEO fixes** — OG images, more pSEO pages, content optimization.
