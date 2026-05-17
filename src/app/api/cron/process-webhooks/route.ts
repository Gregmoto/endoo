/**
 * GET /api/cron/process-webhooks
 *
 * Claims and processes pending WebhookEvent rows (up to 50 per run).
 * Uses SELECT FOR UPDATE SKIP LOCKED so multiple instances can run safely.
 *
 * Vercel Cron: "* * * * *"  (every minute)
 * Authorization: Bearer {CRON_SECRET}
 */

import { processWebhooks } from "@/services/integrations/webhook-processor"

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
    const processed = await processWebhooks(50)
    return Response.json({ processed })
  } catch (err) {
    console.error("[cron/process-webhooks]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
