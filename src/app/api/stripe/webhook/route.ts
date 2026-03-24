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
 * This is why Stripe requires webhook handling for any production integration.
 * 
 * EVENTS WE HANDLE:
 * - checkout.session.completed — User completed payment, activate subscription
 * - customer.subscription.updated — Plan change, renewal, or payment method update
 * - customer.subscription.deleted — Subscription cancelled or expired
 * 
 * SECURITY:
 * Every webhook payload is verified using the STRIPE_WEBHOOK_SECRET.
 * This prevents attackers from sending fake events to our endpoint
 * to give themselves free subscriptions.
 * 
 * TODO (PRODUCTION):
 * Replace the console.log subscription updates with actual database writes.
 * The template logs events for demonstration — in production, you'd update
 * the user's subscription status in your database.
 */

import { NextRequest, NextResponse } from "next/server";
import { stripeServerClient } from "@/lib/stripe";
import Stripe from "stripe";

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

    /**
     * Verify the webhook signature.
     * This ensures the event actually came from Stripe and wasn't forged.
     * If verification fails, constructEvent throws an error.
     */
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

    /**
     * Route the event to the appropriate handler based on event type.
     * Each handler is responsible for updating the user's subscription state.
     */
    switch (verifiedStripeEvent.type) {
      case "checkout.session.completed": {
        /**
         * CHECKOUT COMPLETED — The user successfully paid.
         * 
         * This is the most important event — it means we have a new subscriber.
         * We extract the user email and tier from the session metadata
         * (which we set when creating the checkout session in the checkout route).
         * 
         * TODO (PRODUCTION): Write subscription record to database:
         *   await db.insert(subscriptions).values({
         *     userEmail: metadata.userEmail,
         *     tier: metadata.subscriptionTier,
         *     stripeCustomerId: checkoutSession.customer,
         *     stripeSubscriptionId: checkoutSession.subscription,
         *     status: 'active',
         *   });
         */
        const completedCheckoutSession = verifiedStripeEvent.data
          .object as Stripe.Checkout.Session;
        const checkoutMetadata = completedCheckoutSession.metadata;

        console.log(
          `[Stripe Webhook] Checkout completed for ${checkoutMetadata?.userEmail} — Tier: ${checkoutMetadata?.subscriptionTier}`
        );
        console.log(
          `[Stripe Webhook] Stripe Customer ID: ${completedCheckoutSession.customer}`
        );
        console.log(
          `[Stripe Webhook] Stripe Subscription ID: ${completedCheckoutSession.subscription}`
        );

        break;
      }

      case "customer.subscription.updated": {
        /**
         * SUBSCRIPTION UPDATED — Could be a plan change, renewal, or status change.
         * 
         * WHY we handle this: When a subscription renews, Stripe sends this event
         * with the updated billing period. When a user changes plans (upgrade/downgrade),
         * this event contains the new plan details. We need to update our records
         * to reflect the current state.
         * 
         * TODO (PRODUCTION): Update subscription in database:
         *   await db.update(subscriptions)
         *     .set({ status: updatedSubscription.status, ... })
         *     .where(eq(subscriptions.stripeSubscriptionId, updatedSubscription.id));
         */
        const updatedSubscription = verifiedStripeEvent.data
          .object as Stripe.Subscription;

        console.log(
          `[Stripe Webhook] Subscription updated: ${updatedSubscription.id} — Status: ${updatedSubscription.status}`
        );

        break;
      }

      case "customer.subscription.deleted": {
        /**
         * SUBSCRIPTION DELETED — The subscription has ended.
         * 
         * This fires when:
         *   - User cancels and the period expires
         *   - Payment fails repeatedly and Stripe gives up
         *   - We manually cancel from the Stripe dashboard
         * 
         * We need to downgrade the user to the free tier.
         * 
         * TODO (PRODUCTION): Downgrade user in database:
         *   await db.update(subscriptions)
         *     .set({ status: 'cancelled', tier: 'free' })
         *     .where(eq(subscriptions.stripeSubscriptionId, deletedSubscription.id));
         */
        const deletedSubscription = verifiedStripeEvent.data
          .object as Stripe.Subscription;

        console.log(
          `[Stripe Webhook] Subscription deleted: ${deletedSubscription.id} — User downgraded to free tier`
        );

        break;
      }

      default: {
        /**
         * Unhandled event types — we log them but don't error.
         * Stripe sends many event types we don't care about (invoice.created,
         * payment_intent.succeeded, etc.). Returning 200 for unhandled events
         * prevents Stripe from retrying them.
         */
        console.log(
          `[Stripe Webhook] Unhandled event type: ${verifiedStripeEvent.type}`
        );
      }
    }

    /**
     * Always return 200 to acknowledge receipt.
     * If we return an error, Stripe will retry the event (up to 3 days),
     * which could cause duplicate processing.
     */
    return NextResponse.json({ received: true });
  } catch (webhookProcessingError) {
    console.error("Webhook processing error:", webhookProcessingError);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
