#!/usr/bin/env node
/**
 * merge-seo-internal-links-to-homepage.mjs
 *
 * WHY THIS SCRIPT EXISTS:
 * The SeoInternalLinks component distributes homepage PageRank to all pSEO
 * pages (/vs/, /for/, /use-cases/). Without it on the homepage, Google
 * never discovers those pages from the highest-authority page on the site.
 *
 * The homepage (page.tsx) is on the DENY_LIST for sync-from-template.sh
 * because each clone has custom copy, steps, and demo sections. This script
 * is the safe, additive way to inject the SeoInternalLinks component without
 * replacing the entire file.
 *
 * WHAT IT DOES:
 * 1. Finds the clone's main landing page (src/app/page.tsx or app/[locale]/page.tsx)
 * 2. Adds the SeoInternalLinks import if missing
 * 3. Inserts <SeoInternalLinks /> before the footer component if found
 * 4. Writes the modified file back
 *
 * SAFETY:
 * - Only adds, never removes content
 * - Skips files that already have SeoInternalLinks
 * - Works with both src/app/ and app/[locale]/ directory structures
 * - Dry-run by default; use --apply to write changes
 *
 * USAGE:
 *   node scripts/merge-seo-internal-links-to-homepage.mjs ../ai-logo-generator
 *   node scripts/merge-seo-internal-links-to-homepage.mjs ../ai-logo-generator --apply
 *   node scripts/merge-seo-internal-links-to-homepage.mjs --fleet           # all clones (dry-run)
 *   node scripts/merge-seo-internal-links-to-homepage.mjs --fleet --apply   # all clones (write)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, basename } from "path";

const args = process.argv.slice(2);
const applyMode = args.includes("--apply");
const fleetMode = args.includes("--fleet");
const targetPaths = args.filter((a) => !a.startsWith("--"));

const SCRIPT_DIR = new URL(".", import.meta.url).pathname;
const FLEET_JSON = join(SCRIPT_DIR, "fleet-clones.json");
const GITHUB_DIR = "/Users/ak/UserRoot/Github";

/**
 * Finds the main landing page file for a clone repo.
 *
 * WHY THE ORDER MATTERS:
 * Some clones use next-intl with a root page.tsx that just does `redirect("/en")`.
 * The real landing content lives at [locale]/page.tsx. We detect this by checking
 * if the root page contains "redirect" — if so, prefer the locale page instead.
 */
function findLandingPage(repoPath) {
  const rootCandidates = [
    join(repoPath, "src/app/page.tsx"),
    join(repoPath, "app/page.tsx"),
  ];

  const localeCandidates = [
    join(repoPath, "src/app/[locale]/page.tsx"),
    join(repoPath, "app/[locale]/page.tsx"),
  ];

  const rootPage = rootCandidates.find((c) => existsSync(c));

  if (rootPage) {
    const content = readFileSync(rootPage, "utf-8");
    if (content.includes("redirect(") && content.length < 2500) {
      // Root page is just a locale redirect — use the locale page instead
      const localePage = localeCandidates.find((c) => existsSync(c));
      if (localePage) return localePage;
    }
    return rootPage;
  }

  return localeCandidates.find((c) => existsSync(c)) || null;
}

/**
 * Adds SeoInternalLinks to a landing page file.
 * Returns { modified: boolean, reason: string }.
 */
function addSeoInternalLinks(filePath) {
  let content = readFileSync(filePath, "utf-8");

  if (content.includes("SeoInternalLinks")) {
    return { modified: false, reason: "already has SeoInternalLinks" };
  }

  // Step 1: Add the import
  const importLine = 'import { SeoInternalLinks } from "@/components/SeoInternalLinks";';

  // Find last import statement and add after it
  const importRegex = /^import .+$/gm;
  let lastImportMatch = null;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }

  if (!lastImportMatch) {
    return { modified: false, reason: "no import statements found — unusual file structure" };
  }

  const insertPos = lastImportMatch.index + lastImportMatch[0].length;
  content = content.slice(0, insertPos) + "\n" + importLine + content.slice(insertPos);

  // Step 2: Insert <SeoInternalLinks /> before the footer
  // Look for common footer patterns: <LandingFooter, <Footer, <SiteFooter
  const footerPatterns = [
    /(\s*{\/\*.*[Ff]ooter.*\*\/}\s*\n\s*<\w*Footer)/,
    /(\s*<(?:Landing|Site|Related\w*)?Footer\w*\s)/,
    /(\s*<footer\s)/,
  ];

  let footerInserted = false;
  for (const pattern of footerPatterns) {
    const footerMatch = content.match(pattern);
    if (footerMatch) {
      const seoBlock = `
      {/* Internal SEO links — distributes homepage PageRank to pSEO pages */}
      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <SeoInternalLinks />
        </div>
      </section>

`;
      content = content.slice(0, footerMatch.index) + seoBlock + content.slice(footerMatch.index);
      footerInserted = true;
      break;
    }
  }

  if (!footerInserted) {
    // Fallback: insert before closing </main> or </div> at the end
    const closingTag = content.lastIndexOf("</main>");
    if (closingTag !== -1) {
      const seoBlock = `
      {/* Internal SEO links — distributes homepage PageRank to pSEO pages */}
      <section className="py-12 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <SeoInternalLinks />
        </div>
      </section>
`;
      content = content.slice(0, closingTag) + seoBlock + content.slice(closingTag);
      footerInserted = true;
    }
  }

  if (!footerInserted) {
    return { modified: false, reason: "could not find footer or </main> insertion point" };
  }

  return { modified: true, content, reason: "import + component added" };
}

/**
 * Process a single clone repo.
 */
function processClone(repoPath) {
  const name = basename(repoPath);
  const pagePath = findLandingPage(repoPath);

  if (!pagePath) {
    console.log(`  ${name} | SKIP | no landing page found`);
    return;
  }

  const result = addSeoInternalLinks(pagePath);

  if (!result.modified) {
    console.log(`  ${name} | SKIP | ${result.reason}`);
    return;
  }

  if (applyMode) {
    writeFileSync(pagePath, result.content, "utf-8");
    console.log(`  ${name} | APPLIED | ${result.reason} → ${pagePath}`);
  } else {
    console.log(`  ${name} | WOULD APPLY | ${result.reason} → ${pagePath}`);
  }
}

// Main
if (fleetMode) {
  if (!existsSync(FLEET_JSON)) {
    console.error("ERROR: fleet-clones.json not found at", FLEET_JSON);
    process.exit(1);
  }
  const fleet = JSON.parse(readFileSync(FLEET_JSON, "utf-8"));
  console.log(`\nSeoInternalLinks Homepage Merge — ${applyMode ? "APPLY" : "DRY-RUN"}`);
  console.log(`Fleet: ${fleet.clones.length} clones\n`);

  for (const clone of fleet.clones) {
    const repoPath = join(GITHUB_DIR, clone.name);
    if (!existsSync(repoPath)) continue;
    processClone(repoPath);
  }
} else if (targetPaths.length > 0) {
  for (const target of targetPaths) {
    processClone(target);
  }
} else {
  console.log("Usage:");
  console.log("  node merge-seo-internal-links-to-homepage.mjs <clone-path>");
  console.log("  node merge-seo-internal-links-to-homepage.mjs --fleet");
  console.log("  Add --apply to write changes (default is dry-run)");
}

if (!applyMode && (fleetMode || targetPaths.length > 0)) {
  console.log("\nDry-run complete. Use --apply to write changes.");
}
