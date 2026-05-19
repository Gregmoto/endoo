/**
 * POST /api/invoices/bulk
 * Body: { action: 'send'|'delete'|'create_interest_invoices', ids: string[] }
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const BulkSchema = z.object({
  action: z.enum(["send", "delete", "create_interest_invoices"]),
  ids:    z.array(z.string().uuid()).min(1).max(250),
})

export async function POST(req: Request) {
  try {
    const ctx  = await requireAuth()
    canOrThrow(ctx, "invoices:bulk")

    const body   = await req.json()
    const parsed = BulkSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Ogiltiga parametrar" }, { status: 400 })

    const { action, ids } = parsed.data

    // Ensure all invoices belong to this org
    const invoices = await prisma.invoice.findMany({
      where: { id: { in: ids }, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (invoices.length !== ids.length) {
      return Response.json({ error: "En eller flera fakturor hittades ej" }, { status: 404 })
    }

    if (action === "delete") {
      canOrThrow(ctx, "invoices:delete")
      const drafts = invoices.filter(i => i.status === "draft")
      if (drafts.length !== invoices.length) {
        return Response.json({ error: "Bara utkast kan tas bort" }, { status: 400 })
      }
      await prisma.invoice.updateMany({
        where: { id: { in: drafts.map(i => i.id) } },
        data:  { deletedAt: new Date() },
      })
      return Response.json({ ok: true, affected: drafts.length })
    }

    if (action === "send") {
      canOrThrow(ctx, "invoices:send")
      const sendable = invoices.filter(i => i.status === "draft")
      await prisma.invoice.updateMany({
        where: { id: { in: sendable.map(i => i.id) } },
        data:  { status: "sent", sentAt: new Date() },
      })
      return Response.json({ ok: true, affected: sendable.length })
    }

    if (action === "create_interest_invoices") {
      canOrThrow(ctx, "invoices:create_interest")
      const today = new Date()
      const overdue = invoices.filter(i =>
        ["sent","viewed","partial","overdue"].includes(i.status) &&
        i.dueDate && new Date(i.dueDate) < today
      )

      const org = await prisma.organization.findFirst({
        where:  { id: ctx.organizationId },
        select: { invoicingSettings: true, invoicePrefix: true, invoiceSequenceStart: true },
      })
      const settings     = (org?.invoicingSettings as Record<string, unknown>) ?? {}
      const interestRate = (settings.interestRate as number) ?? 8
      const prefix       = org?.invoicePrefix ?? "F"

      let created = 0
      for (const inv of overdue) {
        const daysOverdue = Math.floor((today.getTime() - new Date(inv.dueDate!).getTime()) / (1000 * 60 * 60 * 24))
        const balance     = Number(inv.totalAmount) - Number(inv.paidAmount)
        if (balance <= 0) continue
        const interestOre = Math.round((balance * interestRate / 100 / 365) * daysOverdue)

        const count        = await prisma.invoice.count({ where: { organizationId: ctx.organizationId, type: { in: ["invoice","cash"] as ("invoice"|"cash")[] } } })
        const seqNum       = (org?.invoiceSequenceStart ?? 1) + count
        const invoiceNumber = `RF-${prefix}-${String(seqNum).padStart(4, "0")}`

        await prisma.invoice.create({
          data: {
            organizationId:    ctx.organizationId,
            invoiceNumber,
            type:              "interest" as const,
            status:            "draft" as const,
            contactId:         inv.contactId,
            issueDate:         today,
            dueDate:           today,
            currency:          inv.currency,
            paymentTermsDays:  0,
            isInterestInvoice: true,
            parentInvoiceId:   inv.id,
            billingName:       inv.billingName,
            billingEmail:      inv.billingEmail,
            billingAddress:    inv.billingAddress ?? Prisma.JsonNull,
            invoiceLang:       inv.invoiceLang ?? "sv",
            subtotalAmount:    BigInt(interestOre),
            taxAmount:         BigInt(0),
            netAmount:         BigInt(interestOre),
            grossAmount:       BigInt(interestOre),
            totalAmount:       BigInt(interestOre),
            discountAmount:    BigInt(0),
            paidAmount:        BigInt(0),
            createdByUserId:   ctx.userId,
            lineItems: {
              create: [{
                organizationId: ctx.organizationId,
                description:   `Dröjsmålsränta för faktura ${inv.invoiceNumber}, ${daysOverdue} dagar à ${interestRate}%`,
                quantity:      1, unit: "st",
                unitPrice:     BigInt(interestOre),
                taxRate:       0, discountRate: 0,
                lineTotal:     BigInt(interestOre),
                taxAmount:     BigInt(0),
                accountNumber: "8313",
                sortOrder:     0,
              }],
            },
          },
        })
        created++
      }

      return Response.json({ ok: true, affected: created })
    }

    return Response.json({ error: "Okänd åtgärd" }, { status: 400 })
  } catch (err) {
    return handleApiError(err, "invoices/bulk")
  }
}
