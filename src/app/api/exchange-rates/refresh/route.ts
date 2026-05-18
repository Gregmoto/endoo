import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { EXCHANGE_RATES_PERMISSIONS } from "@/lib/rbac/permissions"
import { fetchAllSupportedRates } from "@/lib/integrations/riksbank/client"

export async function POST(req: NextRequest) {
  try {
    const ctx     = await requireAuth()
    canOrThrow(ctx, EXCHANGE_RATES_PERMISSIONS.REFRESH)
    const body    = await req.json().catch(() => ({}))
    const dateStr = (body as Record<string, unknown>).date as string | undefined
    const date    = dateStr ? new Date(dateStr) : undefined

    const results = await fetchAllSupportedRates(date)
    return Response.json({ ok: true, fetched: results.size })
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
