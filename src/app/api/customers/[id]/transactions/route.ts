/**
 * GET /api/customers/[id]/transactions
 *
 * Returns invoice transactions for a customer with summary stats.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import type { InvoiceStatus } from "@prisma/client"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "contacts:read")
    const { id } = await params

    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!contact) return Response.json({ error: "Kunden hittades ej" }, { status: 404 })

    const url = new URL(req.url)
    const page   = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"))
    const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100)
    const status = url.searchParams.get("status")
    const from   = url.searchParams.get("from")
    const to     = url.searchParams.get("to")

    const validStatuses: InvoiceStatus[] = ["draft","sent","viewed","partial","paid","overdue","void","uncollectable"]
    const typedStatus = (status && validStatuses.includes(status as InvoiceStatus))
      ? (status as InvoiceStatus)
      : undefined

    const where = {
      contactId:      id,
      organizationId: ctx.organizationId,
      deletedAt:      null as null,
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(from || to
        ? {
            issueDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to   ? { lte: new Date(to)   } : {}),
            },
          }
        : {}),
    }

    const [invoices, total, allInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { issueDate: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:            true,
          invoiceNumber: true,
          type:          true,
          status:        true,
          issueDate:     true,
          dueDate:       true,
          totalAmount:   true,
          paidAmount:    true,
          currency:      true,
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where: { contactId: id, organizationId: ctx.organizationId, deletedAt: null },
        select: { totalAmount: true, paidAmount: true, status: true, paidAt: true, issueDate: true },
      }),
    ])

    const totalAmount  = allInvoices.reduce((s, i) => s + Number(i.totalAmount), 0)
    const unpaidAmount = allInvoices
      .filter(i => i.status !== "paid" && i.status !== "void")
      .reduce((s, i) => s + (Number(i.totalAmount) - Number(i.paidAmount)), 0)

    const paidInvoices = allInvoices.filter(i => i.status === "paid" && i.paidAt)
    let avgPaymentDays: number | null = null
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((s, i) => {
        const diff = new Date(i.paidAt!).getTime() - new Date(i.issueDate).getTime()
        return s + Math.round(diff / 86400000)
      }, 0)
      avgPaymentDays = Math.round(totalDays / paidInvoices.length)
    }

    return Response.json({
      invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      summary: {
        count:        allInvoices.length,
        totalAmount,
        unpaidAmount,
        avgPaymentDays,
      },
    })
  } catch (err) {
    return handleError(err)
  }
}

function handleError(err: unknown): Response {
  if ((err as { name?: string }).name === "UnauthenticatedError") {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }
  if ((err as { name?: string }).name === "UnauthorizedError") {
    return Response.json({ error: "Otillräckliga rättigheter" }, { status: 403 })
  }
  console.error("[customers/transactions]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
