/**
 * Pricing page — full pricing with subscription plans and credit packs.
 *
 * LAYOUT:
 * 1. Header with gradient title
 * 2. Billing toggle (Monthly / Annual — Annual shows "Save 20%" badge)
 * 3. Subscription plans (3 cards from SUBSCRIPTION_PLANS config)
 * 4. Credit packs (one-time purchases from CREDIT_PACKS config)
 * 5. Help text linking to login if not signed in
 *
 * CHECKOUT FLOW:
 * When a user clicks "Get Started" on a plan or pack:
 * 1. If not logged in → redirect to /login?redirect=/pricing
 * 2. If logged in → POST /api/stripe/checkout-session with { priceId, mode }
 * 3. API returns { url } → redirect to Stripe's hosted checkout page
 * 4. After payment → Stripe redirects to /dashboard?checkout=success
 * 5. Stripe webhook fires → allocates credits in the background
 *
 * STRIPE PRICE IDS:
 * Each plan/pack has a `priceIdEnvKey` that points to an env var holding
 * the Stripe Price ID. If the env var is not set, the button shows an error
 * toast instead of attempting checkout.
 *
 * All content comes from src/config/product.ts.
 * All branding comes from src/config/site.ts.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { siteConfig } from "@/config/site";
import {
  SUBSCRIPTION_PLANS,
  CREDIT_PACKS,
  getStripePriceId,
} from "@/config/product";
import { toast } from "sonner";

export default function PricingPage() {
  const { data: session } = authClient.useSession();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const colors = siteConfig.themeColors;

  /**
   * Handle Get Started button click for any plan or pack.
   *
   * If not logged in: redirect to login with return URL.
   * If logged in: call Stripe checkout API and redirect to Stripe.
   *
   * @param priceId - Stripe Price ID from env var
   * @param mode - "subscription" for plans, "payment" for packs
   */
  async function handleGetStarted(priceId: string | undefined, mode: "subscription" | "payment") {
    if (!priceId) {
      toast.error("This plan is not configured yet. Please set up Stripe Price IDs in your .env.local.");
      return;
    }
    if (!session?.user) {
      window.location.href = `/login?redirect=${encodeURIComponent("/pricing")}`;
      return;
    }
    setLoadingPriceId(priceId);
    try {
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoadingPriceId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-16">
        {/* Page header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className={`bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientVia} ${colors.gradientTo} bg-clip-text text-transparent`}>
              Pricing
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose a subscription or buy credits. Cancel anytime.
          </p>

          {/* Billing toggle — Monthly vs Annual */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className={!isAnnual ? "font-medium text-foreground" : "text-muted-foreground"}>
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={isAnnual ? "font-medium text-foreground" : "text-muted-foreground"}>
              Annual
            </span>
            {isAnnual && (
              <Badge variant="secondary" className="ml-2">
                Save 20%
              </Badge>
            )}
          </div>
        </div>

        {/* Subscription plans — 3 cards */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">Subscription plans</h2>
          <p className="mt-2 text-muted-foreground">
            Monthly credits, renew each billing cycle.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const priceId = getStripePriceId(plan.priceIdEnvKey);
              const isLoading = loadingPriceId === priceId;
              return (
                <Card
                  key={plan.id}
                  className={
                    plan.popular
                      ? `${colors.accentBorder} ring-1 ${colors.accentRing}`
                      : "border-border/60"
                  }
                >
                  <CardHeader className="pb-2">
                    {plan.popular && (
                      <Badge className={`mb-2 w-fit ${colors.badgeBackground} ${colors.badgeText} ${colors.badgeHover}`}>
                        Popular
                      </Badge>
                    )}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <p className="mt-2 text-3xl font-bold">
                      ${plan.priceMonthly.toFixed(2)}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{plan.credits} credits/mo</p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={isLoading}
                      onClick={() => handleGetStarted(priceId, "subscription")}
                    >
                      {isLoading ? "Redirecting..." : "Get Started"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Credit packs — one-time purchase */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold">Credit packs</h2>
          <p className="mt-2 text-muted-foreground">
            One-time purchase. Credits never expire.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CREDIT_PACKS.map((pack) => {
              const priceId = getStripePriceId(pack.priceIdEnvKey);
              const isLoading = loadingPriceId === priceId;
              return (
                <Card key={pack.id} className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <p className="mt-2 text-2xl font-bold">${pack.price.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{pack.credits.toLocaleString()} credits</p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                      onClick={() => handleGetStarted(priceId, "payment")}
                    >
                      {isLoading ? "Redirecting..." : "Buy Credits"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Help text for unauthenticated users */}
        {!session?.user && (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline hover:text-foreground">
              Sign in
            </Link>{" "}
            to purchase. New users can create an account during checkout.
          </p>
        )}
      </div>
    </div>
  );
}
