/**
 * POST /api/accounting/periods/[id]/unlock
 * Unlocks a locked period. Mandatory reason required.
 * Closed periods require isPlatformAdmin.
 */

import { prisma }        from "@/lib/prisma"
import { requireAuth }   from "@/lib/rbac/guards"
import { canOrThrow }    from "@/lib/rbac/policy"
import { unlockPeriod }  from "@/services/accounting/periods"
import { PeriodNotFoundError, PeriodClosedError } from "@/lib/accounting/posting/errors"
import { z } from "zod"

const Schema = z.object({
  reason: z.string().min(10, "Ange en anledning till upplåsning (minst 10 tecken)").max(500),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "accounting:manage_periods")
    const { id } = await params

    const body   = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ange en anledning", details: parsed.error.flatten() }, { status: 400 })
    }

    // Verify period belongs to org
    const period = await prisma.accountingPeriod.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!period) return Response.json({ error: "Period hittades ej" }, { status: 404 })

    const isPlatformAdmin = ctx.role === "super_admin"

    // Closed periods require platform admin
    if (period.status === "closed" && !isPlatformAdmin) {
      return Response.json(
        { error: "Stängd period kan bara återöppnas av plattformsadmin" },
        { status: 403 },
      )
    }

    const updated = await unlockPeriod(
      ctx.organizationId,
      id,
      ctx.userId,
      parsed.data.reason,
      isPlatformAdmin,
    )
    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if (err instanceof PeriodNotFoundError)
    return Response.json({ error: "Period hittades ej" }, { status: 404 })
  if (err instanceof PeriodClosedError)
    return Response.json({ error: "Stängd period kan bara återöppnas av plattformsadmin" }, { status: 403 })
  if ((err as { name?: string }).name === "UnauthenticatedError")
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[accounting/periods/unlock]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
