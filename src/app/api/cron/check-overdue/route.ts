/**
 * GET /api/cron/check-overdue
 *
 * Finds invoices that became overdue (dueDate < today, status = sent|partial,
 * paidAmount < totalAmount) and fires `invoice_overdue` events via dispatchEvent.
 *
 * Designed to be called by Vercel Cron once per day (e.g. "0 6 * * *").
 *
 * Security: Authorization: Bearer {CRON_SECRET}
 * If CRON_SECRET is not set, all calls are allowed (dev mode).
 *
 * Returns JSON: { checked: N, dispatched: N }
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

  // Start of today UTC — invoices with dueDate before this are overdue
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt:  null,
      status:     { in: ["sent", "partial"] },
      dueDate:    { lt: today },
      // paidAmount < totalAmount — filter in app layer since Prisma can't
      // compare two columns natively; we take all and skip fully paid ones
    },
    select: {
      id:              true,
      organizationId:  true,
      invoiceNumber:   true,
      currency:        true,
      dueDate:         true,
      totalAmount:     true,
      paidAmount:      true,
      contactId:       true,
      createdByUserId: true,
    },
    orderBy: { dueDate: "asc" },
    take:    500,  // safety cap
  })

  const now = Date.now()
  let dispatched = 0

  for (const invoice of invoices) {
    // Skip if fully paid (BigInt comparison)
    if (invoice.paidAmount >= invoice.totalAmount) continue

    const daysOverdue = Math.floor((now - invoice.dueDate.getTime()) / 86_400_000)

    // Fetch contact if linked
    const contact = invoice.contactId
      ? await prisma.contact.findFirst({
          where:  { id: invoice.contactId },
          select: { name: true, email: true },
        })
      : null

    dispatchEvent({
      organizationId: invoice.organizationId,
      type:           "invoice_overdue",
      actorUserId:    null,
      entityType:     "Invoice",
      entityId:       invoice.id,
      payload: {
        _version:        1,
        href:            `/invoices/${invoice.id}`,
        displayTitle:    `Faktura ${invoice.invoiceNumber} är förfallen`,
        displaySubtitle: `${daysOverdue} dagar — ${contact?.name ?? "Okänd kund"}`,
        invoiceId:       invoice.id,
        invoiceNumber:   invoice.invoiceNumber ?? "–",
        totalAmount:     invoice.totalAmount.toString(),
        paidAmount:      invoice.paidAmount.toString(),
        currency:        invoice.currency,
        daysOverdue,
        dueDate:         invoice.dueDate.toISOString().slice(0, 10),
        contactName:     contact?.name  ?? null,
        contactEmail:    contact?.email ?? null,
        createdByUserId: invoice.createdByUserId ?? "",
      },
    }).catch((err) =>
      console.error(`[cron/check-overdue] dispatchEvent failed for invoice ${invoice.id}:`, err),
    )

    dispatched++
  }

  console.log(`[cron/check-overdue] checked=${invoices.length} dispatched=${dispatched}`)
  return Response.json({ checked: invoices.length, dispatched })
}
