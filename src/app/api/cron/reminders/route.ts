/**
 * POST /api/cron/reminders
 *
 * Sends overdue invoice reminders.
 * Designed to be called by a scheduler (Vercel Cron, GitHub Actions, etc.)
 * once per day.
 *
 * Logic:
 *   - Find invoices with status sent|partial where dueDate < today
 *   - Check if a reminder was already sent today (lastReminderAt date)
 *   - Load org email settings (reminder template)
 *   - Send reminder email to contact
 *   - Update lastReminderAt on the invoice
 *
 * Security: requires CRON_SECRET header == env.CRON_SECRET
 */

import { prisma } from "@/lib/prisma"
import { sendReminderEmail } from "@/lib/email"
import { SETTING_KEYS } from "@/lib/settings/keys"

export async function POST(req: Request) {
  // Auth: shared secret
  const secret = req.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find overdue invoices that haven't been reminded today
  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      status: { in: ["sent", "partial"] },
      dueDate: { lt: today },
      OR: [
        { lastReminderAt: null },
        { lastReminderAt: { lt: today } },
      ],
    },
    include: {
      contact: { select: { name: true, email: true } },
      organization: { select: { id: true, name: true } },
    },
    take: 200, // safety cap per run
  })

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const invoice of invoices) {
    const recipientEmail = invoice.contact?.email
    if (!recipientEmail) { skipped++; continue }

    // Load org email settings
    const settings = await prisma.organizationSetting.findMany({
      where: {
        organizationId: invoice.organizationId,
        key: { in: [
          SETTING_KEYS.EMAIL_SENDER_NAME,
          SETTING_KEYS.EMAIL_SENDER_ADDRESS,
          SETTING_KEYS.EMAIL_REPLY_TO,
          SETTING_KEYS.EMAIL_REMINDER_SUBJECT,
          SETTING_KEYS.EMAIL_REMINDER_BODY,
        ]},
      },
    })
    const sm = Object.fromEntries(settings.map(s => [s.key, s.value]))
    const sv = (v: unknown): string | null => typeof v === "string" ? v : null

    const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount)

    const result = await sendReminderEmail({
      to:              recipientEmail,
      senderName:      sv(sm[SETTING_KEYS.EMAIL_SENDER_NAME]),
      senderAddress:   sv(sm[SETTING_KEYS.EMAIL_SENDER_ADDRESS]),
      replyTo:         sv(sm[SETTING_KEYS.EMAIL_REPLY_TO]),
      subjectTemplate: sv(sm[SETTING_KEYS.EMAIL_REMINDER_SUBJECT]),
      bodyTemplate:    sv(sm[SETTING_KEYS.EMAIL_REMINDER_BODY]),
      orgName:         invoice.organization.name,
      invoiceNumber:   invoice.invoiceNumber,
      dueDate:         invoice.dueDate.toLocaleDateString("sv-SE"),
      currency:        invoice.currency,
      balanceAmount:   balance,
      contactName:     invoice.contact?.name ?? recipientEmail,
    })

    if (result.error) {
      failed++
      console.error(`[cron/reminders] Failed for invoice ${invoice.id}:`, result.error)
    } else {
      sent++
      // Update lastReminderAt + increment reminder count
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lastReminderAt:  new Date(),
          reminderCount:   { increment: 1 },
        },
      })

      // Audit log (non-blocking)
      prisma.auditLog.create({
        data: {
          organizationId: invoice.organizationId,
          userId:         null,
          action:         "invoice_send",
          entityType:     "Invoice",
          entityId:       invoice.id,
          meta: {
            trigger:       "cron_reminder",
            invoiceNumber: invoice.invoiceNumber,
            recipientEmail,
            emailId:       result.id,
          },
        },
      }).catch(() => {})
    }
  }

  console.log(`[cron/reminders] sent=${sent} skipped=${skipped} failed=${failed}`)
  return Response.json({ sent, skipped, failed, total: invoices.length })
}

// Also support GET for Vercel Cron (uses GET by convention)
export { POST as GET }
