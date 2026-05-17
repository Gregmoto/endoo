import { requireAuth } from "@/lib/rbac/guards"
import { prisma }      from "@/lib/prisma"

function ser(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_, val) =>
    typeof val === "bigint" ? Number(val) : val,
  ))
}

export async function GET(): Promise<Response> {
  try {
    const ctx  = await requireAuth()
    const orgId = ctx.organizationId
    const now   = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 86_400_000)

    const [outstanding, overdueNow, paymentsToday, dueSoon] = await Promise.all([
      // Total outstanding
      prisma.invoice.aggregate({
        where: {
          organizationId: orgId,
          deletedAt:      null,
          type:           "invoice",
          status:         { in: ["sent", "viewed", "partial"] },
        },
        _sum:   { totalAmount: true, paidAmount: true },
        _count: true,
      }),

      // Overdue right now
      prisma.invoice.count({
        where: {
          organizationId: orgId,
          deletedAt:      null,
          type:           "invoice",
          status:         { in: ["sent", "viewed", "partial"] },
          dueDate:        { lt: now },
        },
      }),

      // Payments registered today
      prisma.payment.aggregate({
        where: {
          organizationId: orgId,
          paymentDate:    { gte: today, lt: tomorrow },
          method:         { not: "credit_note" },
        },
        _sum:   { amount: true },
        _count: true,
      }),

      // Invoices due within 7 days
      prisma.invoice.count({
        where: {
          organizationId: orgId,
          deletedAt:      null,
          type:           "invoice",
          status:         { in: ["sent", "viewed", "partial"] },
          dueDate:        { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) },
        },
      }),
    ])

    const outstandingOre = (outstanding._sum.totalAmount ?? 0n) - (outstanding._sum.paidAmount ?? 0n)

    return Response.json(ser({
      outstanding: {
        count:  outstanding._count,
        amountOre: outstandingOre,
      },
      overdueCount:   overdueNow,
      paymentsToday: {
        count:     paymentsToday._count,
        amountOre: paymentsToday._sum.amount ?? 0n,
      },
      dueSoon7Days: dueSoon,
    }))
  } catch (err) {
    if (err instanceof Error && err.message.includes("Not authenticated")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[analytics/realtime]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
