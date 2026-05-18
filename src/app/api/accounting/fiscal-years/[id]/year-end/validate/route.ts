/**
 * POST /api/accounting/fiscal-years/[id]/year-end/validate
 * Runs pre-close checks without performing any changes.
 */

import { requireAuth, requirePermission } from "@/lib/rbac/guards"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import { validateYearEnd } from "@/lib/accounting/year-end/close"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[year-end/validate]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    requirePermission(ctx, ACCOUNTING_PERMISSIONS.YEAR_END_READ)

    const { id } = await params
    const result = await validateYearEnd(ctx.organizationId, id)

    return Response.json(result)
  } catch (err) {
    return handleError(err)
  }
}
