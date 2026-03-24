/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for the complete subscription and payment lifecycle.
 *
 * WHY WEBHOOKS:
 * Stripe webhooks are the ONLY reliable way to handle payment events. You can't
 * rely on the checkout success_url redirect because:
 * 1. The user might close the browser before the redirect
 * 2. Payment processing can take seconds (3D Secure, bank transfers)
 * 3. Subscription renewals happen automatically with no user interaction
 *
 * Webhooks guarantee that every payment event is processed, even if the user
 * disconnects. Stripe retries failed webhook deliveries for up to 3 days.
 *
 * EVENTS HANDLED:
 * - checkout.session.completed → Allocate credits for one-time pack purchases
 * - customer.subscription.created → Create/update subscription record
 * - customer.subscription.updated → Sync subscription status changes
 * - customer.subscription.deleted → Cancel subscription, downgrade to free plan
 * - invoice.payment_succeeded → Monthly credit allocation for active subscriptions
 *
 * SECURITY:
 * Every webhook request is verified using Stripe's webhook signing secret.
 * This prevents attackers from sending fake events to credit themselves.
 * The signature verification uses the raw request body (not parsed JSON)
 * because JSON parsing can change the byte order which breaks the signature.
 *
 * IMPORTANT: This route must be public in middleware.ts (no auth required).
 * Stripe sends webhooks directly — there's no user session involved.
 *
 * SETUP:
 * 1. In Stripe Dashboard > Developers > Webhooks, create an endpoint
 * 2. URL: https://yourdomain.com/api/stripe/webhook
 * 3. Select events: checkout.session.completed, customer.subscription.*,
 *    invoice.payment_succeeded
 * 4. Copy the signing secret (whsec_xxx) to STRIPE_WEBHOOK_SECRET in .env.local
 *
 * CREDIT ALLOCATION:
 * Credit amounts for plans and packs are defined in src/config/product.ts
 * (PLAN_CREDITS_ALLOCATION and PACK_CREDITS_ALLOCATION). Keep those in sync
 * with what you display on the pricing page.
 */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { userProfiles } from "@/db/schema/users";
import { subscriptions } from "@/db/schema/subscriptions";
import { eq } from "drizzle-orm";
import { addCredits } from "@/lib/credits";
import { getStripe } from "@/lib/stripe";
import {
  PLAN_CREDITS_ALLOCATION,
  PACK_CREDITS_ALLOCATION,
} from "@/config/product";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();

  /**
   * STEP 1: Validate the Stripe signature header.
   * If the header is missing, this isn't a real Stripe webhook — reject immediately.
   */
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 401 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET env var is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  /**
   * STEP 2: Verify the webhook signature.
   * This cryptographically proves the event came from Stripe and wasn't tampered with.
   * Uses the raw body text (not parsed JSON) because parsing can alter byte order.
   */
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("[stripe/webhook] Signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  /**
   * STEP 3: Handle the event based on type.
   * Each case handles a specific Stripe event and performs the corresponding
   * database operations (credit allocation, subscription sync, etc.).
   */
  switch (event.type) {
    case "checkout.session.completed": {
      /**
       * A checkout session was completed — the user paid successfully.
       * For subscriptions, we handle credits on invoice.payment_succeeded instead.
       * For one-time payments (credit packs), we allocate credits here.
       */
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      if (session.mode === "payment") {
        /**
         * One-time credit pack purchase.
         * We look up the pack type from the Stripe Price metadata to determine
         * how many credits to allocate. The pack_type metadata is set when
         * creating prices in Stripe Dashboard.
         */
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          const packType = (price.metadata?.pack_type || "starter") as string;
          const credits = PACK_CREDITS_ALLOCATION[packType] || 1000;
          await addCredits(userId, credits, `pack_purchase:${packType}`);
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      /**
       * Subscription created or updated — sync state to our database.
       * Uses upsert (INSERT ... ON CONFLICT DO UPDATE) so both events
       * can be handled by the same code path.
       *
       * The plan slug is read from the Price metadata (e.g., { plan: "standard" }).
       * This metadata must be set when creating prices in Stripe Dashboard.
       */
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const plan = (sub.items.data[0]?.price?.metadata?.plan || "basic") as string;

      await db
        .insert(subscriptions)
        .values({
          userId,
          stripeSubscriptionId: sub.id,
          plan,
          status: sub.status,
          currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
        })
        .onConflictDoUpdate({
          target: subscriptions.stripeSubscriptionId,
          set: {
            plan,
            status: sub.status,
            currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
            updatedAt: new Date(),
          },
        });

      /**
       * Also update the user's plan in user_profiles for quick lookups.
       * This avoids joining to the subscriptions table for simple plan checks.
       */
      await db
        .update(userProfiles)
        .set({ plan, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId));

      break;
    }

    case "customer.subscription.deleted": {
      /**
       * Subscription canceled — downgrade user to free plan.
       * The user may still have credits from their last allocation,
       * which they can continue to use until depleted.
       */
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await db
        .update(subscriptions)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));

      await db
        .update(userProfiles)
        .set({ plan: "free", updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId));

      break;
    }

    case "invoice.payment_succeeded": {
      /**
       * Monthly subscription renewal — allocate credits.
       *
       * This fires on every successful invoice payment, including the first one.
       * For subscriptions, this is where we give the user their monthly credits.
       * We check that this is a subscription invoice (not a one-time payment)
       * by verifying the invoice has a subscription field.
       */
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = sub.metadata?.userId;
        if (userId) {
          const plan = (sub.items.data[0]?.price?.metadata?.plan || "basic") as string;
          const credits = PLAN_CREDITS_ALLOCATION[plan] || 500;
          await addCredits(userId, credits, `subscription_renewal:${plan}`);
        }
      }
      break;
    }
  }

  /**
   * Always return 200 OK to Stripe, even for unhandled events.
   * Returning non-200 causes Stripe to retry, which is wasteful for events we don't care about.
   */
  return NextResponse.json({ received: true });
}
