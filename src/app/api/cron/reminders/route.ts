/**
 * GET|POST /api/cron/reminders
 *
 * Sends overdue invoice reminders. Run once per day via Vercel Cron.
 *
 * Vercel cron configuration (vercel.json):
 *   {
 *     "crons": [
 *       { "path": "/api/cron/reminders", "schedule": "0 7 * * *" },
 *       { "path": "/api/cron/contracts", "schedule": "0 6 * * *" }
 *     ]
 *   }
 *
 * Security: CRON_SECRET env var must be set. Pass it as either:
 *   - Header:  x-cron-secret: <secret>
 *   - Header:  Authorization: Bearer <secret>
 *
 * Logic per run:
 *   1. Find invoices: status=sent|partial, type=invoice, dueDate < today
 *   2. Skip if lastReminderAt is already today (deduplication)
 *   3. Skip if contact has no email address
 *   4. Load per-org email settings (reminder template)
 *   5. Send reminder via Resend (falls back to console.log without API key)
 *   6. On success: update lastReminderAt + reminderCount, write audit log
 *   7. On failure: log error, continue — one bad invoice does not abort the run
 *
 * Returns JSON: { sent, skipped, failed, total }
 */

import { prisma } from "@/lib/prisma"
import { sendReminderEmail } from "@/lib/email"
import { SETTING_KEYS } from "@/lib/settings/keys"

function authorized(req: Request): boolean {
  if (!process.env.CRON_SECRET) return false
  const secret = process.env.CRON_SECRET

  const fromHeader = req.headers.get("x-cron-secret")
  if (fromHeader === secret) return true

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (bearer === secret) return true

  return false
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Only regular invoices — proforma and credit_note do not generate reminders
  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      type:      "invoice",
      status:    { in: ["sent", "partial"] },
      dueDate:   { lt: today },
      OR: [
        { lastReminderAt: null },
        { lastReminderAt: { lt: today } },
      ],
    },
    include: {
      contact:      { select: { name: true, email: true } },
      organization: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 200,   // safety cap — rerun catches the rest next day
  })

  type Result = {
    invoiceId:     string
    invoiceNumber: string
    status:        "sent" | "skipped" | "failed"
    reason?:       string
  }
  const results: Result[] = []
  let sent = 0, skipped = 0, failed = 0

  for (const invoice of invoices) {
    const recipientEmail = invoice.contact?.email
    if (!recipientEmail) {
      skipped++
      results.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: "skipped", reason: "no_email" })
      continue
    }

    try {
      // Load org-scoped email settings
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
        results.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: "failed", reason: String(result.error) })
        console.error(`[cron/reminders] email failed for invoice ${invoice.id}:`, result.error)
      } else {
        sent++
        results.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: "sent" })

        // Update reminder state
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            lastReminderAt: new Date(),
            reminderCount:  { increment: 1 },
          },
        })

        // Audit log (fire-and-forget)
        prisma.auditLog.create({
          data: {
            organizationId: invoice.organizationId,
            action:         "invoice_send",
            entityType:     "Invoice",
            entityId:       invoice.id,
            meta: {
              trigger:       "cron_reminder",
              invoiceNumber: invoice.invoiceNumber,
              recipientEmail,
              emailId:       result.id ?? null,
            },
          },
        }).catch(() => {})
      }
    } catch (err) {
      failed++
      results.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, status: "failed", reason: String(err) })
      console.error(`[cron/reminders] unhandled error for invoice ${invoice.id}:`, err)
    }
  }

  console.log(`[cron/reminders] total=${invoices.length} sent=${sent} skipped=${skipped} failed=${failed}`)
  return Response.json({ total: invoices.length, sent, skipped, failed, results })
}

export const GET  = handle
export const POST = handle
