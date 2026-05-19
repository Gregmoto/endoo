import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"
import { apiOk } from "@/lib/api/response"
import { InvoiceStatus } from "@prisma/client"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "payments:delete")
    const { id } = await params

    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: ctx.organizationId },
    })
    if (!payment) return Response.json({ error: "Betalning hittades ej" }, { status: 404 })

    const invoice = await prisma.invoice.findFirst({
      where: { id: payment.invoiceId, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!invoice) return Response.json({ error: "Faktura hittades ej" }, { status: 404 })

    const newPaidAmount = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount))

    const newStatus: InvoiceStatus =
      newPaidAmount === 0
        ? (["sent", "viewed"].includes(invoice.status) ? (invoice.status as InvoiceStatus) : "sent")
        : "partial"

    await prisma.$transaction([
      prisma.payment.delete({ where: { id } }),
      prisma.invoice.update({
        where: { id: invoice.id, organizationId: ctx.organizationId },
        data: {
          paidAmount: BigInt(newPaidAmount),
          status:     newStatus,
          ...(newPaidAmount === 0 ? { paidAt: null } : {}),
        },
      }),
    ])

    return apiOk({ ok: true })
  } catch (err) {
    return handleApiError(err, "payments/[id]:DELETE")
  }
}
