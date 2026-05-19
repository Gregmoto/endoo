/**
 * POST/GET /api/cron/contracts
 *
 * Generates invoices for all active recurring contracts whose
 * nextIssueDate is today or earlier. Idempotent — skips any
 * schedule that already has an invoice for the current issueDate.
 *
 * Auth: x-cron-secret header (or Authorization: Bearer <secret>).
 * Schedule with Vercel Cron or external scheduler — once per day.
 */

import { prisma } from "@/lib/prisma"
import { calcLineTotal, calcTaxAmount } from "@/lib/contracts/utils"
import { calculateNextIssueDate } from "@/lib/invoicing/recurring/schedule"
import type { RecurringFrequency } from "@/lib/invoicing/recurring/schedule"

export async function GET(req: Request) { return handle(req) }
export async function POST(req: Request) { return handle(req) }

async function handle(req: Request) {
  const secret =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "")

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const schedules = await prisma.recurringSchedule.findMany({
    where: {
      status:        "active",
      deletedAt:     null,
      nextIssueDate: { lte: today },
    },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  })

  type Result = { id: string; status: "ok" | "skipped" | "error"; invoiceId?: string; error?: string }
  const results: Result[] = []

  for (const schedule of schedules) {
    try {
      const issueDate = schedule.nextIssueDate

      // Idempotency: skip if invoice already exists for this date
      const dup = await prisma.invoice.findFirst({
        where: {
          recurringScheduleId: schedule.id,
          organizationId:      schedule.organizationId,
          issueDate,
          deletedAt:           null,
        },
      })
      if (dup) {
        results.push({ id: schedule.id, status: "skipped", invoiceId: dup.id })
        continue
      }

      if (schedule.lines.length === 0) {
        results.push({ id: schedule.id, status: "error", error: "no lines" })
        continue
      }

      const year          = issueDate.getFullYear()
      const count         = await prisma.invoice.count({ where: { organizationId: schedule.organizationId } })
      const invoiceNumber = `${year}-${String(count + 1).padStart(4, "0")}`

      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + (schedule.paymentTermsDays ?? 30))

      const lines = schedule.lines.map(l => {
        const lt  = calcLineTotal(Number(l.quantity), Number(l.unitPrice), Number(l.discountRate))
        const tax = calcTaxAmount(lt, Number(l.taxRate))
        return {
          description:    l.description,
          quantity:       l.quantity,
          unit:           l.unit,
          unitPrice:      l.unitPrice,
          taxRate:        l.taxRate,
          discountRate:   l.discountRate,
          lineTotal:      BigInt(lt),
          taxAmount:      BigInt(tax),
          productId:      l.productId,
          sortOrder:      l.sortOrder,
          organizationId: schedule.organizationId,
        }
      })

      const subtotalAmount = lines.reduce((s, l) => s + Number(l.lineTotal), 0)
      const taxTotal       = lines.reduce((s, l) => s + Number(l.taxAmount), 0)
      const totalAmount    = subtotalAmount + taxTotal

      const nextIssueDateAdv = calculateNextIssueDate(
        issueDate,
        schedule.frequency as RecurringFrequency,
        schedule.customDays ?? undefined,
      )

      const newIssuedCount = schedule.issuedCount + 1
      const shouldEnd =
        (schedule.maxInvoices != null && newIssuedCount >= schedule.maxInvoices) ||
        (schedule.endDate != null && nextIssueDateAdv > schedule.endDate)

      const invoiceStatus = schedule.autoSendMethod === "email" ? "sent" : "draft"
      const sentAt        = schedule.autoSendMethod === "email" ? new Date() : null

      const [invoice] = await prisma.$transaction([
        prisma.invoice.create({
          data: {
            organizationId:      schedule.organizationId,
            invoiceNumber,
            contactId:           schedule.contactId,
            recurringScheduleId: schedule.id,
            issueDate,
            dueDate,
            currency:            schedule.currency,
            reference:           schedule.reference,
            notes:               schedule.notes,
            status:              invoiceStatus,
            ...(sentAt ? { sentAt } : {}),
            subtotalAmount: BigInt(subtotalAmount),
            taxAmount:      BigInt(taxTotal),
            discountAmount: BigInt(0),
            totalAmount:    BigInt(totalAmount),
            paidAmount:     BigInt(0),
            lineItems:      { create: lines },
          },
        }),
        prisma.recurringSchedule.update({
          where: { id: schedule.id, organizationId: schedule.organizationId },
          data:  {
            lastIssuedAt:  new Date(),
            nextIssueDate: nextIssueDateAdv,
            issuedCount:   newIssuedCount,
            ...(shouldEnd ? { status: "ended" } : {}),
          },
        }),
      ])

      prisma.auditLog.create({
        data: {
          organizationId: schedule.organizationId,
          action:         "create",
          entityType:     "Invoice",
          entityId:       invoice.id,
          meta:           { source: "cron_contracts", scheduleId: schedule.id, invoiceNumber },
        },
      }).catch(() => {})

      results.push({ id: schedule.id, status: "ok", invoiceId: invoice.id })
    } catch (err) {
      console.error(`[cron/contracts] Schedule ${schedule.id}:`, err)
      results.push({ id: schedule.id, status: "error", error: String(err) })
    }
  }

  const ok      = results.filter(r => r.status === "ok").length
  const skipped = results.filter(r => r.status === "skipped").length
  const errors  = results.filter(r => r.status === "error").length

  console.log(`[cron/contracts] processed=${schedules.length} ok=${ok} skipped=${skipped} errors=${errors}`)

  return Response.json({ processed: schedules.length, ok, skipped, errors, results })
}
