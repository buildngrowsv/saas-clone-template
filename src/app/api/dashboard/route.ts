/**
 * GET /api/dashboard
 *
 * Returns the authenticated user's dashboard data: credit balance,
 * subscription plan, and recent activity.
 *
 * WHY A DEDICATED API ROUTE:
 * The dashboard page is a client component (needs useEffect for loading states
 * and real-time updates). Client components can't directly query the database,
 * so they fetch from this API endpoint on mount.
 *
 * RESPONSE SHAPE:
 * {
 *   credits: number,              // Current credit balance
 *   plan: "free" | "basic" | "standard" | "pro",  // Active plan
 * }
 *
 * CUSTOMIZATION:
 * When you add product-specific data to your dashboard (e.g., recent generations,
 * usage stats, team members), extend this endpoint's response.
 *
 * AUTHENTICATION:
 * Requires a valid Better Auth session cookie. Returns 401 if not logged in.
 * The middleware already redirects unauthenticated users to /login for
 * /dashboard routes, but we double-check here for API safety.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { userProfiles } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export async function GET() {
  /**
   * STEP 1: Verify the user is authenticated.
   * Same pattern used across all protected API routes in this template.
   */
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authenticatedUserId = session.user.id;

  try {
    /**
     * STEP 2: Fetch user profile (credits + plan).
     * If no profile exists yet (brand-new user who hasn't triggered any
     * credit action), we return defaults: 0 credits, "free" plan.
     */
    const [userProfile] = await db
      .select({
        credits: userProfiles.credits,
        plan: userProfiles.plan,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, authenticatedUserId))
      .limit(1);

    const currentCredits = userProfile?.credits ?? 0;
    const currentPlan = userProfile?.plan ?? "free";

    return NextResponse.json({
      credits: currentCredits,
      plan: currentPlan,
    });
  } catch (error) {
    /**
     * Database errors should not expose internals to the client.
     * Log the full error server-side for debugging, return generic message.
     */
    console.error("[/api/dashboard] Database query failed:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
