/**
 * POST /api/accounting/periods/[id]/lock
 * Locks an open accounting period, capturing an immutable snapshot.
 */

import { prisma }        from "@/lib/prisma"
import { requireAuth }   from "@/lib/rbac/guards"
import { canOrThrow }    from "@/lib/rbac/policy"
import { lockPeriod }    from "@/services/accounting/periods"
import { PeriodNotFoundError, PeriodClosedError } from "@/lib/accounting/posting/errors"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "accounting:manage_periods")
    const { id } = await params

    // Verify period belongs to org
    const period = await prisma.accountingPeriod.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!period) return Response.json({ error: "Period hittades ej" }, { status: 404 })

    const updated = await lockPeriod(ctx.organizationId, id, ctx.userId)
    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if (err instanceof PeriodNotFoundError)
    return Response.json({ error: "Period hittades ej" }, { status: 404 })
  if (err instanceof PeriodClosedError)
    return Response.json({ error: "Perioden är stängd — kontakta plattformsadmin" }, { status: 422 })
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[accounting/periods/lock]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
