/**
 * GET /api/accounting/accruals/preview?period=YYYY-MM
 *
 * Returns all planned accrual periods for the given month — dry run.
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCRUAL_PERMISSIONS } from "@/lib/rbac/permissions"

export async function GET(req: NextRequest) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, ACCRUAL_PERMISSIONS.READ)

    const period = req.nextUrl.searchParams.get("period")
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return Response.json({ error: "Ange period som YYYY-MM" }, { status: 422 })
    }

    const periods = await prisma.accrualPeriod.findMany({
      where:   { organizationId: ctx.organizationId, period },
      include: { accrual: { select: { accrualNumber: true, type: true, description: true, mainAccount: true, accrualAccount: true } } },
      orderBy: { accrual: { accrualNumber: "asc" } },
    })

    return Response.json(periods.map(p => ({
      id:             p.id,
      accrualId:      p.accrualId,
      accrualNumber:  p.accrual.accrualNumber,
      type:           p.accrual.type,
      description:    p.accrual.description,
      mainAccount:    p.accrual.mainAccount,
      accrualAccount: p.accrual.accrualAccount,
      period:         p.period,
      amount:         p.amount.toString(),
      status:         p.status,
    })))
  } catch (err) {
    const name = (err as { name?: string }).name
    if (name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
    if (name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    console.error("[accruals/preview]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
