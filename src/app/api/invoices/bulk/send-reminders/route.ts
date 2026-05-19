import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { sendReminderEmail } from "@/lib/email"
import { resolveBranding } from "@/lib/branding/resolver"
import { z } from "zod"
import type { InvoiceStatus } from "@prisma/client"

const BodySchema = z.object({
  invoiceIds:    z.array(z.string().uuid()).min(1).max(500),
  addReminderFee: z.boolean().default(false),
  method:         z.enum(["email", "print", "both"]).default("email"),
})

const UNPAID_STATUSES: InvoiceStatus[] = ["sent", "viewed", "partial", "overdue"]

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "reminders:send")

    const raw    = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return Response.json({ error: "Ogiltiga uppgifter", details: parsed.error.flatten() }, { status: 400 })
    }

    const { invoiceIds, addReminderFee, method } = parsed.data

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const invoices = await prisma.invoice.findMany({
      where: {
        id:             { in: invoiceIds },
        organizationId: ctx.organizationId,
        deletedAt:      null,
        status:         { in: UNPAID_STATUSES },
        dueDate:        { lt: today },
      },
      include: {
        contact:      { select: { name: true, email: true } },
        organization: { select: { name: true } },
      },
    })

    const branding = method !== "print"
      ? await resolveBranding(ctx.organizationId)
      : null

    const failed: string[] = []
    let affected = 0

    for (const invoice of invoices) {
      try {
        const updateData: Parameters<typeof prisma.invoice.update>[0]["data"] = {
          reminderCount:  invoice.reminderCount + 1,
          lastReminderAt: new Date(),
        }

        if (addReminderFee && !invoice.reminderFeeApplied) {
          const feeBigInt = BigInt(6000)
          updateData.reminderFeeApplied = true
          updateData.totalAmount = invoice.totalAmount + feeBigInt

          await prisma.invoiceLineItem.create({
            data: {
              invoiceId:      invoice.id,
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
          where: { id: invoice.id, organizationId: ctx.organizationId },
          data:  updateData,
        })

        if ((method === "email" || method === "both") && branding) {
          const toEmail = invoice.billingEmail ?? invoice.contact?.email ?? null
          if (toEmail) {
            const balance = updated.totalAmount - updated.paidAmount
            sendReminderEmail({
              to:            toEmail,
              senderName:    branding.senderName,
              senderAddress: branding.senderEmail,
              replyTo:       branding.replyTo,
              branding:      { primaryColor: branding.primaryColor, logoUrl: branding.emailLogoUrl ?? branding.logoUrl },
              orgName:       invoice.organization.name,
              invoiceNumber: invoice.invoiceNumber,
              dueDate:       invoice.dueDate.toLocaleDateString("sv-SE"),
              currency:      invoice.currency,
              balanceAmount: balance,
              contactName:   invoice.contact?.name ?? toEmail,
            }).catch(e => console.error("[bulk-reminders] email error", invoice.id, e))
          }
        }

        prisma.auditLog.create({
          data: {
            organizationId: ctx.organizationId,
            userId:         ctx.userId,
            action:         "invoice_send",
            entityType:     "Invoice",
            entityId:       invoice.id,
            meta:           { invoiceNumber: invoice.invoiceNumber, method, addReminderFee, bulk: true },
          },
        }).catch(() => {})

        affected++
      } catch (e) {
        console.error("[bulk-reminders] invoice failed", invoice.id, e)
        failed.push(invoice.id)
      }
    }

    return Response.json({ ok: true, affected, failed })
  } catch (err) {
    return handleApiError(err, "invoices/bulk/send-reminders")
  }
}
