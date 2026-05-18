/**
 * POST /api/accounting/fiscal-years/[id]/year-end/reopen
 * Reopens a closed fiscal year. Super-admin only.
 * Body: { reason: string }
 */

import { requireSuperAdmin } from "@/lib/rbac/guards"
import { reopenFiscalYear, FiscalYearNotClosedError } from "@/lib/accounting/year-end/reopen"
import { z } from "zod"

const BodySchema = z.object({
  reason: z.string().min(5).max(500),
})

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  if (err instanceof FiscalYearNotClosedError)
    return Response.json({ error: err.message }, { status: 409 })
  console.error("[year-end/reopen]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireSuperAdmin()

    const body = BodySchema.safeParse(await req.json())
    if (!body.success) {
      return Response.json({ error: "Ogiltigt anrop", details: body.error.flatten() }, { status: 400 })
    }

    const { id } = await params
    await reopenFiscalYear(ctx.organizationId, id, ctx.userId, body.data.reason)

    return Response.json({ ok: true })
  } catch (err) {
    return handleError(err)
  }
}
