#!/usr/bin/env node
/**
 * merge-pseo-middleware-paths.mjs — Additive middleware PUBLIC_PATHS updater.
 *
 * WHY THIS SCRIPT EXISTS (Builder 3, steel-viper-3847, 2026-04-14):
 * Middleware cannot be blindly synced because clones customize it for
 * next-intl, custom rate limiting, etc. But the PUBLIC_PATHS array must
 * include all pSEO route patterns or Googlebot hits auth redirects and
 * pages never get indexed. This script ADDS missing public paths without
 * replacing the entire middleware file.
 *
 * USAGE:
 *   node scripts/merge-pseo-middleware-paths.mjs [--apply]
 *
 * Without --apply: dry-run showing what would change.
 * With --apply: edits src/middleware.ts in place.
 *
 * WHAT IT DOES:
 * 1. Reads the clone's middleware.ts
 * 2. Finds the PUBLIC_PATHS array
 * 3. Adds any missing paths from the REQUIRED set
 * 4. Updates the matcher regex negative lookahead if needed
 *
 * SAFE: Only adds entries. Never removes existing ones. Never changes
 * auth logic, rate limiting, or session checks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const middlewarePath = path.join(projectRoot, "src", "middleware.ts");

const dryRun = !process.argv.includes("--apply");

/**
 * pSEO paths that MUST be in PUBLIC_PATHS for proper indexing.
 * Gate 9 (clone-factory-quality-gates.md): middleware must not auth-gate
 * any marketing, legal, or SEO content route.
 */
const REQUIRED_PUBLIC_PATHS = [
  "/vs",
  "/for",
  "/use-cases",
  "/best",
  "/blog",
  "/lp",
  "/testimonials",
  "/ai-",
  "/api/health",
];

/**
 * Matcher regex segments that must be in the negative lookahead.
 * These correspond to the PUBLIC_PATHS entries above.
 */
const REQUIRED_MATCHER_SEGMENTS = [
  "vs", "for", "use-cases", "best", "blog", "lp", "testimonials", "ai-",
];

if (!fs.existsSync(middlewarePath)) {
  console.log("No src/middleware.ts found — skipping (this clone may not use middleware).");
  process.exit(0);
}

let content = fs.readFileSync(middlewarePath, "utf8");
let changed = false;

/* ── Step 1: Add missing PUBLIC_PATHS entries ─────────────────────── */

const publicPathsMatch = content.match(/const\s+PUBLIC_PATHS\s*=\s*\[([\s\S]*?)\];/);
if (publicPathsMatch) {
  const existingBlock = publicPathsMatch[1];
  const missingPaths = REQUIRED_PUBLIC_PATHS.filter(
    (p) => !existingBlock.includes(`"${p}"`) && !existingBlock.includes(`'${p}'`)
  );

  if (missingPaths.length > 0) {
    const insertionPoint = publicPathsMatch[0].lastIndexOf("]");
    const pathLines = missingPaths.map((p) => `  "${p}",`).join("\n");
    const newBlock =
      publicPathsMatch[0].slice(0, insertionPoint) +
      `\n  // Added by merge-pseo-middleware-paths.mjs (Gate 9 compliance)\n${pathLines}\n` +
      publicPathsMatch[0].slice(insertionPoint);
    content = content.replace(publicPathsMatch[0], newBlock);
    changed = true;
    console.log(`[PUBLIC_PATHS] Adding ${missingPaths.length} missing paths: ${missingPaths.join(", ")}`);
  } else {
    console.log("[PUBLIC_PATHS] All required pSEO paths already present.");
  }
} else {
  console.warn("[PUBLIC_PATHS] Could not find PUBLIC_PATHS array in middleware.ts — manual review needed.");
}

/* ── Step 2: Add missing matcher negative lookahead segments ──────── */

const matcherMatch = content.match(/\(\?!([\s\S]*?)\.\*\)/);
if (matcherMatch) {
  const existingLookahead = matcherMatch[1];
  const missingSegments = REQUIRED_MATCHER_SEGMENTS.filter(
    (s) => !existingLookahead.includes(s)
  );

  if (missingSegments.length > 0) {
    const newLookahead = existingLookahead + "|" + missingSegments.join("|");
    content = content.replace(matcherMatch[1], newLookahead);
    changed = true;
    console.log(`[matcher] Adding ${missingSegments.length} missing segments: ${missingSegments.join(", ")}`);
  } else {
    console.log("[matcher] All required segments already in negative lookahead.");
  }
} else {
  console.warn("[matcher] Could not find matcher negative lookahead — manual review needed.");
}

/* ── Step 3: Write or report ──────────────────────────────────────── */

if (!changed) {
  console.log("\nNo changes needed — middleware is already Gate 9 compliant.");
  process.exit(0);
}

if (dryRun) {
  console.log("\n[DRY RUN] Would update middleware.ts. Run with --apply to write changes.");
  process.exit(0);
} else {
  fs.writeFileSync(middlewarePath, content, "utf8");
  console.log("\n[APPLIED] middleware.ts updated successfully.");
  process.exit(0);
}
