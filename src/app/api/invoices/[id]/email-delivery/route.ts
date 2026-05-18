import { prisma }        from "@/lib/prisma"
import { requireAuth }   from "@/lib/rbac/guards"
import { handleApiError } from "@/lib/api/handle-error"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth()
    const { id } = await params

    // Verify invoice belongs to org
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    })
    if (!invoice) return Response.json(null)

    // Find most recent delivery for this invoice
    const delivery = await prisma.emailDelivery.findFirst({
      where: { notificationJob: { payload: { path: ["invoiceId"], equals: id } } },
      orderBy: { createdAt: "desc" },
      select: {
        status:      true,
        openedAt:    true,
        clickedAt:   true,
        deliveredAt: true,
        bouncedAt:   true,
        createdAt:   true,
      },
    })

    return Response.json(delivery ?? null)
  } catch (err) {
    return handleApiError(err, "invoices/email-delivery")
  }
}
