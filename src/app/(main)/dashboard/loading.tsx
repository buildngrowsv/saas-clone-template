/**
 * Dashboard Loading Skeleton — shown by Next.js while the dashboard
 * page component is loading (code-split chunk, session check, etc.).
 *
 * WHY: Without this file, navigating to /dashboard shows nothing until
 * the page component's JavaScript is loaded and executed. This skeleton
 * gives instant visual feedback that matches the dashboard layout, so
 * the user sees a plausible screen shape immediately.
 *
 * This is a Next.js App Router convention — any loading.tsx co-located
 * with a page.tsx becomes the Suspense fallback for that route.
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-8">
      {/* Title skeleton */}
      <div className="h-8 w-40 bg-muted animate-pulse rounded mb-6" />

      {/* Welcome message skeleton */}
      <div className="h-5 w-64 bg-muted animate-pulse rounded mb-6" />

      {/* Stats cards skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="h-4 w-28 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-9 w-16 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
          </CardContent>
        </Card>
      </div>

      {/* Quick actions skeleton */}
      <div className="flex gap-3 mb-8">
        <div className="h-10 w-28 bg-muted animate-pulse rounded-md" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
      </div>

      {/* Content card skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="h-5 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-72 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
