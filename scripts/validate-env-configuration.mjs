#!/usr/bin/env node
/**
 * validate-env-configuration.mjs — Pre-deploy env var validation.
 *
 * Run with: npm run env:validate
 *
 * Checks that all required environment variables are set before deployment.
 * Also catches common misconfigurations: localhost in production URLs,
 * leading/trailing whitespace in OAuth secrets (breaks Google sign-in),
 * and missing recommended vars that limit features.
 *
 * WHY THIS SCRIPT:
 * Missing env vars cause confusing runtime errors ("Invalid API Key", "Cannot read
 * property of undefined", etc.). This script validates everything upfront and gives
 * clear, actionable error messages for each missing variable.
 *
 * WHY LOAD ENV FILES:
 * `vercel env pull .env.local` writes to disk, but plain `node script.mjs` does not
 * automatically hydrate `process.env`. We load common env files so running
 * `npm run env:validate` works after `vercel env pull` without manual exports.
 *
 * Updated 2026-04-08 (argon-scout-6381): Added env file loading, whitespace/localhost
 * warnings, and aligned variable list with .env.example. Pattern from GenFlix check-
 * production-env.mjs (207 lines) adapted for the base template.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, "..");

/**
 * Load simple KEY=VALUE pairs from local env files into process.env.
 * Shell-exported vars take priority (never overwritten).
 * Strips matching single/double quotes from values.
 */
function loadEnvFileIntoProcessEnv(filePath) {
  if (!fs.existsSync(filePath)) return false;

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
  return true;
}

const loadedFiles = [".env.local", ".env.production.local", ".env.production", ".env"].filter(
  (f) => loadEnvFileIntoProcessEnv(path.join(appDirectory, f))
);

/* ─── Variable lists ────────────────────────────────────────────────── */

const REQUIRED_VARS = [
  { name: "DATABASE_URL", description: "Neon/Supabase Postgres connection string" },
  { name: "BETTER_AUTH_SECRET", description: "Auth token signing secret (openssl rand -base64 32)" },
  { name: "NEXT_PUBLIC_APP_URL", description: "Public site URL for auth redirects and metadata" },
  { name: "GOOGLE_CLIENT_ID", description: "Google OAuth Client ID" },
  { name: "GOOGLE_CLIENT_SECRET", description: "Google OAuth Client Secret" },
  { name: "STRIPE_SECRET_KEY", description: "Stripe secret API key (sk_live_* or sk_test_*)" },
  { name: "STRIPE_PUBLISHABLE_KEY", description: "Stripe publishable key (pk_live_* or pk_test_*)" },
  { name: "STRIPE_WEBHOOK_SECRET", description: "Stripe webhook signing secret (whsec_*)" },
  { name: "STRIPE_PRICE_BASIC", description: "Stripe price ID for Basic tier" },
  { name: "STRIPE_PRICE_PRO", description: "Stripe price ID for Pro tier" },
  { name: "FAL_KEY", description: "fal.ai API key for AI image generation" },
];

const OPTIONAL_VARS = [
  { name: "NEXT_PUBLIC_GA_MEASUREMENT_ID", description: "GA4 Measurement ID (G-XXXXXXXXXX)" },
  { name: "NEXT_PUBLIC_GA_ID", description: "GA4 Measurement ID (legacy alias)" },
  { name: "RESEND_API_KEY", description: "Resend API key for transactional email" },
  { name: "RESEND_FROM_EMAIL", description: "Verified sender for Resend (noreply@yourdomain)" },
  { name: "R2_ACCOUNT_ID", description: "Cloudflare R2 account ID" },
  { name: "R2_ACCESS_KEY_ID", description: "Cloudflare R2 access key" },
  { name: "R2_SECRET_ACCESS_KEY", description: "Cloudflare R2 secret key" },
  { name: "R2_BUCKET_NAME", description: "Cloudflare R2 bucket name" },
  { name: "R2_PUBLIC_URL", description: "Cloudflare R2 public URL" },
];

/**
 * Keys where leading/trailing whitespace causes silent auth failures.
 * Google OAuth client IDs with a trailing \n break the consent-screen redirect.
 */
const WHITESPACE_SENSITIVE = [
  // Anything that flows into an HTTP header, auth handshake, or API bearer
  // token will silently 401/403 if a trailing \n is present — the classic
  // `echo "$VAL" | vercel env add` footgun. Always use `printf '%s' "$VAL"`.
  // Incident reference: REVIEWER-CANONICAL-FLEET-SWEEP-2026-04-08.md +
  // continuous-improvement-master.md row "OAuth/Stripe/API auth fails after
  // vercel env add".
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "BETTER_AUTH_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_BASIC",
  "STRIPE_PRICE_PRO",
  "FAL_KEY",
  "RESEND_API_KEY",
  "DATABASE_URL",
];

const URL_KEYS = ["NEXT_PUBLIC_APP_URL"];

/* ─── Checks ────────────────────────────────────────────────────────── */

if (loadedFiles.length) {
  console.log(`[env] Loaded: ${loadedFiles.join(", ")}`);
} else {
  console.warn("[env] No .env.local or .env.production(.local) found. Checking shell exports only.");
}

let exitCode = 0;

console.log("\nREQUIRED:");
for (const v of REQUIRED_VARS) {
  const val = process.env[v.name];
  if (val && val.trim()) {
    console.log(`  SET: ${v.name}`);
  } else {
    console.error(`  MISSING: ${v.name} -- ${v.description}`);
    exitCode = 1;
  }
}

console.log("\nOPTIONAL:");
for (const v of OPTIONAL_VARS) {
  const val = process.env[v.name];
  if (val && val.trim()) {
    console.log(`  SET: ${v.name}`);
  } else {
    console.log(`  UNSET: ${v.name} -- ${v.description}`);
  }
}

/* Whitespace check */
const wsOffenders = WHITESPACE_SENSITIVE.filter((k) => {
  const v = process.env[k];
  return typeof v === "string" && v !== v.trim();
});
if (wsOffenders.length) {
  console.warn("\nWARNING: Leading/trailing whitespace detected:");
  for (const k of wsOffenders) console.warn(`  - ${k}`);
  console.warn("Trim these in Vercel. Whitespace in OAuth secrets breaks Google sign-in.");
}

/* Localhost check */
const localhostOffenders = URL_KEYS.filter((k) => {
  const v = process.env[k]?.trim();
  return v?.startsWith("http://localhost") || v?.startsWith("https://localhost");
});
if (localhostOffenders.length) {
  console.warn("\nWARNING: URL vars still point at localhost:");
  for (const k of localhostOffenders) console.warn(`  - ${k}=${process.env[k]?.trim()}`);
  console.warn("Replace with production origin before deploying.");
}

/* GA4 format check */
const gaId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID)?.trim();
if (gaId && !/^G-[A-Z0-9]+$/i.test(gaId)) {
  console.warn("\nWARNING: GA4 Measurement ID should look like G-XXXXXXXXXX.");
}

if (exitCode > 0) {
  console.error("\nFix: copy names from .env.example, set them on your hosting platform, then re-run.");
  process.exit(1);
}

console.log("\nAll required variables are set.");
process.exit(0);
