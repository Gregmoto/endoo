/**
 * GET    /api/invoices/[id]  — invoice detail
 * PATCH  /api/invoices/[id]  — update draft (replaces line items)
 * DELETE /api/invoices/[id]  — soft delete (draft only)
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
    canOrThrow(ctx, "invoices:read")
    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        contact:   true,
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments:  { orderBy: { paymentDate: "desc" } },
        recurringSchedule: { select: { id: true, contractNumber: true, name: true } },
      },
    })

    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })
    return Response.json(invoice)
  } catch (err) {
    return handleError(err)
  }
}

const LineItemSchema = z.object({
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
  contactId:     z.string().uuid().optional().nullable(),
  issueDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency:      z.string().max(3).optional(),
  reference:     z.string().max(255).optional().nullable(),
  poNumber:      z.string().max(100).optional().nullable(),
  notes:         z.string().max(5000).optional().nullable(),
  footerText:    z.string().max(5000).optional().nullable(),
  lineItems:     z.array(LineItemSchema).min(1).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:update")
    const { id } = await params

    const existing = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })
    if (existing.status !== "draft") {
      return Response.json({ error: "Kan bara redigera utkast" }, { status: 422 })
    }

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter" }, { status: 400 })
    }

    const { lineItems, issueDate, dueDate, ...rest } = parsed.data

    // If line items provided, replace all
    let totalsUpdate: Record<string, unknown> = {}
    if (lineItems) {
      const lines = lineItems.map((l, i) => {
        const unitPrice  = Math.round(l.unitPriceKr * 100)
        const lineTotal  = Math.round(l.quantity * unitPrice * (1 - l.discountRate))
        const taxAmount  = Math.round(lineTotal * l.taxRate)
        return {
          description:  l.description,
          quantity:     l.quantity,
          unit:         l.unit,
          unitPrice:    BigInt(unitPrice),
          taxRate:      l.taxRate,
          discountRate: l.discountRate,
          lineTotal:    BigInt(lineTotal),
          taxAmount:    BigInt(taxAmount),
          productId:    l.productId ?? null,
          sortOrder:    l.sortOrder ?? i,
          organizationId: ctx.organizationId,
          invoiceId:    id,
        }
      })
      const subtotalAmount = lines.reduce((s, l) => s + Number(l.lineTotal), 0)
      const taxAmount2     = lines.reduce((s, l) => s + Number(l.taxAmount), 0)
      const totalAmount    = subtotalAmount + taxAmount2

      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } })
      await prisma.invoiceLineItem.createMany({ data: lines })

      totalsUpdate = {
        subtotalAmount: BigInt(subtotalAmount),
        taxAmount:      BigInt(taxAmount2),
        totalAmount:    BigInt(totalAmount),
      }
    }

    const updated = await prisma.invoice.update({
      where: { id, organizationId: ctx.organizationId },
      data: {
        ...rest,
        ...(issueDate ? { issueDate: new Date(issueDate) } : {}),
        ...(dueDate   ? { dueDate:   new Date(dueDate) }   : {}),
        ...totalsUpdate,
      },
      include: {
        contact:   { select: { id: true, name: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments:  { orderBy: { paymentDate: "desc" } },
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Invoice",
        entityId:       id,
        before:         { status: existing.status, totalAmount: existing.totalAmount.toString() },
        after:          { status: updated.status,  totalAmount: updated.totalAmount.toString() },
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
    canOrThrow(ctx, "invoices:delete")
    const { id } = await params

    const existing = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })
    if (existing.status !== "draft") {
      return Response.json({ error: "Kan bara ta bort utkast" }, { status: 422 })
    }

    await prisma.invoice.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { deletedAt: new Date() },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "delete",
        entityType:     "Invoice",
        entityId:       id,
        before:         { invoiceNumber: existing.invoiceNumber, status: existing.status },
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
  console.error("[invoices/[id]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
