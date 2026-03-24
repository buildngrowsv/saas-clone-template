/**
 * Environment variable validation script.
 *
 * Run with: npm run env:validate
 *
 * Checks that all required environment variables are set before deployment.
 * This catches configuration errors early instead of discovering them at runtime.
 *
 * WHY THIS SCRIPT:
 * Missing env vars cause confusing runtime errors ("Invalid API Key", "Cannot read
 * property of undefined", etc.). This script validates everything upfront and gives
 * clear, actionable error messages for each missing variable.
 */

const REQUIRED_VARS = [
  { name: "DATABASE_URL", description: "Neon Postgres connection string" },
  { name: "BETTER_AUTH_SECRET", description: "Random secret for signing auth tokens" },
  { name: "GOOGLE_CLIENT_ID", description: "Google OAuth Client ID" },
  { name: "GOOGLE_CLIENT_SECRET", description: "Google OAuth Client Secret" },
  { name: "STRIPE_SECRET_KEY", description: "Stripe secret API key" },
  { name: "STRIPE_WEBHOOK_SECRET", description: "Stripe webhook signing secret" },
];

const OPTIONAL_VARS = [
  { name: "NEXT_PUBLIC_APP_URL", description: "Public app URL (defaults to localhost:4738)" },
  { name: "R2_ACCOUNT_ID", description: "Cloudflare R2 account ID" },
  { name: "R2_ACCESS_KEY_ID", description: "Cloudflare R2 access key" },
  { name: "R2_SECRET_ACCESS_KEY", description: "Cloudflare R2 secret key" },
  { name: "R2_BUCKET_NAME", description: "Cloudflare R2 bucket name" },
  { name: "R2_PUBLIC_URL", description: "Cloudflare R2 public URL (optional)" },
];

console.log("Validating environment variables...\n");

let hasErrors = false;

console.log("REQUIRED:");
for (const v of REQUIRED_VARS) {
  if (process.env[v.name]) {
    console.log(`  ✓ ${v.name}`);
  } else {
    console.log(`  ✗ ${v.name} — ${v.description}`);
    hasErrors = true;
  }
}

console.log("\nOPTIONAL:");
for (const v of OPTIONAL_VARS) {
  if (process.env[v.name]) {
    console.log(`  ✓ ${v.name}`);
  } else {
    console.log(`  - ${v.name} — ${v.description} (not set)`);
  }
}

if (hasErrors) {
  console.log("\n❌ Some required environment variables are missing.");
  console.log("   Copy .env.example to .env.local and fill in the values.");
  process.exit(1);
} else {
  console.log("\n✅ All required environment variables are set.");
}
