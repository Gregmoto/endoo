/**
 * POST /api/invoices/[id]/credit-note
 *
 * Creates a credit note (kreditfaktura) from an existing invoice.
 * - Copies all line items with negated amounts
 * - Links back to the original via creditedInvoiceId
 * - Status starts as draft; type = credit_note
 * - The original invoice is not automatically voided
 *
 * Requires: invoices:create permission, same org as original.
 * Allowed on invoices with status: sent | viewed | partial | paid.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:create")

    const { id } = await params

    const original = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    })

    if (!original) {
      return Response.json({ error: "Fakturan hittades ej" }, { status: 404 })
    }

    const allowedStatuses = ["sent", "viewed", "partial", "paid"]
    if (!allowedStatuses.includes(original.status)) {
      return Response.json(
        { error: "Kreditnotor kan bara skapas för skickade eller betalda fakturor" },
        { status: 422 }
      )
    }

    if (original.type !== "invoice") {
      return Response.json(
        { error: "Kreditnotor kan bara skapas från vanliga fakturor" },
        { status: 422 }
      )
    }

    // Generate credit note number: KN-YYYY-NNNN
    const year  = new Date().getFullYear()
    const count = await prisma.invoice.count({
      where: { organizationId: ctx.organizationId, type: "credit_note" },
    })
    const creditNumber = `KN-${year}-${String(count + 1).padStart(4, "0")}`

    // Negate line item amounts — unit price becomes negative
    const lines = original.lineItems.map(l => {
      const unitPrice = -Number(l.unitPrice)
      const lineTotal = Math.round(Number(l.quantity) * unitPrice * (1 - Number(l.discountRate)))
      const taxAmount  = Math.round(lineTotal * Number(l.taxRate))
      return {
        description:    l.description,
        quantity:       l.quantity,
        unit:           l.unit,
        unitPrice:      BigInt(unitPrice),
        taxRate:        l.taxRate,
        discountRate:   l.discountRate,
        lineTotal:      BigInt(lineTotal),
        taxAmount:      BigInt(taxAmount),
        productId:      l.productId,
        sortOrder:      l.sortOrder,
        organizationId: ctx.organizationId,
      }
    })

    const subtotalAmount = lines.reduce((s, l) => s + Number(l.lineTotal), 0)
    const taxTotal       = lines.reduce((s, l) => s + Number(l.taxAmount), 0)
    const totalAmount    = subtotalAmount + taxTotal

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const creditNote = await prisma.invoice.create({
      data: {
        organizationId:    ctx.organizationId,
        invoiceNumber:     creditNumber,
        contactId:         original.contactId,
        creditedInvoiceId: original.id,
        type:              "credit_note",
        status:            "draft",
        currency:          original.currency,
        issueDate:         new Date(),
        dueDate,
        reference:         original.invoiceNumber,
        notes:             original.notes,
        footerText:        original.footerText,
        subtotalAmount:    BigInt(subtotalAmount),
        taxAmount:         BigInt(taxTotal),
        discountAmount:    BigInt(0),
        totalAmount:       BigInt(totalAmount),
        paidAmount:        BigInt(0),
        createdByUserId:   ctx.userId,
        lineItems:         { create: lines },
      },
      select: { id: true, invoiceNumber: true },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "Invoice",
        entityId:       creditNote.id,
        meta: {
          type:              "credit_note",
          creditedInvoiceId: original.id,
          invoiceNumber:     creditNote.invoiceNumber,
        },
      },
    }).catch(() => {})

    return Response.json({ id: creditNote.id, invoiceNumber: creditNote.invoiceNumber }, { status: 201 })
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") {
      return Response.json({ error: "Ej inloggad" }, { status: 401 })
    }
    if ((err as { name?: string }).name === "UnauthorizedError") {
      return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
    }
    console.error("[invoices/credit-note]", err)
    return Response.json({ error: "Internt fel" }, { status: 500 })
  }
}
