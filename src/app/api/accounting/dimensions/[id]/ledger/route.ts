/**
 * GET /api/accounting/dimensions/[id]/ledger
 * Paginated list of journal entries tagged to this dimension.
 */

import { requireAuth }         from "@/lib/rbac/guards"
import { canOrThrow }          from "@/lib/rbac/policy"
import { getDimensionLedger }  from "@/services/accounting/dimension-reports"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "accounting:read")
    const { id } = await params
    const url    = new URL(req.url)
    const limit  = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200)
    const cursor = url.searchParams.get("cursor") ?? undefined

    const result = await getDimensionLedger(ctx.organizationId, id, limit, cursor)
    return Response.json(result)
  } catch (err) { return handleError(err) }
}

function handleError(err: unknown): Response {
  const name = (err as { name?: string }).name
  if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[dimensions/ledger]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
