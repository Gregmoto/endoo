import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    const invoices = await prisma.supplierInvoice.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { in: ["pending_approval", "needs_review"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        amountInclVat: true,
        createdAt: true,
        supplier: { select: { name: true } },
      },
    }).catch(() => [])

    const count = await prisma.supplierInvoice.count({
      where: { organizationId: ctx.organizationId, status: { in: ["pending_approval", "needs_review"] } },
    }).catch(() => 0)

    return Response.json({ count, items: invoices })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
