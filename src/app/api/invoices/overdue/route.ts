/**
 * GET /api/invoices/overdue
 * Returns overdue unpaid invoices with interest calculation.
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "invoices:read")

    const url   = new URL(req.url)
    const page  = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const size  = Math.min(250, parseInt(url.searchParams.get("size") ?? "25"))
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const org = await prisma.organization.findFirst({
      where:  { id: ctx.organizationId },
      select: { invoicingSettings: true },
    })
    const settings     = (org?.invoicingSettings as Record<string, unknown>) ?? {}
    const interestRate = (settings.interestRate as number) ?? 8

    const where: Prisma.InvoiceWhereInput = {
      organizationId: ctx.organizationId,
      deletedAt: null,
      status:    { in: ["sent", "viewed", "partial", "overdue"] as ("sent"|"viewed"|"partial"|"overdue")[] },
      dueDate:   { lt: today },
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { dueDate: "asc" },
        take: size,
        skip: (page - 1) * size,
        include: { contact: { select: { id: true, name: true, customerNumber: true } } },
      }),
      prisma.invoice.count({ where }),
    ])

    const now = Date.now()
    const enriched = invoices.map(inv => {
      const daysOverdue = Math.floor((now - new Date(inv.dueDate!).getTime()) / (1000 * 60 * 60 * 24))
      const balance     = Number(inv.totalAmount) - Number(inv.paidAmount)
      const interestOre = Math.round((balance * interestRate / 100 / 365) * daysOverdue)
      return { ...inv, daysOverdue, balance, calculatedInterestOre: interestOre, interestRate }
    })

    return Response.json({
      data: enriched,
      pagination: { page, size, total, totalPages: Math.ceil(total / size) },
      interestRate,
    })
  } catch (err) {
    return handleApiError(err, "invoices/overdue")
  }
}
