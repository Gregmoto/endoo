/**
 * POST /api/quotes/[id]/convert-invoice
 * Convert an accepted quote into a new Invoice (draft).
 */

import { prisma }      from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow }  from "@/lib/rbac/policy"

type LineItem = {
  description:  string
  quantity:     number
  unit:         string
  unitPriceKr:  number
  taxRate:      number
  discountRate: number
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx    = await requireAuth()
    canOrThrow(ctx, "quotes:convert")
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!quote) return Response.json({ error: "Hittades inte" }, { status: 404 })
    if (!["accepted", "sent", "viewed"].includes(quote.status)) {
      return Response.json({ error: "Kan bara konvertera godkänd, skickad eller visad offert" }, { status: 422 })
    }
    if (quote.convertedToInvoiceId) {
      return Response.json({ error: "Offerten har redan konverterats till en faktura", invoiceId: quote.convertedToInvoiceId }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    const paymentTermsDays: number = typeof body.paymentTermsDays === "number" ? body.paymentTermsDays : 30

    const rawLines = (Array.isArray(quote.lineItems) ? quote.lineItems : []) as LineItem[]

    // Auto-generate invoice number
    const year  = new Date().getFullYear()
    const count = await prisma.invoice.count({
      where: { organizationId: ctx.organizationId, type: "invoice" },
    })
    const invoiceNumber = `${year}-${String(count + 1).padStart(4, "0")}`

    // Convert line items to öre
    const lines = rawLines.map((l, i) => {
      const unitPrice  = Math.round(l.unitPriceKr * 100)
      const lineTotal  = Math.round(l.quantity * unitPrice * (1 - (l.discountRate ?? 0)))
      const taxAmount  = Math.round(lineTotal * l.taxRate)
      return {
        description:    l.description,
        quantity:       l.quantity,
        unit:           l.unit ?? "st",
        unitPrice:      BigInt(unitPrice),
        taxRate:        l.taxRate,
        discountRate:   l.discountRate ?? 0,
        lineTotal:      BigInt(lineTotal),
        taxAmount:      BigInt(taxAmount),
        sortOrder:      i,
        organizationId: ctx.organizationId,
      }
    })

    const subtotalAmount = lines.reduce((s, l) => s + Number(l.lineTotal), 0)
    const taxAmount      = lines.reduce((s, l) => s + Number(l.taxAmount), 0)
    const totalAmount    = subtotalAmount + taxAmount

    const issueDate = new Date()
    const dueDate   = new Date(issueDate.getTime() + paymentTermsDays * 86_400_000)

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          organizationId:  ctx.organizationId,
          invoiceNumber,
          type:            "invoice",
          contactId:       quote.contactId ?? null,
          billingName:     quote.contactName,
          issueDate,
          dueDate,
          currency:        quote.currency,
          notes:           quote.notes   ?? null,
          footerText:      quote.terms   ?? null,
          subtotalAmount:  BigInt(subtotalAmount),
          taxAmount:       BigInt(taxAmount),
          discountAmount:  BigInt(0),
          totalAmount:     BigInt(totalAmount),
          paidAmount:      BigInt(0),
          createdByUserId: ctx.userId,
          lineItems: { create: lines },
        },
      })

      await tx.quote.update({
        where: { id },
        data: {
          convertedToInvoiceId: inv.id,
          convertedAt:          new Date(),
          status:               "invoiced",
        },
      })

      return inv
    })

    return Response.json({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }, { status: 201 })
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
  console.error("[quotes/convert-invoice]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
