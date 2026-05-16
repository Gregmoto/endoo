/**
 * POST /api/invoices/[id]/send
 *
 * Sends invoice via email (Resend) using org email templates, then marks as sent.
 * Falls back to built-in template if no custom template is configured.
 *
 * Body:
 *   { email?: string; markOnly?: boolean }
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { sendInvoiceEmail } from "@/lib/email"
import { SETTING_KEYS } from "@/lib/settings/keys"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:send")
    const { id } = await params

    const [invoice, emailSettings] = await Promise.all([
      prisma.invoice.findFirst({
        where: { id, organizationId: ctx.organizationId, deletedAt: null },
        include: {
          contact: { select: { name: true, email: true } },
          lineItems: {
            orderBy: { sortOrder: "asc" },
            select: { description: true, quantity: true, unitPrice: true, taxRate: true, lineTotal: true },
          },
          organization: { select: { name: true } },
        },
      }),
      prisma.organizationSetting.findMany({
        where: {
          organizationId: ctx.organizationId,
          key: { in: [
            SETTING_KEYS.EMAIL_SENDER_NAME,
            SETTING_KEYS.EMAIL_SENDER_ADDRESS,
            SETTING_KEYS.EMAIL_REPLY_TO,
            SETTING_KEYS.EMAIL_INVOICE_SUBJECT,
            SETTING_KEYS.EMAIL_INVOICE_BODY,
          ]},
        },
      }),
    ])

    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })
    if (!["draft", "sent"].includes(invoice.status)) {
      return Response.json({ error: "Fakturan kan inte skickas i nuvarande status" }, { status: 422 })
    }

    const body = await req.json().catch(() => ({}))
    const recipientEmail: string | null = body.email ?? invoice.contact?.email ?? null
    const markOnly: boolean = !!body.markOnly || !recipientEmail

    const sm = Object.fromEntries(emailSettings.map(s => [s.key, s.value]))
    const sv = (v: unknown): string | null => typeof v === "string" ? v : null

    let emailId: string | undefined
    let emailError: string | undefined

    if (!markOnly && recipientEmail) {
      const result = await sendInvoiceEmail({
        to:              recipientEmail,
        senderName:      sv(sm[SETTING_KEYS.EMAIL_SENDER_NAME]),
        senderAddress:   sv(sm[SETTING_KEYS.EMAIL_SENDER_ADDRESS]),
        replyTo:         sv(sm[SETTING_KEYS.EMAIL_REPLY_TO]),
        subjectTemplate: sv(sm[SETTING_KEYS.EMAIL_INVOICE_SUBJECT]),
        bodyTemplate:    sv(sm[SETTING_KEYS.EMAIL_INVOICE_BODY]),
        orgName:         invoice.organization.name,
        invoiceNumber:   invoice.invoiceNumber,
        invoiceDate:     invoice.issueDate.toLocaleDateString("sv-SE"),
        dueDate:         invoice.dueDate.toLocaleDateString("sv-SE"),
        currency:        invoice.currency,
        totalAmount:     invoice.totalAmount,
        contactName:     invoice.contact?.name ?? recipientEmail,
        notes:           invoice.notes ?? undefined,
        lines: invoice.lineItems.map(l => ({
          description: l.description,
          quantity:    Number(l.quantity),
          unitPrice:   l.unitPrice,
          taxRate:     Number(l.taxRate),
          total:       l.lineTotal,
        })),
      })
      emailId    = result.id
      emailError = result.error
    }

    const updated = await prisma.invoice.update({
      where: { id, organizationId: ctx.organizationId },
      data: { status: "sent", sentAt: new Date() },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "invoice_send",
        entityType:     "Invoice",
        entityId:       id,
        meta: { invoiceNumber: invoice.invoiceNumber, recipientEmail, markOnly, emailId, emailError },
      },
    }).catch(() => {})

    return Response.json({ ...updated, recipientEmail, emailSent: !markOnly && !emailError, emailError: emailError ?? null })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Ej inloggad" }, { status: 401 })
  if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  console.error("[invoices/send]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
