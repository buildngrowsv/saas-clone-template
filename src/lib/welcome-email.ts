/**
 * welcome-email.ts — Sends a branded welcome email when a new user signs up.
 *
 * PURPOSE AND PRODUCT STORY:
 * This is the first email a user receives after creating an account. It serves
 * three critical goals that directly impact revenue:
 *   1. CONFIRMS VALUE — tells the user about their free credits so they feel
 *      rewarded for signing up (reduces "buyer's remorse" even though they
 *      haven't paid yet).
 *   2. DRIVES FIRST GENERATION — includes a prominent CTA to the main feature
 *      page. Users who generate within the first session convert to paid at
 *      3-5x the rate of users who don't (SaaS onboarding best practice).
 *   3. PLANTS THE UPGRADE SEED — mentions paid plans in the footer so the user
 *      knows where to go when they hit free-tier limits.
 *
 * WHY THIS IS IN THE TEMPLATE:
 * Before this file existed, every clone app builder had to create their own
 * welcome email implementation. With 40+ clones in the fleet, that's 40
 * implementations to maintain. By putting it in the template:
 *   - New clones get welcome emails for free (zero per-clone effort)
 *   - The email automatically uses the clone's branding from PRODUCT_CONFIG
 *     and siteConfig (name, description, theme colors, URL, support email)
 *   - Improvements to the email template benefit ALL future clones
 *
 * HOW IT WORKS:
 * The email reads branding from src/config/site.ts (siteName, siteUrl,
 * supportEmail, themeColors) and src/lib/config.ts (PRODUCT_CONFIG pricing).
 * This means each clone automatically gets a correctly branded email without
 * any per-clone customization — just edit site.ts and config.ts as you would
 * anyway when setting up a new clone.
 *
 * TRIGGER: auth.ts → databaseHooks → user.create.after
 * The welcome email fires AFTER the user record is created in the database.
 * It is NON-BLOCKING: if Resend is not configured or the send fails, signup
 * still succeeds. This is critical because:
 *   - In development, RESEND_API_KEY is usually not set
 *   - In early deploys, email may not be configured yet
 *   - A transient Resend outage should never break user signup
 *
 * DEPENDS ON:
 * - resend (npm package) — the Resend SDK for sending emails
 * - src/config/site.ts (siteConfig — brand name, URL, support email, colors)
 * - src/lib/config.ts (PRODUCT_CONFIG — pricing tiers for upgrade mention)
 * - Environment variables: RESEND_API_KEY, RESEND_FROM_EMAIL
 *
 * IMPORTED BY:
 * - src/lib/auth.ts (called from databaseHooks.user.create.after)
 *
 * RESEND SETUP:
 * 1. Create account at https://resend.com (org: buildngrowsv@gmail.com)
 * 2. Add and verify your sending domain in Resend dashboard
 * 3. Create an API key
 * 4. Set RESEND_API_KEY and RESEND_FROM_EMAIL in your deploy env (Vercel, etc.)
 * See: Github/business-operations/general-sops/RESEND-ACCOUNT-SETUP-RUNBOOK-buildngrowsv.md
 *
 * ADDED: 2026-04-05 (template-level, based on banananano2pro + GenFlix pattern)
 */

import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import { PRODUCT_CONFIG } from "@/lib/config";

/**
 * Maps Tailwind color class fragments (e.g. "from-blue-400") to inline-safe
 * hex colors for the HTML email. Email clients don't support Tailwind classes,
 * so we need to translate the brand gradient into actual CSS colors.
 *
 * WHY A MAP INSTEAD OF PARSING:
 * Tailwind class names don't embed hex values — "from-blue-400" doesn't contain
 * "#60a5fa". We maintain a lookup table for the most common Tailwind colors
 * used in clone themes. If a color isn't found, we fall back to a safe default.
 *
 * This approach means the email automatically picks up theme changes from
 * siteConfig.themeColors without any per-clone email editing.
 */
const TAILWIND_COLOR_TO_HEX: Record<string, string> = {
  /* Blue palette — default template theme */
  "from-blue-400": "#60a5fa",
  "to-blue-600": "#2563eb",
  "via-indigo-500": "#6366f1",
  "from-blue-500": "#3b82f6",
  /* Amber/yellow palette — banananano2pro style */
  "from-amber-400": "#fbbf24",
  "from-yellow-400": "#facc15",
  "to-orange-500": "#f97316",
  "to-amber-500": "#f59e0b",
  /* Purple palette */
  "from-purple-400": "#c084fc",
  "to-purple-600": "#9333ea",
  "via-violet-500": "#8b5cf6",
  /* Green/teal palette */
  "from-green-400": "#4ade80",
  "to-emerald-600": "#059669",
  "from-teal-400": "#2dd4bf",
  "to-cyan-600": "#0891b2",
  /* Rose/pink palette */
  "from-rose-400": "#fb7185",
  "to-pink-600": "#db2777",
  /* Red palette */
  "from-red-400": "#f87171",
  "to-red-600": "#dc2626",
};

/**
 * Resolves a Tailwind gradient class fragment to a hex color.
 * Falls back to a neutral accent (#60a5fa, a pleasant blue) when the
 * theme uses a color not in our lookup table.
 */
function resolveThemeColorToHex(tailwindClass: string): string {
  return TAILWIND_COLOR_TO_HEX[tailwindClass] || "#60a5fa";
}

/**
 * Builds the branded HTML email body.
 *
 * DESIGN DECISIONS:
 * - Dark theme (background #0a0a0f) matches the typical SaaS clone dark UI
 * - Inline styles only — email clients strip <style> tags and ignore CSS classes
 * - The accent color comes from the clone's themeColors.gradientFrom, so each
 *   clone's email automatically matches its brand (blue for default, amber for
 *   banana, purple for upscaler, etc.)
 * - Feature list is generic ("AI-powered [product]") because each clone's
 *   specific capabilities differ — the CTA drives them to discover in-app
 * - CTA button uses the brand gradient for visual consistency with the web app
 * - Footer mentions pricing from PRODUCT_CONFIG so the upgrade path is clear
 *
 * WHY NOT A TEMPLATE ENGINE (e.g. React Email, MJML):
 * For a single transactional email, raw HTML with string interpolation is simpler
 * and has zero additional dependencies. If we add more email types (usage alerts,
 * upgrade prompts, re-engagement), we should consider React Email for maintainability.
 */
function buildWelcomeHtml(name: string): string {
  const greetingName = name?.trim() || "there";
  const brandName = siteConfig.siteName;
  const appUrl = siteConfig.siteUrl;
  const supportEmail = siteConfig.supportEmail || "support@symplyai.io";

  /**
   * Resolve brand colors from Tailwind classes to hex for inline CSS.
   * The gradient start color is used for accent text (e.g. credit count),
   * and both start/end are used for the CTA button gradient.
   */
  const accentHex = resolveThemeColorToHex(
    siteConfig.themeColors.gradientFrom
  );
  const gradientEndHex = resolveThemeColorToHex(
    siteConfig.themeColors.gradientTo
  );

  /**
   * Pricing context — show the cheapest paid tier so users know upgrading
   * is affordable. Uses PRODUCT_CONFIG.pricing.basic.price which each clone
   * sets in src/lib/config.ts.
   */
  const basicPrice = PRODUCT_CONFIG.pricing.basic.price;
  const pricingLine = basicPrice > 0
    ? `Need more credits? Plans start at $${basicPrice.toFixed(2)}/mo with monthly refills.`
    : "Need more credits? Check out our paid plans for higher limits.";

  /**
   * Free tier limit — shown in the email so the user knows exactly what
   * they're getting. Pulled from PRODUCT_CONFIG.pricing.free.limit.
   */
  const freeLimit = PRODUCT_CONFIG.pricing.free.limit;
  const creditsPhrase = freeLimit === 1
    ? "1 free credit"
    : `${freeLimit} free credits`;

  return `
    <div style="background:#0a0a0f;padding:32px 20px;font-family:Inter,system-ui,-apple-system,sans-serif;color:#f8fafc;">
      <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,rgba(17,24,39,0.96),rgba(10,10,18,0.98));border:1px solid ${accentHex}30;border-radius:24px;padding:32px;">
        <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.32em;text-transform:uppercase;color:${accentHex};">Welcome to ${brandName}</p>
        <h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.2;color:#ffffff;">Your account is ready</h1>
        <p style="margin:0 0 20px 0;font-size:16px;line-height:1.7;color:#cbd5e1;">
          Hi ${greetingName}, thanks for signing up! We added <strong style="color:${accentHex};">${creditsPhrase}</strong> to your account so you can start creating right away — no credit card needed.
        </p>
        <p style="margin:0 0 24px 0;">
          <a href="${appUrl}/generate" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,${accentHex},${gradientEndHex});color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">Start creating &rarr;</a>
        </p>
        <p style="margin:0 0 12px 0;color:#94a3b8;font-size:14px;">${pricingLine}</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Questions? Reply to this email or contact ${supportEmail}.</p>
      </div>
    </div>
  `;
}

/**
 * Plain-text fallback for email clients that don't render HTML.
 * Some corporate email filters strip HTML entirely, and accessibility
 * tools sometimes prefer the text version. Always include both.
 */
function buildWelcomeText(name: string): string {
  const greetingName = name?.trim() || "there";
  const brandName = siteConfig.siteName;
  const appUrl = siteConfig.siteUrl;
  const supportEmail = siteConfig.supportEmail || "support@symplyai.io";
  const freeLimit = PRODUCT_CONFIG.pricing.free.limit;
  const basicPrice = PRODUCT_CONFIG.pricing.basic.price;

  return [
    `Hi ${greetingName},`,
    "",
    `Welcome to ${brandName}! We added ${freeLimit} free credits to your account.`,
    "",
    `Start creating: ${appUrl}/generate`,
    "",
    basicPrice > 0
      ? `Need more credits? Plans start at $${basicPrice.toFixed(2)}/mo.`
      : "Need more credits? Check out our paid plans for higher limits.",
    "",
    `Questions? Contact ${supportEmail}.`,
  ].join("\n");
}

/**
 * Send a branded welcome email to a newly signed-up user.
 *
 * BEHAVIOR:
 * - Returns { skipped: true } when RESEND_API_KEY or RESEND_FROM_EMAIL is not
 *   configured. This makes the function safe to call in any environment — dev,
 *   CI, preview deploys — without crashing.
 * - Throws on Resend API errors so the caller (auth.ts databaseHook) can catch
 *   and log without breaking signup.
 * - The caller MUST wrap this in try/catch to ensure signup is never blocked
 *   by email failures.
 *
 * @param email - The new user's email address (from OAuth provider or signup form)
 * @param name - The user's display name (may be null for email-only signups)
 * @returns { skipped: boolean } — true if email was not sent due to missing config
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string | null
): Promise<{ skipped: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  /**
   * Graceful skip when Resend is not configured.
   * This is the expected state in development and early deploys.
   * The console.warn helps developers know the feature exists and
   * what env vars to set when they're ready to enable it.
   */
  if (!apiKey || !fromEmail) {
    console.warn(
      "[welcome-email] Skipping — RESEND_API_KEY or RESEND_FROM_EMAIL not configured. " +
      "Set these env vars to enable welcome emails."
    );
    return { skipped: true };
  }

  const resend = new Resend(apiKey);
  const brandName = siteConfig.siteName;

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: `Welcome to ${brandName} — your free credits are ready`,
    html: buildWelcomeHtml(name || ""),
    text: buildWelcomeText(name || ""),
  });

  if (error) {
    /**
     * Throw so the caller's try/catch can log the failure without silently
     * swallowing it. The auth hook in auth.ts catches this and logs a warning
     * but never blocks signup.
     */
    throw new Error(
      `[welcome-email] Resend rejected welcome email to ${email}: ${JSON.stringify(error)}`
    );
  }

  console.log(`[welcome-email] Sent welcome email to ${email} for ${brandName}`);
  return { skipped: false };
}
