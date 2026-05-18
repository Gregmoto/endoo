/**
 * GET    /api/accounting/accruals/[id]
 * PUT    /api/accounting/accruals/[id]   — update mutable fields (active only)
 * DELETE /api/accounting/accruals/[id]   — delete if no posted periods
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCRUAL_PERMISSIONS } from "@/lib/rbac/permissions"
import { z } from "zod"

const UpdateAccrualSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  notes:       z.string().max(2000).nullable().optional(),
})

function err(msg: string, status: number) { return Response.json({ error: msg }, { status }) }
function handleError(e: unknown) {
  if ((e as { name?: string }).name === "UnauthenticatedError") return err("Ej inloggad", 401)
  if ((e as { name?: string }).name === "UnauthorizedError")    return err("Otillräckliga rättigheter", 403)
  console.error("[accruals/id]", e)
  return err("Internt fel", 500)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCRUAL_PERMISSIONS.READ)
    const { id } = await params

    const accrual = await prisma.accrual.findFirst({
      where:   { id, organizationId: ctx.organizationId },
      include: { periods: { orderBy: { period: "asc" } } },
    })
    if (!accrual) return err("Periodiseringen hittades ej", 404)

    return Response.json({
      ...accrual,
      totalAmount: accrual.totalAmount.toString(),
      periods: accrual.periods.map(p => ({
        ...p,
        amount: p.amount.toString(),
      })),
    })
  } catch (e) { return handleError(e) }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCRUAL_PERMISSIONS.UPDATE)
    const { id } = await params

    const accrual = await prisma.accrual.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!accrual) return err("Periodiseringen hittades ej", 404)
    if (accrual.status !== "active") return err("Kan inte redigera en avslutad periodisering", 422)

    const body   = await req.json()
    const parsed = UpdateAccrualSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })

    await prisma.accrual.update({ where: { id }, data: parsed.data })
    return Response.json({ id })
  } catch (e) { return handleError(e) }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCRUAL_PERMISSIONS.DELETE)
    const { id } = await params

    const accrual = await prisma.accrual.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!accrual) return err("Periodiseringen hittades ej", 404)

    const postedCount = await prisma.accrualPeriod.count({
      where: { accrualId: id, status: "posted" },
    })
    if (postedCount > 0) {
      return err("Kan inte radera periodisering med bokförda perioder — återför istället", 422)
    }

    await prisma.accrualPeriod.deleteMany({ where: { accrualId: id } })
    await prisma.accrual.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (e) { return handleError(e) }
}
