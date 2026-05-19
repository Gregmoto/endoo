import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import type { InvoiceStatus } from "@prisma/client"

const UNPAID_STATUSES: InvoiceStatus[] = ["sent", "viewed", "partial", "overdue"]

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "reminders:read")

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [unpaidInvoices, overdueInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId: ctx.organizationId,
          deletedAt: null,
          status: { in: UNPAID_STATUSES },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
      prisma.invoice.findMany({
        where: {
          organizationId: ctx.organizationId,
          deletedAt: null,
          status: { in: UNPAID_STATUSES },
          dueDate: { lt: today },
        },
        select: { totalAmount: true, paidAmount: true },
      }),
    ])

    const unpaidFiltered = unpaidInvoices.filter(i => i.paidAmount < i.totalAmount)
    const overdueFiltered = overdueInvoices.filter(i => i.paidAmount < i.totalAmount)

    return Response.json({
      unpaid: {
        count: unpaidFiltered.length,
        totalAmount: Number(unpaidFiltered.reduce((s, i) => s + i.totalAmount - i.paidAmount, BigInt(0))),
      },
      overdue: {
        count: overdueFiltered.length,
        totalAmount: Number(overdueFiltered.reduce((s, i) => s + i.totalAmount - i.paidAmount, BigInt(0))),
      },
    })
  } catch (err) {
    return handleApiError(err, "reminders/stats")
  }
}
