/**
 * GET /api/cron/approval-reminders
 *
 * Finds ApprovalStep rows that have been active for > 24 hours without a vote
 * and fires `approval_reminder_due` events, then increments the reminder counter.
 *
 * Conditions: status = "active", activatedAt < 24h ago, reminderCount < 3.
 *
 * Designed to be called by Vercel Cron once per hour (e.g. "0 * * * *").
 *
 * Security: Authorization: Bearer {CRON_SECRET}
 * If CRON_SECRET is not set, all calls are allowed (dev mode).
 *
 * Returns JSON: { reminded: N }
 */

import { prisma }        from "@/lib/prisma"
import { dispatchEvent } from "@/lib/notifications/dispatcher"

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true  // dev mode — no secret configured

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return bearer === secret
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60_000)  // 24h ago

  const steps = await prisma.approvalStep.findMany({
    where: {
      status:       "active",
      activatedAt:  { lt: cutoff },
      reminderCount: { lt: 3 },
    },
    include: {
      request: {
        select: {
          id:               true,
          supplierInvoiceId: true,
          submittedByUserId: true,
          supplierInvoice:  {
            select: {
              supplierName:  true,
              invoiceNumber: true,
              amountInclVat: true,
              currency:      true,
            },
          },
        },
      },
    },
    orderBy: { activatedAt: "asc" },
    take:    100,  // safety cap
  })

  let reminded = 0
  const now = new Date()

  for (const step of steps) {
    const request = step.request
    const invoice = request.supplierInvoice

    dispatchEvent({
      organizationId: step.organizationId,
      type:           "approval_reminder_due",
      actorUserId:    null,
      entityType:     "ApprovalStep",
      entityId:       step.id,
      payload: {
        _version:          1,
        href:              `/supplier-invoices/${request.supplierInvoiceId}`,
        displayTitle:      `Påminnelse: Attestera faktura ${invoice.invoiceNumber ?? "–"}`,
        displaySubtitle:   `${invoice.supplierName ?? "Okänd leverantör"} — väntar på attest`,
        requestId:         step.requestId,
        supplierInvoiceId: request.supplierInvoiceId,
        supplierName:      invoice.supplierName   ?? null,
        invoiceNumber:     invoice.invoiceNumber  ?? null,
        amountInclVat:     (invoice.amountInclVat ?? 0n).toString(),
        currency:          invoice.currency,
        stepId:            step.id,
        stepName:          step.name,
        stepOrder:         step.stepOrder,
        resolvedApproverIds: step.resolvedApproverIds,
        submittedByUserId: request.submittedByUserId,
      },
    }).catch((err) =>
      console.error(`[cron/approval-reminders] dispatchEvent failed for step ${step.id}:`, err),
    )

    // Update reminder tracking (fire-and-forget errors are logged but don't abort)
    prisma.approvalStep
      .update({
        where: { id: step.id },
        data: {
          reminderCount:     { increment: 1 },
          lastReminderSentAt: now,
        },
      })
      .catch((err) =>
        console.error(`[cron/approval-reminders] step update failed for ${step.id}:`, err),
      )

    reminded++
  }

  console.log(`[cron/approval-reminders] reminded=${reminded}`)
  return Response.json({ reminded })
}
