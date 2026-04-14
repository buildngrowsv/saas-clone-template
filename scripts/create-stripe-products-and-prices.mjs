#!/usr/bin/env node
/**
 * create-stripe-products-and-prices.mjs — One-time Stripe product + price setup.
 *
 * Run with: npm run stripe:setup
 *
 * Creates the Products and Prices in your Stripe account that match
 * the pricing tiers the webhook handler expects.
 *
 * WHY THIS SCRIPT:
 * Builder 2's revenue audit (2026-04-13) found ZERO live Stripe price IDs
 * across the entire fleet. Instead of manually creating products in the
 * Stripe Dashboard and copying price IDs, this script automates it and
 * prints the EXACT env var lines you need.
 *
 * ENV VAR ALIGNMENT:
 * The webhook handler (src/app/api/stripe/webhook/route.ts) reads:
 *   - STRIPE_PRICE_BASIC  → maps to plan "basic", 50 credits/month
 *   - STRIPE_PRICE_PRO    → maps to plan "pro", 9999 credits/month
 *
 * This script outputs those exact env var names so copy-paste works.
 *
 * USAGE:
 *   1. Set STRIPE_SECRET_KEY in .env.local (sk_test_* for test, sk_live_* for prod)
 *   2. Run: npm run stripe:setup
 *   3. Copy the printed env vars to .env.local or Vercel/CF dashboard
 *   4. For production: run again with your live secret key
 *
 * IMPORTANT:
 *   - Run ONCE per Stripe account (test or live)
 *   - Running again creates duplicate products (Stripe doesn't dedup by name)
 *   - Set PRODUCT_NAME env var to customize the product prefix (default: "AI Tool")
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, "..");

/**
 * Load .env.local so STRIPE_SECRET_KEY is available without manual export.
 */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

[".env.local", ".env.production.local", ".env"].forEach((f) =>
  loadEnvFile(path.join(appDirectory, f))
);

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY is not set.");
  console.error("Add it to .env.local or export it before running this script.");
  process.exit(1);
}

const isLiveKey = process.env.STRIPE_SECRET_KEY.startsWith("sk_live_");
const keyMode = isLiveKey ? "LIVE" : "TEST";

/**
 * Dynamic import so the script works even if stripe isn't globally installed —
 * it's already in the project's node_modules.
 */
const { default: Stripe } = await import("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Product name prefix. Override with PRODUCT_NAME env var to customize
 * per clone (e.g., "RemoveBG App" or "AI Logo Generator").
 */
const productPrefix = process.env.PRODUCT_NAME || "AI Tool";

async function main() {
  console.log(`\nCreating Stripe products and prices [${keyMode} mode]...`);
  console.log(`Product prefix: "${productPrefix}"\n`);

  /**
   * SUBSCRIPTION PLANS
   *
   * These MUST match the webhook handler's getPlanFromPriceId():
   *   - STRIPE_PRICE_BASIC → plan "basic", 50 credits
   *   - STRIPE_PRICE_PRO   → plan "pro", 9999 credits (effectively unlimited)
   *
   * Pricing:
   *   - Basic: $9/month (market-rate per bookmark intel research)
   *   - Pro: $29/month
   */
  const subscriptionPlans = [
    {
      envVar: "STRIPE_PRICE_BASIC",
      planSlug: "basic",
      displayName: `${productPrefix} — Basic`,
      priceInCents: 900,
      credits: 50,
    },
    {
      envVar: "STRIPE_PRICE_PRO",
      planSlug: "pro",
      displayName: `${productPrefix} — Pro`,
      priceInCents: 2900,
      credits: 9999,
    },
  ];

  const outputLines = [];

  console.log("SUBSCRIPTION PLANS:");
  for (const plan of subscriptionPlans) {
    const product = await stripe.products.create({
      name: plan.displayName,
      metadata: {
        plan: plan.planSlug,
        credits: String(plan.credits),
        template: "saas-clone-template",
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceInCents,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: plan.planSlug },
    });

    console.log(`  ${plan.envVar}=${price.id}  (${plan.displayName} — $${plan.priceInCents / 100}/mo)`);
    outputLines.push(`${plan.envVar}=${price.id}`);
  }

  console.log("\n────────────────────────────────────────");
  console.log("Copy these to .env.local or your hosting dashboard:\n");
  for (const line of outputLines) {
    console.log(`  ${line}`);
  }
  console.log("");

  if (isLiveKey) {
    console.log("MODE: LIVE — These are real production prices.");
    console.log("Set them in Vercel/CF Pages env vars with:");
    console.log('  printf \'%s\' "price_..." | vercel env add STRIPE_PRICE_BASIC production');
    console.log('  printf \'%s\' "price_..." | vercel env add STRIPE_PRICE_PRO production');
  } else {
    console.log("MODE: TEST — Re-run with a sk_live_* key for production prices.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Stripe setup failed:", err.message);
  process.exit(1);
});
