import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk, apiError } from "@/lib/api/response"
import { calcLineTotal, calcTaxAmount } from "@/lib/contracts/utils"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "recurring:activate")

    const { id } = await params

    const schedule = await prisma.recurringSchedule.findFirst({
      where:   { id, organizationId: ctx.organizationId, deletedAt: null },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    })
    if (!schedule) return apiError("not_found", "Avtalet hittades inte")

    if (schedule.status !== "draft") {
      return apiError("bad_request", "Bara utkast kan aktiveras")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startDate = new Date(schedule.startDate)
    startDate.setHours(0, 0, 0, 0)

    // If startDate is today or in the past, create the first invoice immediately
    if (startDate <= today && schedule.lines.length > 0) {
      const existing = await prisma.invoice.findFirst({
        where: {
          recurringScheduleId: schedule.id,
          organizationId:      ctx.organizationId,
          issueDate:           schedule.nextIssueDate,
          deletedAt:           null,
        },
      })

      if (!existing) {
        const issueDate = schedule.nextIssueDate
        const year      = issueDate.getFullYear()
        const count     = await prisma.invoice.count({ where: { organizationId: ctx.organizationId } })
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

        await prisma.invoice.create({
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
        })
      }
    }

    const updated = await prisma.recurringSchedule.update({
      where: { id, organizationId: ctx.organizationId },
      data:  { status: "active" },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "RecurringSchedule",
        entityId:       id,
        after:          { status: "active" },
      },
    }).catch(() => {})

    return apiOk(updated)
  } catch (err) {
    return handleApiError(err, "recurring/activate")
  }
}
