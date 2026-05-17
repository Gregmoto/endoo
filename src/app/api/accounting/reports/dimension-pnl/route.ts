/**
 * GET /api/accounting/reports/dimension-pnl
 *
 * P&L aggregated per dimension value within an axis.
 *
 * Query params:
 *   axisId   required — which axis to report on
 *   from     required — YYYY-MM-DD
 *   to       required — YYYY-MM-DD
 */

import { requireAuth }      from "@/lib/rbac/guards"
import { canOrThrow }       from "@/lib/rbac/policy"
import { getPnlByDimension } from "@/services/accounting/dimension-reports"

export async function GET(req: Request) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:read")

    const url    = new URL(req.url)
    const axisId = url.searchParams.get("axisId")
    const from   = url.searchParams.get("from")
    const to     = url.searchParams.get("to")

    if (!axisId) return Response.json({ error: "axisId krävs" }, { status: 400 })
    if (!from)   return Response.json({ error: "from krävs (YYYY-MM-DD)" }, { status: 400 })
    if (!to)     return Response.json({ error: "to krävs (YYYY-MM-DD)" }, { status: 400 })

    const rows = await getPnlByDimension(ctx.organizationId, axisId, new Date(from), new Date(to))
    return Response.json({ rows, from, to, axisId })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[reports/dimension-pnl]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
