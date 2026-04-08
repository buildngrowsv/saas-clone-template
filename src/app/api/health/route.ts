/**
 * Health check endpoint — returns a minimal JSON payload for monitoring.
 *
 * WHY: Fleet HTTP health checks (ops-logs/FLEET-HTTP-HEALTH-CHECK-*) showed
 * only 3/14 deployed sites had a /api/health endpoint. Adding this to the
 * template ensures all clones get monitoring coverage automatically.
 *
 * USAGE:
 *   curl -s https://your-site.com/api/health
 *   → {"status":"ok","timestamp":"2026-04-08T20:50:00.000Z"}
 *
 * For uptime monitoring services (UptimeRobot, Vercel Checks, Cloudflare
 * Health Checks), point to /api/health with expected status 200.
 *
 * Builder 1 (iron-viper-6183), T19 pane1775, 2026-04-08.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
