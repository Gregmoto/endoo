/**
 * DELETE /api/invoices/[id]/payments/[paymentId]  — remove payment + recalculate
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { InvoiceStatus } from "@prisma/client"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "payments:delete")
    const { id, paymentId } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, invoiceId: id, organizationId: ctx.organizationId },
    })
    if (!payment) return Response.json({ error: "Betalning hittades ej" }, { status: 404 })

    const newPaidAmount = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount))
    const newStatus: InvoiceStatus =
      newPaidAmount === 0 ? "sent" :
      newPaidAmount < Number(invoice.totalAmount) ? "partial" :
      "paid"

    await prisma.$transaction([
      prisma.payment.delete({ where: { id: paymentId, organizationId: ctx.organizationId } }),
      prisma.invoice.update({
        where: { id, organizationId: ctx.organizationId },
        data: {
          paidAmount: BigInt(newPaidAmount),
          status:     newStatus,
          ...(newStatus !== "paid" ? { paidAt: null } : {}),
        },
      }),
    ])

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "delete",
        entityType:     "Payment",
        entityId:       paymentId,
        before: {
          amount:     Number(payment.amount),
          method:     payment.method,
          invoiceId:  id,
        },
        meta: { newPaidAmount, newStatus },
      },
    }).catch(() => {})

    return new Response(null, { status: 204 })
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
  console.error("[invoices/payments/[paymentId]]", err)
  return Response.json({ error: "Internt fel" }, { status: 500 })
}
