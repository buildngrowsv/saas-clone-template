/**
 * loading.tsx — Root loading state shown during route transitions
 *
 * WHY: Without this file, Next.js shows a blank screen during navigation
 * between pages. This provides instant visual feedback — a spinning loader
 * on a dark background matching the fleet's design language.
 *
 * NEXT.JS CONVENTION: When placed at the app root, this component wraps
 * page.tsx in a React Suspense boundary. It shows automatically during
 * async data fetching or lazy component loading.
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
      <p className="text-zinc-400 text-sm">Loading…</p>
    </div>
  );
}
