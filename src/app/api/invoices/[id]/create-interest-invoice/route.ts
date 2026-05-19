/**
 * POST /api/invoices/[id]/create-interest-invoice
 * Creates a draft interest invoice for an overdue, unpaid invoice.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma } from "@prisma/client"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx        = await requireAuth()
    canOrThrow(ctx, "invoices:create_interest")
    const { id }     = await params

    const original = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!original) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })

    if (!["sent", "viewed", "partial", "overdue"].includes(original.status)) {
      return Response.json({ error: "Fakturan är inte förfallen eller obetald" }, { status: 400 })
    }

    const today   = new Date()
    const dueDate = original.dueDate ? new Date(original.dueDate) : today
    if (dueDate >= today) {
      return Response.json({ error: "Fakturan har inte förfallit ännu" }, { status: 400 })
    }

    // Calculate overdue days
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    // Get interest rate from org settings
    const org = await prisma.organization.findFirst({
      where:  { id: ctx.organizationId },
      select: { invoicingSettings: true, invoicePrefix: true, invoiceSequenceStart: true },
    })
    const settings     = (org?.invoicingSettings as Record<string, unknown>) ?? {}
    const interestRate = (settings.interestRate as number) ?? 8
    const prefix       = org?.invoicePrefix ?? "F"

    // Outstanding balance
    const balance = Number(original.totalAmount) - Number(original.paidAmount)
    if (balance <= 0) {
      return Response.json({ error: "Fakturan är redan fullt betald" }, { status: 400 })
    }

    // Interest amount = balance * rate% / 365 * days (in öre)
    const interestOre = Math.round((balance * interestRate / 100 / 365) * daysOverdue)

    // Get next invoice number
    const existingCount = await prisma.invoice.count({
      where: { organizationId: ctx.organizationId, type: { in: ["invoice", "cash"] as ("invoice" | "cash")[] } },
    })
    const seqNum     = (org?.invoiceSequenceStart ?? 1) + existingCount
    const invoiceNumber = `RF-${prefix}-${String(seqNum).padStart(4, "0")}`

    const description = `Dröjsmålsränta för faktura ${original.invoiceNumber}, ${daysOverdue} dagar à ${interestRate}%`

    const interestInvoice = await prisma.invoice.create({
      data: {
        organizationId:      ctx.organizationId,
        invoiceNumber,
        type:                "interest" as const,
        status:              "draft" as const,
        contactId:           original.contactId,
        issueDate:           today,
        dueDate:             today,
        currency:            original.currency,
        paymentTermsDays:    0,
        isInterestInvoice:   true,
        parentInvoiceId:     original.id,
        billingName:         original.billingName,
        billingEmail:        original.billingEmail,
        billingAddress:      original.billingAddress ?? Prisma.JsonNull,
        invoiceLang:         original.invoiceLang ?? "sv",
        subtotalAmount:      BigInt(interestOre),
        taxAmount:           BigInt(0),
        netAmount:           BigInt(interestOre),
        grossAmount:         BigInt(interestOre),
        totalAmount:         BigInt(interestOre),
        discountAmount:      BigInt(0),
        paidAmount:          BigInt(0),
        createdByUserId:     ctx.userId,
        lineItems: {
          create: [{
            organizationId: ctx.organizationId,
            description,
            quantity:     1,
            unit:         "st",
            unitPrice:    BigInt(interestOre),
            taxRate:      0,
            discountRate: 0,
            lineTotal:    BigInt(interestOre),
            taxAmount:    BigInt(0),
            accountNumber: "8313",
            sortOrder:    0,
          }],
        },
      },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "Invoice",
        entityId:       interestInvoice.id,
        meta:           { type: "interest", parentInvoiceId: original.id, daysOverdue, interestRate },
      },
    }).catch(() => {})

    return Response.json({ id: interestInvoice.id, invoiceNumber: interestInvoice.invoiceNumber }, { status: 201 })
  } catch (err) {
    return handleApiError(err, "invoices/create-interest")
  }
}
