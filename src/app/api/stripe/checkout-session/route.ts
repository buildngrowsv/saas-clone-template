/**
 * POST /api/stripe/checkout-session
 *
 * Creates a Stripe Checkout session and returns the checkout URL.
 * The client redirects the user to Stripe's hosted checkout page.
 *
 * WHY STRIPE CHECKOUT (NOT ELEMENTS):
 * Stripe Checkout is a hosted payment page that handles:
 * - Payment method collection (cards, Apple Pay, Google Pay, etc.)
 * - SCA/3D Secure authentication
 * - PCI compliance (card data never touches our server)
 * - Mobile-optimized UI
 * - Tax calculation (with Stripe Tax)
 *
 * Using Checkout instead of Stripe Elements means we don't need to build
 * or maintain a payment form UI. The tradeoff is less customization of the
 * checkout experience, but for most SaaS products, Checkout is sufficient.
 *
 * REQUEST BODY:
 * {
 *   priceId: string,                        // Stripe Price ID (price_xxx)
 *   mode: "subscription" | "payment",       // subscription for plans, payment for packs
 * }
 *
 * RESPONSE:
 * { url: string }  — The Stripe Checkout URL to redirect to
 *
 * STRIPE CUSTOMER MANAGEMENT:
 * On first purchase, we create a Stripe Customer and store the ID in user_profiles.
 * On subsequent purchases, we reuse the existing customer. This ensures:
 * 1. Payment methods are remembered across purchases
 * 2. Subscription management works correctly
 * 3. Stripe's customer portal shows all their purchases
 *
 * AUTHENTICATION:
 * Requires a valid Better Auth session. Returns 401 if not authenticated.
 *
 * CALLED BY:
 * - src/app/(main)/pricing/page.tsx (handleGetStarted function)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { userProfiles } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();

  /**
   * STEP 1: Authenticate the user.
   * We need the user ID to associate the Stripe Customer and pass it
   * as metadata on the checkout session (used by webhooks later).
   */
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /**
   * STEP 2: Parse and validate request body.
   * Malformed JSON should return 400 (client error), not 500 (server error).
   */
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { priceId, mode } = body;
  if (!priceId || !mode) {
    return NextResponse.json({ error: "Missing priceId or mode" }, { status: 400 });
  }

  /**
   * STEP 3: Get or create Stripe customer for this user.
   *
   * We store the Stripe customer ID in user_profiles so we don't create
   * duplicate customers on repeat purchases. Duplicate customers cause
   * confusion in Stripe's dashboard and break subscription management.
   */
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id))
    .limit(1);

  let stripeCustomerId = profile?.stripeCustomerId;

  if (!stripeCustomerId) {
    /**
     * First purchase — create a Stripe Customer.
     * We pass the userId in metadata so Stripe webhooks can find the user.
     */
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    stripeCustomerId = customer.id;

    /**
     * Store the customer ID. If the user_profiles row doesn't exist yet,
     * this update will affect 0 rows — which is fine because the webhook
     * will handle creating the profile on subscription.created.
     */
    await db
      .update(userProfiles)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(userProfiles.userId, session.user.id));
  }

  /**
   * STEP 4: Create the Stripe Checkout session.
   *
   * The userId is passed in metadata so the webhook handler can identify
   * which user made the purchase and allocate credits accordingly.
   *
   * success_url and cancel_url point to our app pages.
   * The ?checkout=success/canceled query param lets the destination page
   * show a success or cancellation message.
   */
  // .trim() prevents silent breakage from trailing whitespace injected by `echo` during `vercel env add`
  // (verified bug: echo "url\n" | vercel env add → %0A suffix on all Stripe redirect URLs)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4738").trim();

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: mode as "subscription" | "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=canceled`,
    metadata: { userId: session.user.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
