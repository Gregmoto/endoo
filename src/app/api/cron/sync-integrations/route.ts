/**
 * GET /api/cron/sync-integrations
 *
 * Runs pull-sync for all connections whose syncIntervalMin is due.
 *
 * Vercel Cron: every 5 minutes  ("*\/5 * * * *")
 * Authorization: Bearer {CRON_SECRET}
 */

import { runDueConnections } from "@/services/integrations/sync-runner"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const synced = await runDueConnections()
    return Response.json({ synced })
  } catch (err) {
    console.error("[cron/sync-integrations]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
