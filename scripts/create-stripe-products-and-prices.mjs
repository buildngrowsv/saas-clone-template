/**
 * Stripe product and price creation script.
 *
 * Run with: npm run stripe:setup
 *
 * Creates the Products and Prices in your Stripe account that match
 * the pricing configuration in src/config/product.ts.
 *
 * WHY THIS SCRIPT:
 * Instead of manually creating products in the Stripe Dashboard and
 * copying price IDs, this script automates the process. It creates
 * products with the correct metadata so the webhook handler can
 * identify plans and packs.
 *
 * IMPORTANT:
 * - Set STRIPE_SECRET_KEY in .env.local before running
 * - Run this ONCE per Stripe account (test or live)
 * - Copy the output price IDs to your .env.local
 * - For production, run against your live Stripe key
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not set. Add it to .env.local first.");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function main() {
  console.log("Creating Stripe products and prices...\n");

  /**
   * SUBSCRIPTION PLANS
   * Each plan gets a Product and a recurring monthly Price.
   * The Price metadata includes { plan: "basic" } which the webhook uses
   * to determine credit allocations.
   */
  const subscriptionPlans = [
    { id: "basic", name: "Basic Plan", price: 999, credits: 500 },
    { id: "standard", name: "Standard Plan", price: 2999, credits: 2000 },
    { id: "pro", name: "Pro Plan", price: 9999, credits: 10000 },
  ];

  console.log("SUBSCRIPTION PLANS:");
  for (const plan of subscriptionPlans) {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { plan: plan.id, credits: String(plan.credits) },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: plan.id },
    });
    const envKey = `NEXT_PUBLIC_STRIPE_PRICE_${plan.id.toUpperCase()}_MONTHLY`;
    console.log(`  ${envKey}=${price.id}`);
  }

  /**
   * CREDIT PACKS
   * Each pack gets a Product and a one-time Price.
   * The Price metadata includes { pack_type: "starter" } for the webhook.
   */
  const creditPacks = [
    { id: "starter", name: "Starter Credit Pack", price: 1999, credits: 1000 },
    { id: "growth", name: "Growth Credit Pack", price: 4999, credits: 4000 },
    { id: "professional", name: "Professional Credit Pack", price: 9999, credits: 12000 },
  ];

  console.log("\nCREDIT PACKS:");
  for (const pack of creditPacks) {
    const product = await stripe.products.create({
      name: pack.name,
      metadata: { pack_type: pack.id, credits: String(pack.credits) },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.price,
      currency: "usd",
      metadata: { pack_type: pack.id },
    });
    const envKey = `NEXT_PUBLIC_STRIPE_PRICE_${pack.id.toUpperCase()}_PACK`;
    console.log(`  ${envKey}=${price.id}`);
  }

  console.log("\n✅ Done! Copy the above values to your .env.local file.");
}

main().catch(console.error);
