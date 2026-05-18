/**
 * GET  /api/accounting/accruals   — list accruals for the org
 * POST /api/accounting/accruals   — create a new accrual (seeds planned periods)
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { ACCRUAL_PERMISSIONS } from "@/lib/rbac/permissions"
import { calculateAccrualPeriods, monthsBetween } from "@/lib/accounting/accruals/periods"
import { z } from "zod"

const CreateAccrualSchema = z.object({
  accrualNumber:  z.string().min(1).max(50),
  type:           z.enum(["prepaid_expense", "accrued_expense", "prepaid_revenue", "accrued_revenue"]),
  description:    z.string().min(1).max(500),
  totalAmount:    z.number().int().positive(),  // öre
  startDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mainAccount:    z.string().min(1).max(10),
  accrualAccount: z.string().min(1).max(10),
  sourceType:     z.enum(["supplier_invoice", "invoice", "manual"]).optional().nullable(),
  sourceId:       z.string().uuid().optional().nullable(),
  notes:          z.string().max(2000).optional().nullable(),
})

function errRes(msg: string, status: number) {
  return Response.json({ error: msg }, { status })
}

function handleError(err: unknown) {
  if ((err as { name?: string }).name === "UnauthenticatedError") return errRes("Ej inloggad", 401)
  if ((err as { name?: string }).name === "UnauthorizedError")    return errRes("Otillräckliga rättigheter", 403)
  console.error("[accruals]", err)
  return errRes("Internt fel", 500)
}

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCRUAL_PERMISSIONS.READ)

    const accruals = await prisma.accrual.findMany({
      where:   { organizationId: ctx.organizationId },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: {
        periods: {
          select: { status: true, amount: true },
        },
      },
    })

    return Response.json(accruals.map(a => {
      const postedAmount = a.periods
        .filter(p => p.status === "posted")
        .reduce((s, p) => s + p.amount, 0n)
      return {
        id:             a.id,
        accrualNumber:  a.accrualNumber,
        type:           a.type,
        description:    a.description,
        totalAmount:    a.totalAmount.toString(),
        postedAmount:   postedAmount.toString(),
        startDate:      a.startDate,
        endDate:        a.endDate,
        periodCount:    a.periodCount,
        mainAccount:    a.mainAccount,
        accrualAccount: a.accrualAccount,
        status:         a.status,
      }
    }))
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, ACCRUAL_PERMISSIONS.CREATE)

    const body   = await req.json()
    const parsed = CreateAccrualSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 422 })
    const d = parsed.data

    const startDate = new Date(d.startDate)
    const endDate   = new Date(d.endDate)
    if (endDate < startDate) return errRes("Slutdatum måste vara efter startdatum", 422)

    const existing = await prisma.accrual.findFirst({
      where: { organizationId: ctx.organizationId, accrualNumber: d.accrualNumber },
    })
    if (existing) return errRes("Periodiseringsnumret används redan", 409)

    const periodCount = monthsBetween(startDate, endDate)
    const accrual = await prisma.accrual.create({
      data: {
        organizationId:  ctx.organizationId,
        accrualNumber:   d.accrualNumber,
        type:            d.type,
        description:     d.description,
        totalAmount:     BigInt(d.totalAmount),
        startDate,
        endDate,
        periodCount,
        mainAccount:     d.mainAccount,
        accrualAccount:  d.accrualAccount,
        sourceType:      d.sourceType ?? null,
        sourceId:        d.sourceId   ?? null,
        notes:           d.notes      ?? null,
        createdByUserId: ctx.userId,
      },
    })

    const lines = calculateAccrualPeriods(BigInt(d.totalAmount), startDate, endDate)
    if (lines.length > 0) {
      await prisma.accrualPeriod.createMany({
        data: lines.map(l => ({
          organizationId: ctx.organizationId,
          accrualId:      accrual.id,
          period:         l.period,
          amount:         l.amount,
          status:         "planned" as const,
        })),
        skipDuplicates: true,
      })
    }

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "accrual_create",
        entityType:     "accrual",
        entityId:       accrual.id,
        meta:           { accrualNumber: accrual.accrualNumber, type: accrual.type },
      },
    })

    return Response.json({ id: accrual.id }, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
