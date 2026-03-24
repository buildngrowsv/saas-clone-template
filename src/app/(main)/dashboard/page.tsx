/**
 * Dashboard — user's credit balance, subscription plan, and quick actions.
 *
 * This page is protected by middleware (requires authentication).
 * Data is fetched client-side from /api/dashboard on mount.
 *
 * SECTIONS:
 * 1. Stats cards — credit balance and current plan
 * 2. Quick actions — links to pricing and product pages
 * 3. Placeholder for product-specific content
 *
 * CUSTOMIZATION:
 * When you build your product, extend this dashboard with:
 * - Recent activity/generation history
 * - Usage charts and analytics
 * - Account settings
 * - Team management (if applicable)
 *
 * DATA FETCHING:
 * Uses client-side fetch because the dashboard needs loading states
 * and may need real-time updates in the future. The /api/dashboard
 * endpoint returns { credits, plan } from the user_profiles table.
 */
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { siteConfig } from "@/config/site";

/**
 * Dashboard data shape — matches the /api/dashboard response.
 * Extend this interface when you add more data to the dashboard API.
 */
interface DashboardData {
  credits: number;
  plan: string;
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [dashData, setDashData] = useState<DashboardData | null>(null);

  useEffect(() => {
    /**
     * Fetch dashboard data from the /api/dashboard endpoint.
     * Falls back to defaults on error so the page always renders.
     */
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          setDashData(data);
        } else {
          setDashData({ credits: 0, plan: "free" });
        }
      } catch {
        setDashData({ credits: 0, plan: "free" });
      }
    }
    fetchDashboardData();
  }, []);

  /**
   * Plan badge colors — visual distinction for each plan level.
   * Customize these to match your brand or plan naming.
   */
  const planColors: Record<string, string> = {
    free: "bg-gray-500/10 text-gray-400",
    basic: "bg-blue-500/10 text-blue-400",
    standard: "bg-purple-500/10 text-purple-400",
    pro: "bg-yellow-500/10 text-yellow-400",
  };

  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Welcome message with user name */}
      {session?.user && (
        <p className="text-muted-foreground mb-6">
          Welcome back, {session.user.name || session.user.email || "there"}!
        </p>
      )}

      {/* Stats cards — credit balance and plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credits Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashData?.credits ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`text-sm ${planColors[dashData?.plan || "free"]}`}>
              {(dashData?.plan || "free").charAt(0).toUpperCase() + (dashData?.plan || "free").slice(1)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Button asChild>
          <Link href="/pricing">Buy Credits</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/pricing">Upgrade Plan</Link>
        </Button>
      </div>

      {/* Product-specific content placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-2">Welcome to {siteConfig.siteName}</p>
            <p className="text-sm max-w-md mx-auto">
              This is your dashboard. Customize this section with your product-specific
              content: recent activity, usage stats, or quick access to your main features.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
