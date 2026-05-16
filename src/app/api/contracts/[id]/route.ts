/**
 * GET    /api/contracts/[id]  — contract detail + lines
 * PATCH  /api/contracts/[id]  — update contract (can replace lines)
 * DELETE /api/contracts/[id]  — soft delete (draft only)
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { z } from "zod"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contracts:read")
    const { id } = await params

    const contract = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        contact: true,
        lines:   { orderBy: { sortOrder: "asc" } },
        invoices: {
          where:   { deletedAt: null },
          orderBy: { issueDate: "desc" },
          take:    20,
          select: {
            id: true, invoiceNumber: true, status: true,
            totalAmount: true, currency: true, issueDate: true,
          },
        },
      },
    })

    if (!contract) return Response.json({ error: "Avtal hittades ej" }, { status: 404 })
    return Response.json(contract)
  } catch (err) {
    return handleError(err)
  }
}

const LineSchema = z.object({
  description:  z.string().min(1).max(1000),
  quantity:     z.number().positive(),
  unit:         z.string().max(30).default("st"),
  unitPriceKr:  z.number().min(0),
  taxRate:      z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1).default(0),
  productId:    z.string().uuid().optional().nullable(),
  sortOrder:    z.number().int().default(0),
})

const PatchSchema = z.object({
  name:             z.string().min(1).max(255).optional(),
  contactId:        z.string().uuid().optional().nullable(),
  status:           z.enum(["draft", "active", "paused", "ended", "cancelled"]).optional(),
  frequency:        z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
  startDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  nextIssueDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency:         z.string().max(3).optional(),
  paymentTermsDays: z.number().int().min(0).optional(),
  autoSend:         z.boolean().optional(),
  reference:        z.string().max(255).optional().nullable(),
  notes:            z.string().max(5000).optional().nullable(),
  internalNotes:    z.string().max(5000).optional().nullable(),
  lines:            z.array(LineSchema).min(1).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contracts:update")
    const { id } = await params

    const existing = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Avtal hittades ej" }, { status: 404 })

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const { lines, startDate, endDate, nextIssueDate, ...rest } = parsed.data

    if (lines) {
      await prisma.recurringScheduleLine.deleteMany({ where: { scheduleId: id } })
      await prisma.recurringScheduleLine.createMany({
        data: lines.map((l, i) => ({
          scheduleId:     id,
          organizationId: ctx.organizationId,
          description:    l.description,
          quantity:       l.quantity,
          unit:           l.unit,
          unitPrice:      BigInt(Math.round(l.unitPriceKr * 100)),
          taxRate:        l.taxRate,
          discountRate:   l.discountRate,
          productId:      l.productId ?? null,
          sortOrder:      l.sortOrder ?? i,
        })),
      })
    }

    const updated = await prisma.recurringSchedule.update({
      where: { id, organizationId: ctx.organizationId },
      data: {
        ...rest,
        ...(startDate     ? { startDate:     new Date(startDate) }     : {}),
        ...(endDate       ? { endDate:       new Date(endDate) }       : endDate === null ? { endDate: null } : {}),
        ...(nextIssueDate ? { nextIssueDate: new Date(nextIssueDate) } : {}),
      },
      include: {
        contact: { select: { id: true, name: true } },
        lines:   { orderBy: { sortOrder: "asc" } },
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "RecurringSchedule",
        entityId:       id,
        before:         { name: existing.name, status: existing.status },
        after:          { name: updated.name,  status: updated.status  },
      },
    }).catch(() => {})

    return Response.json(updated)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contracts:delete")
    const { id } = await params

    const existing = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Avtal hittades ej" }, { status: 404 })
    if (existing.status !== "draft") {
      return Response.json({ error: "Kan bara ta bort avtal med status Utkast — avsluta aktiva avtal istället" }, { status: 422 })
    }

    await prisma.recurringSchedule.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { deletedAt: new Date() },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "delete",
        entityType:     "RecurringSchedule",
        entityId:       id,
        before:         { name: existing.name, contractNumber: existing.contractNumber },
      },
    }).catch(() => {})

    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[contracts/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
