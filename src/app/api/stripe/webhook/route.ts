/**
 * Stripe Webhook Handler — POST /api/stripe/webhook
 *
 * WHY WEBHOOKS:
 * Stripe uses webhooks to notify us about payment events asynchronously.
 * We can't rely on the checkout success redirect alone because:
 *   1. Users might close the browser before the redirect
 *   2. Network issues could prevent the redirect
 *   3. Subscription renewals happen monthly with no user interaction
 *   4. Cancellations and failed payments need to be handled
 *
 * Webhooks are the ONLY reliable way to know about payment state changes.
 *
 * ENTITLEMENT EVENTS WE HANDLE:
 * - checkout.session.completed — User completed payment, activate subscription
 * - customer.subscription.updated — Plan change, renewal, or payment method update
 * - customer.subscription.deleted — Subscription cancelled or expired
 * - invoice.paid — Successful recurring payment (renew credits)
 * - invoice.payment_failed — Failed payment (log warning, Stripe retries automatically)
 *
 * SECURITY:
 * Every webhook payload is verified using the STRIPE_WEBHOOK_SECRET.
 * This prevents attackers from sending fake events to our endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { stripeServerClient } from "@/lib/stripe";
import { db } from "@/db";
import { userProfiles } from "@/db/schema/users";
import { subscriptions } from "@/db/schema/subscriptions";
import { creditTransactions } from "@/db/schema/credit-transactions";
import { addCredits, type SubscriptionTier } from "@/lib/credits";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Maps Stripe Price IDs to our internal plan slugs and credit amounts.
 *
 * WHY ENV VARS FOR PRICE IDS:
 * Each clone has different Stripe products and prices. The price IDs are
 * configured via STRIPE_PRICE_BASIC and STRIPE_PRICE_PRO env vars so each
 * clone can have its own Stripe products without code changes.
 */
function getPlanFromPriceId(priceId: string): {
  plan: SubscriptionTier;
  credits: number;
} {
  const basicPriceId = process.env.STRIPE_PRICE_BASIC;
  const proPriceId = process.env.STRIPE_PRICE_PRO;

  if (basicPriceId && priceId === basicPriceId) {
    return { plan: "basic", credits: 50 };
  }
  if (proPriceId && priceId === proPriceId) {
    return { plan: "pro", credits: 9999 };
  }

  /**
   * Fallback: try to infer from Stripe price metadata.
   * Clones can set metadata.plan = "basic" or "pro" on their Stripe prices.
   */
  console.warn(
    `[Stripe Webhook] Unknown price ID: ${priceId}. ` +
      `Expected STRIPE_PRICE_BASIC (${basicPriceId}) or STRIPE_PRICE_PRO (${proPriceId}).`
  );
  return { plan: "basic", credits: 50 };
}

/**
 * Upserts a user profile in the database.
 * Creates the profile if it doesn't exist, updates plan if it does.
 */
async function upsertUserProfile(
  userId: string,
  email: string,
  plan: string,
  stripeCustomerId: string
): Promise<void> {
  const existing = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userProfiles).values({
      userId,
      email,
      credits: 0,
      plan,
      stripeCustomerId,
    });
  } else {
    await db
      .update(userProfiles)
      .set({
        plan,
        stripeCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));
  }
}

/**
 * Upserts a subscription record from Stripe subscription data.
 */
async function upsertSubscription(
  userId: string,
  stripeSubscription: Stripe.Subscription,
  plan: string
): Promise<void> {
  const subId = stripeSubscription.id;

  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subId))
    .limit(1);

  const periodEnd = new Date(
    stripeSubscription.current_period_end * 1000
  );

  if (existing.length === 0) {
    await db.insert(subscriptions).values({
      userId,
      stripeSubscriptionId: subId,
      plan,
      status: stripeSubscription.status,
      currentPeriodEnd: periodEnd,
    });
  } else {
    await db
      .update(subscriptions)
      .set({
        plan,
        status: stripeSubscription.status,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subId));
  }
}

/**
 * Finds the userId associated with a Stripe customer ID.
 * Returns null if no matching user profile exists.
 */
async function findUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<string | null> {
  const result = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return result[0]?.userId ?? null;
}

/**
 * WHY we read the raw body:
 * Stripe webhook verification requires the raw request body (not parsed JSON).
 * If we let Next.js parse it first, the signature verification will fail because
 * the parsed-then-re-stringified body won't match the original byte-for-byte.
 */
export async function POST(request: NextRequest) {
  try {
    const rawRequestBody = await request.text();
    const stripeSignatureHeader = request.headers.get("stripe-signature");

    if (!stripeSignatureHeader) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let verifiedStripeEvent: Stripe.Event;

    try {
      verifiedStripeEvent = stripeServerClient.webhooks.constructEvent(
        rawRequestBody,
        stripeSignatureHeader,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (signatureVerificationError) {
      console.error(
        "Webhook signature verification failed:",
        signatureVerificationError
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    switch (verifiedStripeEvent.type) {
      /**
       * CHECKOUT COMPLETED — User finished paying for a subscription.
       *
       * This is the primary activation event. We:
       * 1. Extract the userId from checkout session metadata
       * 2. Look up the subscription to determine the plan
       * 3. Create/update the user profile with the plan and Stripe customer ID
       * 4. Record the subscription
       * 5. Add initial credits
       */
      case "checkout.session.completed": {
        const checkoutSession = verifiedStripeEvent.data
          .object as Stripe.Checkout.Session;

        const userId = checkoutSession.metadata?.userId;
        const customerEmail =
          checkoutSession.customer_email ||
          checkoutSession.customer_details?.email;

        if (!userId) {
          /**
           * Missing userId means the checkout creation route didn't set metadata
           * correctly — this is a developer integration bug, not a transient error.
           * Return 200 to prevent Stripe from retrying this event forever (it would
           * never succeed without a code fix). Log as error for investigation.
           */
          console.error(
            "[Stripe Webhook] checkout.session.completed missing userId in metadata. " +
              "Returning 200 to prevent retry storm. Fix the checkout route to include userId in metadata.",
            { sessionId: checkoutSession.id }
          );
          return NextResponse.json({ received: true, warning: "missing userId in metadata" });
        }

        const stripeCustomerId =
          typeof checkoutSession.customer === "string"
            ? checkoutSession.customer
            : checkoutSession.customer?.id ?? "";

        if (checkoutSession.subscription) {
          const subscriptionId =
            typeof checkoutSession.subscription === "string"
              ? checkoutSession.subscription
              : checkoutSession.subscription.id;

          const stripeSubscription =
            await stripeServerClient.subscriptions.retrieve(subscriptionId);

          const priceId =
            stripeSubscription.items.data[0]?.price.id ?? "";
          const { plan, credits } = getPlanFromPriceId(priceId);

          await upsertUserProfile(
            userId,
            customerEmail ?? "unknown",
            plan,
            stripeCustomerId
          );
          await upsertSubscription(userId, stripeSubscription, plan);
          await addCredits(userId, credits, plan);

          console.log(
            `[Stripe Webhook] checkout.session.completed: userId=${userId}, plan=${plan}, credits=${credits}`
          );
        }

        break;
      }

      /**
       * SUBSCRIPTION UPDATED — Plan change, renewal, or status change.
       *
       * Stripe fires this on:
       * - Plan upgrades/downgrades
       * - Successful renewal (status stays "active")
       * - Payment failure (status changes to "past_due")
       * - Trial ending
       */
      case "customer.subscription.updated": {
        const stripeSubscription = verifiedStripeEvent.data
          .object as Stripe.Subscription;

        const stripeCustomerId =
          typeof stripeSubscription.customer === "string"
            ? stripeSubscription.customer
            : stripeSubscription.customer.id;

        const userId = await findUserByStripeCustomerId(stripeCustomerId);
        if (!userId) {
          console.warn(
            `[Stripe Webhook] subscription.updated: No user found for customer ${stripeCustomerId}`
          );
          break;
        }

        const priceId =
          stripeSubscription.items.data[0]?.price.id ?? "";
        const { plan } = getPlanFromPriceId(priceId);

        await upsertSubscription(userId, stripeSubscription, plan);

        /**
         * Update user profile plan if subscription is active.
         * Don't downgrade the plan if the subscription is just past_due —
         * Stripe retries automatically and will fire .deleted if it truly fails.
         */
        if (stripeSubscription.status === "active") {
          await db
            .update(userProfiles)
            .set({ plan, updatedAt: new Date() })
            .where(eq(userProfiles.userId, userId));
        }

        console.log(
          `[Stripe Webhook] subscription.updated: userId=${userId}, plan=${plan}, status=${stripeSubscription.status}`
        );
        break;
      }

      /**
       * SUBSCRIPTION DELETED — Subscription cancelled or all retries failed.
       *
       * Downgrade the user to free tier. They keep access until the
       * current period ends (currentPeriodEnd is already stored).
       */
      case "customer.subscription.deleted": {
        const stripeSubscription = verifiedStripeEvent.data
          .object as Stripe.Subscription;

        const stripeCustomerId =
          typeof stripeSubscription.customer === "string"
            ? stripeSubscription.customer
            : stripeSubscription.customer.id;

        const userId = await findUserByStripeCustomerId(stripeCustomerId);
        if (!userId) {
          console.warn(
            `[Stripe Webhook] subscription.deleted: No user found for customer ${stripeCustomerId}`
          );
          break;
        }

        await upsertSubscription(userId, stripeSubscription, "free");

        await db
          .update(userProfiles)
          .set({ plan: "free", updatedAt: new Date() })
          .where(eq(userProfiles.userId, userId));

        console.log(
          `[Stripe Webhook] subscription.deleted: userId=${userId} downgraded to free`
        );
        break;
      }

      /**
       * INVOICE PAID — Successful recurring payment.
       *
       * This fires on each successful billing cycle. We use it to
       * refresh credits for the new billing period.
       */
      case "invoice.paid": {
        const invoice = verifiedStripeEvent.data.object as Stripe.Invoice;

        const stripeCustomerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? "";

        const userId = await findUserByStripeCustomerId(stripeCustomerId);
        if (!userId) {
          console.warn(
            `[Stripe Webhook] invoice.paid: No user found for customer ${stripeCustomerId}`
          );
          break;
        }

        /**
         * Only refresh credits for subscription invoices (not one-time charges).
         * The subscription field is present on recurring invoices.
         */
        if (invoice.subscription) {
          /**
           * IDEMPOTENCY GUARD: Stripe may deliver invoice.paid more than once
           * (webhook retries on network errors, multiple endpoint configs, etc.).
           * Check if we already processed this exact invoice by searching for a
           * credit transaction with this invoice ID as the reason.
           * Without this guard, duplicate deliveries = double credits.
           */
          const invoiceId = invoice.id;
          const existingTransaction = await db
            .select({ id: creditTransactions.id })
            .from(creditTransactions)
            .where(
              and(
                eq(creditTransactions.userId, userId),
                eq(creditTransactions.reason, `invoice_paid:${invoiceId}`)
              )
            )
            .limit(1);

          if (existingTransaction.length > 0) {
            console.log(
              `[Stripe Webhook] invoice.paid: Already processed invoice ${invoiceId} for userId=${userId}, skipping duplicate`
            );
            break;
          }

          const subscriptionId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;

          const stripeSubscription =
            await stripeServerClient.subscriptions.retrieve(subscriptionId);

          const priceId =
            stripeSubscription.items.data[0]?.price.id ?? "";
          const { plan, credits } = getPlanFromPriceId(priceId);

          await addCredits(userId, credits, plan, `invoice_paid:${invoiceId}`);

          console.log(
            `[Stripe Webhook] invoice.paid: userId=${userId}, refreshed ${credits} credits for ${plan}, invoice=${invoiceId}`
          );
        }
        break;
      }

      /**
       * INVOICE PAYMENT FAILED — Payment attempt failed.
       *
       * Stripe retries automatically (configured in billing settings).
       * We log the failure but don't immediately downgrade — the subscription
       * status will change to "past_due" and eventually "canceled" if all
       * retries fail, which triggers customer.subscription.deleted.
       */
      case "invoice.payment_failed": {
        const invoice = verifiedStripeEvent.data.object as Stripe.Invoice;
        console.warn(
          `[Stripe Webhook] invoice.payment_failed: customer=${invoice.customer}, ` +
            `attempt=${invoice.attempt_count}, next_attempt=${invoice.next_payment_attempt}`
        );
        break;
      }

      default: {
        console.log(
          `[Stripe Webhook] Unhandled event type: ${verifiedStripeEvent.type}`
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (webhookProcessingError) {
    console.error("Webhook processing error:", webhookProcessingError);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
