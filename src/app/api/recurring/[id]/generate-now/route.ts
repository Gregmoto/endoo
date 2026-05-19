import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk, apiError } from "@/lib/api/response"
import { calcLineTotal, calcTaxAmount } from "@/lib/contracts/utils"
import { calculateNextIssueDate } from "@/lib/invoicing/recurring/schedule"
import type { RecurringFrequency } from "@/lib/invoicing/recurring/schedule"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:update")

    const { id } = await params

    const schedule = await prisma.recurringSchedule.findFirst({
      where:   { id, organizationId: ctx.organizationId, deletedAt: null },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    })
    if (!schedule) return apiError("not_found", "Avtalet hittades inte")

    if (schedule.status === "ended" || schedule.status === "draft") {
      return apiError("bad_request", "Kan bara skapa faktura för aktiva eller pausade avtal")
    }

    if (schedule.lines.length === 0) {
      return apiError("bad_request", "Avtalet har inga artikelrader")
    }

    const issueDate = schedule.nextIssueDate

    const existing = await prisma.invoice.findFirst({
      where: {
        recurringScheduleId: schedule.id,
        organizationId:      ctx.organizationId,
        issueDate,
        deletedAt:           null,
      },
    })
    if (existing) {
      return apiError("conflict", "En faktura för detta datum finns redan", 409, { invoiceId: existing.id })
    }

    const year          = issueDate.getFullYear()
    const count         = await prisma.invoice.count({ where: { organizationId: ctx.organizationId } })
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
        organizationId: ctx.organizationId,
      }
    })

    const subtotal = lines.reduce((s, l) => s + Number(l.lineTotal), 0)
    const taxTotal = lines.reduce((s, l) => s + Number(l.taxAmount), 0)
    const total    = subtotal + taxTotal

    const invoiceStatus = schedule.autoSendMethod === "email" ? "sent" : "draft"
    const sentAt        = schedule.autoSendMethod === "email" ? new Date() : null

    const nextIssueDateAdv = calculateNextIssueDate(
      issueDate,
      schedule.frequency as RecurringFrequency,
      schedule.customDays ?? undefined,
    )

    const newIssuedCount = schedule.issuedCount + 1
    const shouldEnd      = schedule.maxInvoices != null && newIssuedCount >= schedule.maxInvoices
    const shouldEndByDate = schedule.endDate != null && nextIssueDateAdv > schedule.endDate

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          organizationId:      ctx.organizationId,
          invoiceNumber,
          contactId:           schedule.contactId,
          recurringScheduleId: schedule.id,
          issueDate,
          dueDate,
          currency:            schedule.currency,
          notes:               schedule.notes,
          status:              invoiceStatus,
          ...(sentAt ? { sentAt } : {}),
          subtotalAmount: BigInt(subtotal),
          taxAmount:      BigInt(taxTotal),
          discountAmount: BigInt(0),
          totalAmount:    BigInt(total),
          paidAmount:     BigInt(0),
          lineItems:      { create: lines },
        },
      }),
      prisma.recurringSchedule.update({
        where: { id, organizationId: ctx.organizationId },
        data:  {
          lastIssuedAt:  new Date(),
          nextIssueDate: nextIssueDateAdv,
          issuedCount:   newIssuedCount,
          ...(shouldEnd || shouldEndByDate ? { status: "ended" } : {}),
        },
      }),
    ])

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "create",
        entityType:     "Invoice",
        entityId:       invoice.id,
        meta:           { source: "manual_generate", scheduleId: id, invoiceNumber },
      },
    }).catch(() => {})

    return apiOk({ invoiceId: invoice.id, invoiceNumber })
  } catch (err) {
    return handleApiError(err, "recurring/generate-now")
  }
}
