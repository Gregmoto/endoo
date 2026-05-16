/**
 * POST /api/contracts/[id]/generate
 *
 * Manually generates an invoice from a recurring contract.
 * Copies current line values as a snapshot (not live references).
 * Advances nextIssueDate after generation.
 * Prevents duplicate generation on same nextIssueDate.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { nextDate, calcLineTotal, calcTaxAmount } from "@/lib/contracts/utils"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:create")
    const { id } = await params

    const contract = await prisma.recurringSchedule.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    })
    if (!contract) return Response.json({ error: "Avtal hittades ej" }, { status: 404 })
    if (contract.status !== "active") {
      return Response.json({ error: "Avtalet är inte aktivt" }, { status: 422 })
    }
    if (contract.lines.length === 0) {
      return Response.json({ error: "Avtalet saknar rader" }, { status: 422 })
    }

    // Guard: check if an invoice has already been generated for this nextIssueDate
    const issueDate = contract.nextIssueDate
    const existing = await prisma.invoice.findFirst({
      where: {
        recurringScheduleId: id,
        organizationId: ctx.organizationId,
        issueDate,
        deletedAt: null,
      },
    })
    if (existing) {
      return Response.json({
        error: "En faktura har redan genererats för detta period",
        invoiceId: existing.id,
      }, { status: 409 })
    }

    // Build invoice number
    const year  = new Date().getFullYear()
    const count = await prisma.invoice.count({ where: { organizationId: ctx.organizationId } })
    const invoiceNumber = `${year}-${String(count + 1).padStart(4, "0")}`

    // Calculate due date from payment terms
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + (contract.paymentTermsDays ?? 30))

    // Snapshot line items
    const lines = contract.lines.map(l => {
      const unitPrice  = Number(l.unitPrice)
      const quantity   = Number(l.quantity)
      const discount   = Number(l.discountRate)
      const taxRate    = Number(l.taxRate)
      const lineTotal  = calcLineTotal(quantity, unitPrice, discount)
      const taxAmount  = calcTaxAmount(lineTotal, taxRate)
      return {
        description:    l.description,
        quantity:       l.quantity,
        unit:           l.unit,
        unitPrice:      l.unitPrice,
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
    const taxAmount      = lines.reduce((s, l) => s + Number(l.taxAmount), 0)
    const totalAmount    = subtotalAmount + taxAmount

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          organizationId:       ctx.organizationId,
          invoiceNumber,
          contactId:            contract.contactId,
          recurringScheduleId:  id,
          issueDate,
          dueDate,
          currency:             contract.currency,
          reference:            contract.reference,
          notes:                contract.notes,
          status:               "draft",
          subtotalAmount:       BigInt(subtotalAmount),
          taxAmount:            BigInt(taxAmount),
          discountAmount:       BigInt(0),
          totalAmount:          BigInt(totalAmount),
          paidAmount:           BigInt(0),
          createdByUserId:      ctx.userId,
          lineItems:            { create: lines },
        },
        include: {
          lineItems: { orderBy: { sortOrder: "asc" } },
          contact:   { select: { id: true, name: true } },
        },
      }),
      prisma.recurringSchedule.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          lastIssuedAt:  new Date(),
          nextIssueDate: nextDate(issueDate, contract.frequency),
          ...(contract.endDate && nextDate(issueDate, contract.frequency) > contract.endDate
            ? { status: "ended" }
            : {}),
        },
      }),
    ])

    return Response.json(invoice, { status: 201 })
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
  console.error("[contracts/generate]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
