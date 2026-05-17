/**
 * GET /api/accounting/reports/project/[id]
 *
 * Full project overview for a dimension: budget vs actual,
 * monthly breakdown, linked invoices and supplier invoices.
 *
 * [id] is the Dimension.id (must belong to a "project" axis).
 */

import { requireAuth }         from "@/lib/rbac/guards"
import { canOrThrow }          from "@/lib/rbac/policy"
import { getProjectOverview }  from "@/services/accounting/dimension-reports"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:read")
    const { id } = await params

    const overview = await getProjectOverview(ctx.organizationId, id)

    // Serialize BigInt fields for JSON
    return Response.json({
      ...overview,
      totalRevenue:    overview.totalRevenue.toString(),
      totalCost:       overview.totalCost.toString(),
      netResult:       overview.netResult.toString(),
      budgetRemaining: overview.budgetRemaining?.toString() ?? null,
      dimension: {
        ...overview.dimension,
        budget: overview.dimension.budget?.toString() ?? null,
      },
      byMonth: overview.byMonth.map((m) => ({
        ...m,
        revenue: m.revenue.toString(),
        cost:    m.cost.toString(),
      })),
    })
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if ((err as Error).message?.startsWith("Dimension not found"))
    return Response.json({ error: "Projekt hittades ej" }, { status: 404 })
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[reports/project]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
