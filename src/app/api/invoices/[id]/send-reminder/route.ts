import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { sendReminderEmail } from "@/lib/email"
import { resolveBranding } from "@/lib/branding/resolver"
import { z } from "zod"
import type { InvoiceStatus } from "@prisma/client"

const BodySchema = z.object({
  addReminderFee:    z.boolean().default(false),
  reminderFeeAmount: z.number().int().positive().optional(),
  method:            z.enum(["email", "print", "both"]).default("email"),
  customMessage:     z.string().max(2000).optional().nullable(),
})

const UNPAID_STATUSES: InvoiceStatus[] = ["sent", "viewed", "partial", "overdue"]

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "reminders:send")
    const { id } = await params

    const raw    = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { addReminderFee, reminderFeeAmount, method, customMessage } = parsed.data
    const feeAmount = reminderFeeAmount ?? 6000

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      include: {
        contact:      { select: { name: true, email: true } },
        organization: { select: { name: true } },
      },
    })

    if (!invoice) {
      return Response.json({ error: "Faktura hittades ej" }, { status: 404 })
    }

    const isUnpaid = UNPAID_STATUSES.includes(invoice.status as InvoiceStatus)
    if (!isUnpaid) {
      return Response.json({ error: "Fakturan är inte obetald" }, { status: 422 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isOverdue = invoice.dueDate < today
    if (!isOverdue) {
      return Response.json({ error: "Fakturan är inte förfallen" }, { status: 422 })
    }

    const updateData: Parameters<typeof prisma.invoice.update>[0]["data"] = {
      reminderCount:  invoice.reminderCount + 1,
      lastReminderAt: new Date(),
    }

    if (addReminderFee && !invoice.reminderFeeApplied) {
      const feeBigInt = BigInt(feeAmount)
      updateData.reminderFeeApplied = true
      updateData.totalAmount = invoice.totalAmount + feeBigInt

      await prisma.invoiceLineItem.create({
        data: {
          invoiceId:      id,
          organizationId: ctx.organizationId,
          description:    "Påminnelseavgift",
          quantity:       1,
          unit:           "st",
          unitPrice:      feeBigInt,
          taxRate:        0,
          discountRate:   0,
          lineTotal:      feeBigInt,
          taxAmount:      BigInt(0),
          accountNumber:  "3590",
          sortOrder:      99,
        },
      })
    }

    const updated = await prisma.invoice.update({
      where: { id, organizationId: ctx.organizationId },
      data:  updateData,
    })

    if (method === "email" || method === "both") {
      const toEmail = invoice.billingEmail ?? invoice.contact?.email ?? null
      if (toEmail) {
        const branding = await resolveBranding(ctx.organizationId)
        const balance  = updated.totalAmount - updated.paidAmount

        sendReminderEmail({
          to:           toEmail,
          senderName:   branding.senderName,
          senderAddress: branding.senderEmail,
          replyTo:      branding.replyTo,
          branding:     { primaryColor: branding.primaryColor, logoUrl: branding.emailLogoUrl ?? branding.logoUrl },
          bodyTemplate: customMessage ?? null,
          orgName:      invoice.organization.name,
          invoiceNumber: invoice.invoiceNumber,
          dueDate:      invoice.dueDate.toLocaleDateString("sv-SE"),
          currency:     invoice.currency,
          balanceAmount: balance,
          contactName:  invoice.contact?.name ?? toEmail,
        }).catch(e => console.error("[send-reminder] email error", e))
      }
    }

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "invoice_send",
        entityType:     "Invoice",
        entityId:       id,
        meta: {
          invoiceNumber:    invoice.invoiceNumber,
          reminderCount:    updated.reminderCount,
          method,
          addReminderFee,
          feeApplied:       addReminderFee && !invoice.reminderFeeApplied,
        },
      },
    }).catch(() => {})

    return Response.json({
      ok:            true,
      reminderCount: updated.reminderCount,
      pdfUrl:        `/api/invoices/${id}/pdf?reminder=true`,
    })
  } catch (err) {
    return handleApiError(err, "invoices/send-reminder")
  }
}
