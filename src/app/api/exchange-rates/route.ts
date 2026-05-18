import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"
import { EXCHANGE_RATES_PERMISSIONS } from "@/lib/rbac/permissions"
import { getExchangeRate } from "@/lib/integrations/riksbank/client"

export async function GET(req: NextRequest) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, EXCHANGE_RATES_PERMISSIONS.READ)
    const url    = new URL(req.url)
    const from   = url.searchParams.get("from") ?? "SEK"
    const to     = url.searchParams.get("to")   ?? "SEK"
    const dateStr = url.searchParams.get("date")
    const date   = dateStr ? new Date(dateStr) : undefined

    const result = await getExchangeRate(from, to, date)
    if (!result) return Response.json({ error: "Kurs ej tillgänglig" }, { status: 404 })
    return Response.json(result)
  } catch (e) { return Response.json({ error: String(e) }, { status: 500 }) }
}
