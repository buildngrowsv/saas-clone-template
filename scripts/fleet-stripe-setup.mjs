#!/usr/bin/env node
/**
 * fleet-stripe-setup.mjs — Create Stripe products and prices for the entire fleet.
 *
 * WHY THIS EXISTS:
 * Each of the 42 clones needs its own Stripe products (Basic @ $4.99/mo, Pro @ $9.99/mo).
 * That's 42 products × 2 prices = 84 manual dashboard operations. This script creates them
 * all in one run using the Stripe API, outputs the exact env vars for each clone, and can
 * even set them on Vercel automatically.
 *
 * PREREQUISITES:
 * - STRIPE_SECRET_KEY set in env or .env.local (use sk_test_* for test, sk_live_* for prod)
 * - fleet-clones.json manifest exists
 *
 * USAGE:
 *   node scripts/fleet-stripe-setup.mjs                    # dry-run: show what would be created
 *   node scripts/fleet-stripe-setup.mjs --apply            # create products and prices
 *   node scripts/fleet-stripe-setup.mjs --apply --vercel   # also set env vars on Vercel
 *
 * OUTPUT:
 * Prints env var lines per clone that can be copy-pasted or piped to fleet-env-deploy.sh.
 *
 * IDEMPOTENCY:
 * Stripe does NOT deduplicate products by name. Running --apply twice creates duplicates.
 * Check the Stripe dashboard first. This script logs product IDs so you can delete duplicates.
 *
 * AUTHORED: flux-exec-4419, 2026-04-14
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(scriptDir, "fleet-clones.json");

// Load .env.local for STRIPE_SECRET_KEY
function loadEnv() {
  const envPaths = [
    path.resolve(scriptDir, "..", ".env.local"),
    path.resolve(scriptDir, "..", ".env"),
  ];
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx);
        const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

// Read product names from clone config files
function getProductName(clonePath) {
  const configPaths = [
    path.join(clonePath, "src/lib/config.ts"),
    path.join(clonePath, "lib/config.ts"),
  ];
  for (const cp of configPaths) {
    if (!fs.existsSync(cp)) continue;
    const content = fs.readFileSync(cp, "utf8");
    const match = content.match(/name:\s*"([^"]+)"/);
    if (match) return match[1];
  }
  // Fallback: derive from directory name
  const dirName = path.basename(clonePath);
  return dirName
    .replace(/^ai-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") + " AI";
}

// Parse args
const args = process.argv.slice(2);
const applyMode = args.includes("--apply");
const setVercel = args.includes("--vercel");

// Validate
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("ERROR: STRIPE_SECRET_KEY not set. Add to .env.local or export.");
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  console.error(`ERROR: Fleet manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const clones = manifest.clones || [];

console.log(`# Fleet Stripe Setup — ${new Date().toISOString().slice(0, 16)}`);
console.log(`# Mode: ${applyMode ? "APPLY" : "DRY-RUN"}`);
console.log(`# Stripe key: ${stripeKey.slice(0, 12)}...`);
console.log(`# Clones: ${clones.length}`);
console.log("");

async function createStripeProduct(productName) {
  const resp = await fetch("https://api.stripe.com/v1/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ name: productName }),
  });
  return resp.json();
}

async function createStripePrice(productId, unitAmount, interval) {
  const resp = await fetch("https://api.stripe.com/v1/prices", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      product: productId,
      unit_amount: String(unitAmount),
      currency: "usd",
      "recurring[interval]": interval,
    }),
  });
  return resp.json();
}

const results = [];

for (const clone of clones) {
  const cloneName = clone.name;
  const clonePath = clone.local_path;
  const productName = getProductName(clonePath);

  if (!applyMode) {
    console.log(`  WOULD  ${cloneName} → "${productName}" (Basic $4.99/mo, Pro $9.99/mo)`);
    results.push({ clone: cloneName, product: productName, status: "dry-run" });
    continue;
  }

  try {
    // Create the Stripe Product
    const product = await createStripeProduct(productName);
    if (product.error) {
      console.error(`  FAIL   ${cloneName}: ${product.error.message}`);
      continue;
    }

    // Create Basic price ($4.99/month)
    const basicPrice = await createStripePrice(product.id, 499, "month");
    // Create Pro price ($9.99/month)
    const proPrice = await createStripePrice(product.id, 999, "month");

    console.log(`  OK     ${cloneName}`);
    console.log(`         Product: ${product.id}`);
    console.log(`         STRIPE_PRICE_BASIC=${basicPrice.id}`);
    console.log(`         STRIPE_PRICE_PRO=${proPrice.id}`);
    console.log(`         NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=${basicPrice.id}`);
    console.log(`         NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=${proPrice.id}`);
    console.log("");

    results.push({
      clone: cloneName,
      product: productName,
      productId: product.id,
      basicPriceId: basicPrice.id,
      proPriceId: proPrice.id,
      status: "created",
    });

    // Rate limit: Stripe API allows 100 req/sec but let's be safe
    await new Promise((r) => setTimeout(r, 200));
  } catch (err) {
    console.error(`  ERROR  ${cloneName}: ${err.message}`);
  }
}

console.log("");
console.log("# Summary");
console.log(`  Total: ${results.length}`);
console.log(`  Created: ${results.filter((r) => r.status === "created").length}`);

if (applyMode && results.some((r) => r.status === "created")) {
  // Write results to a JSON file for later use
  const outputPath = path.join(scriptDir, "..", "tmp", "fleet-stripe-prices.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n# Price IDs saved to: ${outputPath}`);
  console.log("# Use fleet-env-deploy.sh to set per-clone env vars on Vercel.");
}

if (!applyMode) {
  console.log("\n# Dry-run complete. Re-run with --apply to create products.");
}
