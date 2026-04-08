#!/usr/bin/env node
/**
 * merge-security-headers.mjs — Adds baseline security headers to a clone's
 * next.config.ts WITHOUT overwriting existing configuration.
 *
 * WHY: Fleet template sync cannot blindly copy next.config.ts because clones
 * have per-product customizations (next-intl, custom cache-control headers,
 * product-specific config). This script surgically inserts the 4 universal
 * security headers into the existing nextConfig object.
 *
 * PATTERNS HANDLED:
 * 1. No headers() function exists → inserts one before the closing `};`
 * 2. headers() already exists → adds missing security headers to the array
 * 3. Security headers already present → skips (idempotent)
 *
 * USAGE:
 *   node scripts/merge-security-headers.mjs <path-to-clone>          # dry-run
 *   node scripts/merge-security-headers.mjs <path-to-clone> --apply  # write
 *
 * T22 pane1775, Builder 1 (iron-viper-6183), 2026-04-08.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const SECURITY_HEADERS_BLOCK = `
  /**
   * Baseline security headers applied to every route.
   * Synced from saas-clone-template T22 (2026-04-08).
   * Deliberately omits CSP — Stripe.js, fal.media, and inline bootstraps
   * vary per clone; add CSP per-product after measuring.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },`;

const SECURITY_HEADER_ENTRIES = [
  '{ key: "X-Frame-Options", value: "DENY" }',
  '{ key: "X-Content-Type-Options", value: "nosniff" }',
  '{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }',
  '{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }',
];

function mergeSecurityHeaders(clonePath, apply = false) {
  const configPath = join(clonePath, 'next.config.ts');
  const cloneName = basename(clonePath);
  let content;

  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    console.log(`  SKIP: ${cloneName} — next.config.ts not found`);
    return 'skip';
  }

  // Check if all security headers already present
  const allPresent = SECURITY_HEADER_ENTRIES.every(h => {
    const key = h.match(/key:\s*"([^"]+)"/)?.[1];
    return key && content.includes(key);
  });

  if (allPresent) {
    console.log(`  ==     ${cloneName} — all security headers already present`);
    return 'identical';
  }

  // Determine which pattern we're dealing with
  const hasHeadersFunction = /headers\s*\(\s*\)\s*{/.test(content) ||
                              /headers:\s*async\s*\(\s*\)\s*=>/.test(content);

  let newContent;

  if (hasHeadersFunction) {
    // PATTERN 2: headers() exists — merge individual headers into the existing array.
    // Find the headers array and add missing entries.
    // Look for a `headers: [` inside the return statement's route object.
    const missingHeaders = SECURITY_HEADER_ENTRIES.filter(h => {
      const key = h.match(/key:\s*"([^"]+)"/)?.[1];
      return key && !content.includes(key);
    });

    if (missingHeaders.length === 0) {
      console.log(`  ==     ${cloneName} — all security headers already present`);
      return 'identical';
    }

    // Strategy: find the last `headers: [` block inside the headers() function,
    // and insert missing entries before the closing `]`
    // We look for the pattern: headers: [{ key: ... }] or headers: [{ key: ... }, ...]
    // and add our entries at the end of the array.

    // Find all headers arrays in the file — we want the one inside route objects
    // Pattern: `headers: [` followed by objects with `key:` inside
    const headerArrayRegex = /(headers:\s*\[)([\s\S]*?)(]\s*[,}])/g;
    let match;
    let lastRouteHeadersMatch = null;
    let lastRouteHeadersIndex = -1;

    while ((match = headerArrayRegex.exec(content)) !== null) {
      // Check if this array contains `key:` entries (route headers, not the function name)
      if (match[2].includes('key:')) {
        lastRouteHeadersMatch = match;
        lastRouteHeadersIndex = match.index;
      }
    }

    // When headers() already exists, add a NEW route object for security headers
    // rather than trying to merge into existing header arrays (which risks comma
    // and formatting issues). A separate `/:path*` route with security headers
    // is valid — Next.js merges headers from all matching routes.
    //
    // Find the return array opening: `return [` or `=> [`
    const returnArrayRegex = /((?:return\s*|=>\s*)\[)/;
    const returnMatch = content.match(returnArrayRegex);
    if (!returnMatch) {
      console.log(`  FAIL   ${cloneName} — couldn't find headers() return array`);
      return 'fail';
    }
    const securityRoute = `\n      {\n        source: "/:path*",\n        headers: [\n          ${missingHeaders.join(',\n          ')},\n        ],\n      },`;
    newContent = content.replace(returnArrayRegex, `$1${securityRoute}`);
  } else {
    // PATTERN 1: No headers() function — insert the full block.
    // Find the last property in nextConfig before the closing `};`
    // Strategy: insert before the final `};` of the nextConfig object.

    // Find `const nextConfig: NextConfig = {` ... `};`
    // We insert the headers() function before the last `};`
    const configEndRegex = /(\n)(};)\s*\n\s*\nexport/;
    const simpleEndRegex = /(\n)(};)\s*\n\nexport/;
    const anyEndRegex = /(\n)(};)\s*\n/;

    let endMatch = content.match(configEndRegex) ||
                   content.match(simpleEndRegex) ||
                   content.match(anyEndRegex);

    if (!endMatch) {
      // Try a more aggressive pattern — find the `};` that precedes `export default`
      const exportRegex = /(};)\s*\n\s*export\s+default/;
      endMatch = content.match(exportRegex);
      if (endMatch) {
        const insertPos = content.indexOf(endMatch[0]);
        newContent = content.slice(0, insertPos) +
                     SECURITY_HEADERS_BLOCK + '\n' +
                     content.slice(insertPos);
      } else {
        console.log(`  FAIL   ${cloneName} — couldn't find nextConfig closing pattern`);
        return 'fail';
      }
    } else {
      const insertPos = content.indexOf(endMatch[0]);
      newContent = content.slice(0, insertPos) + '\n' +
                   SECURITY_HEADERS_BLOCK + '\n' +
                   content.slice(insertPos);
    }
  }

  if (!newContent || newContent === content) {
    console.log(`  ==     ${cloneName} — no changes needed`);
    return 'identical';
  }

  if (apply) {
    writeFileSync(configPath, newContent, 'utf-8');
    console.log(`  MERGED ${cloneName} — security headers added`);
  } else {
    console.log(`  WOULD  ${cloneName} — security headers to add (dry-run)`);
  }

  return 'changed';
}

// --- Main ---
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: merge-security-headers.mjs <clone-path> [--apply]');
  process.exit(2);
}

const clonePath = args[0];
const apply = args.includes('--apply');

console.log(`[merge-headers] Target: ${clonePath}`);
console.log(`[merge-headers] Mode:   ${apply ? 'apply' : 'dry-run'}`);
console.log('');

const result = mergeSecurityHeaders(clonePath, apply);
console.log(`\n[merge-headers] Result: ${result}`);
if (!apply && result === 'changed') {
  console.log('[merge-headers] Dry-run. Re-run with --apply to write.');
}
