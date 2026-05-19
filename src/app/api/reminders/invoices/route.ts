import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { Prisma, type InvoiceStatus } from "@prisma/client"

const UNPAID_STATUSES: InvoiceStatus[] = ["sent", "viewed", "partial", "overdue"]

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "reminders:read")

    const url             = new URL(req.url)
    const tab             = url.searchParams.get("tab")            ?? "unpaid"
    const search          = url.searchParams.get("q")              ?? ""
    const contactId       = url.searchParams.get("contactId")      ?? ""
    const overdueMinDays  = parseInt(url.searchParams.get("overdueMinDays") ?? "0") || 0
    const sortParam       = url.searchParams.get("sort")           ?? "dueDate:asc"
    const page            = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const size            = Math.min(250, Math.max(1, parseInt(url.searchParams.get("size") ?? "25")))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const baseWhere: Prisma.InvoiceWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      status: { in: UNPAID_STATUSES },
    }

    const conditions: Prisma.InvoiceWhereInput[] = [baseWhere]

    if (tab === "overdue") {
      conditions.push({ dueDate: { lt: today } })
    }

    if (overdueMinDays > 0) {
      const cutoff = new Date(today)
      cutoff.setDate(cutoff.getDate() - overdueMinDays)
      conditions.push({ dueDate: { lt: cutoff } })
    }

    if (search) {
      conditions.push({
        OR: [
          { invoiceNumber: { contains: search, mode: "insensitive" } },
          { billingName:   { contains: search, mode: "insensitive" } },
        ],
      })
    }

    if (contactId) {
      conditions.push({ contactId })
    }

    const where: Prisma.InvoiceWhereInput =
      conditions.length === 1 ? conditions[0] : { AND: conditions }

    const [field, dir] = sortParam.split(":")
    const direction = dir === "asc" ? "asc" : "desc"
    const orderBy: Prisma.InvoiceOrderByWithRelationInput =
      field === "contact" ? { contact: { name: direction } } : { [field]: direction }

    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy,
        take: size,
        skip: (page - 1) * size,
        select: {
          id:                true,
          invoiceNumber:     true,
          type:              true,
          status:            true,
          issueDate:         true,
          dueDate:           true,
          paidAt:            true,
          totalAmount:       true,
          paidAmount:        true,
          subtotalAmount:    true,
          currency:          true,
          billingName:       true,
          billingEmail:      true,
          contactId:         true,
          reminderCount:     true,
          lastReminderAt:    true,
          reminderFeeApplied: true,
          contact: {
            select: { id: true, name: true, customerNumber: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ])

    const now = Date.now()
    const data = rows
      .filter(r => r.paidAmount < r.totalAmount)
      .map(r => ({
        ...r,
        totalAmount:    Number(r.totalAmount),
        paidAmount:     Number(r.paidAmount),
        subtotalAmount: Number(r.subtotalAmount),
        daysOverdue:    r.dueDate
          ? Math.floor((now - r.dueDate.getTime()) / 86400000)
          : 0,
      }))

    return Response.json({
      data,
      pagination: {
        page,
        size,
        total: data.length < size && page === 1 ? data.length : total,
        totalPages: Math.ceil(total / size),
      },
    })
  } catch (err) {
    return handleApiError(err, "reminders/invoices")
  }
}
