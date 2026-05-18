/**
 * GET /api/cron/exchange-rates
 *
 * Fetches all supported currency rates from Riksbanken SWEA API
 * and caches them to the exchange_rates table.
 *
 * Designed to run daily at 06:30 CET (after Riksbanken publishes ~06:00).
 * Vercel cron: "30 5 * * *" (UTC = 06:30 CET in winter, adjust for DST)
 *
 * Security: Authorization: Bearer {CRON_SECRET}
 */

import { fetchAllSupportedRates } from "@/lib/integrations/riksbank/client"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const results = await fetchAllSupportedRates()
    return Response.json({ ok: true, fetched: results.size, ts: new Date().toISOString() })
  } catch (e) {
    console.error("[cron/exchange-rates]", e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
