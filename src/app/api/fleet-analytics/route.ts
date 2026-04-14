/**
 * GET /api/fleet-analytics — Cross-product analytics for the shared fleet database.
 *
 * WHY THIS EXISTS:
 * With 42 clones sharing one Neon Postgres via product_slug namespacing, we can
 * query fleet-wide metrics from ANY clone's API. This gives the operator a single
 * endpoint to see total users, generation volume, and per-product breakdown without
 * building a separate admin dashboard.
 *
 * SECURITY:
 * Protected by a simple bearer token (FLEET_ANALYTICS_SECRET env var).
 * This is NOT a user-facing endpoint — it's for operator/admin dashboards only.
 * Do NOT expose this to the frontend or link it from any page.
 *
 * USAGE:
 *   curl -H "Authorization: Bearer $FLEET_ANALYTICS_SECRET" \
 *     https://any-clone.vercel.app/api/fleet-analytics
 *
 * RESPONSE SHAPE:
 * {
 *   totalUsers: number,
 *   totalGenerations: number,
 *   productBreakdown: [{ slug, users, generations, paidUsers }],
 *   generatedAt: string
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userProfiles } from "@/db/schema/users";
import { creditTransactions } from "@/db/schema/credit-transactions";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  /**
   * Auth check: require FLEET_ANALYTICS_SECRET bearer token.
   * If not set, this endpoint is disabled entirely (returns 404-like response
   * so port scanners don't discover it as a valid endpoint).
   */
  const secret = process.env.FLEET_ANALYTICS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    /**
     * Per-product user counts — how many users has each clone attracted?
     * Groups by product_slug so we can see which tools are getting traction.
     */
    const usersByProduct = await db
      .select({
        slug: userProfiles.productSlug,
        totalUsers: sql<number>`COUNT(*)`,
        paidUsers: sql<number>`COUNT(CASE WHEN ${userProfiles.plan} != 'free' THEN 1 END)`,
      })
      .from(userProfiles)
      .groupBy(userProfiles.productSlug)
      .orderBy(sql`COUNT(*) DESC`);

    /**
     * Per-product generation counts — how many credits have been consumed?
     * Only counts negative transactions (deductions = actual generations).
     */
    const generationsByProduct = await db
      .select({
        slug: creditTransactions.productSlug,
        totalGenerations: sql<number>`COUNT(CASE WHEN ${creditTransactions.amount} < 0 THEN 1 END)`,
      })
      .from(creditTransactions)
      .groupBy(creditTransactions.productSlug)
      .orderBy(sql`COUNT(CASE WHEN ${creditTransactions.amount} < 0 THEN 1 END) DESC`);

    /**
     * Merge users and generations into a single per-product breakdown.
     */
    const generationsMap = new Map(
      generationsByProduct.map((g) => [g.slug, Number(g.totalGenerations)])
    );

    const productBreakdown = usersByProduct.map((u) => ({
      slug: u.slug,
      users: Number(u.totalUsers),
      paidUsers: Number(u.paidUsers),
      generations: generationsMap.get(u.slug) ?? 0,
    }));

    const totalUsers = productBreakdown.reduce((sum, p) => sum + p.users, 0);
    const totalGenerations = productBreakdown.reduce(
      (sum, p) => sum + p.generations,
      0
    );
    const totalPaidUsers = productBreakdown.reduce(
      (sum, p) => sum + p.paidUsers,
      0
    );

    return NextResponse.json({
      totalUsers,
      totalPaidUsers,
      totalGenerations,
      activeProducts: productBreakdown.length,
      productBreakdown,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[fleet-analytics] Query failed:", error);
    return NextResponse.json(
      { error: "Analytics query failed" },
      { status: 500 }
    );
  }
}
