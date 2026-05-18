/**
 * POST /api/accounting/fiscal-years/[id]/year-end/close
 * Executes the full year-end closing sequence.
 * Requires accounting:year_end:close permission.
 */

import { requireAuth, requirePermission } from "@/lib/rbac/guards"
import { ACCOUNTING_PERMISSIONS } from "@/lib/rbac/permissions"
import {
  closeFiscalYear,
  YearEndValidationError,
  YearEndAlreadyClosedError,
  FiscalYearNotFoundError,
} from "@/lib/accounting/year-end/close"

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  if (err instanceof FiscalYearNotFoundError)
    return Response.json({ error: err.message }, { status: 404 })
  if (err instanceof YearEndAlreadyClosedError)
    return Response.json({ error: err.message }, { status: 409 })
  if (err instanceof YearEndValidationError)
    return Response.json({ error: err.message, errors: err.errors }, { status: 422 })
  console.error("[year-end/close]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    requirePermission(ctx, ACCOUNTING_PERMISSIONS.YEAR_END_CLOSE)

    const { id } = await params
    const result = await closeFiscalYear(ctx.organizationId, id, ctx.userId)

    return Response.json(result, { status: 200 })
  } catch (err) {
    return handleError(err)
  }
}
