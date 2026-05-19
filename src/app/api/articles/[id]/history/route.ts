import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:read")
    const { id } = await params

    const product = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true, inventoryItem: { select: { id: true } } },
    })
    if (!product) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    const [transactions, auditLogs] = await Promise.all([
      product.inventoryItem
        ? prisma.inventoryTransaction.findMany({
            where:   { itemId: product.inventoryItem.id, organizationId: ctx.organizationId },
            orderBy: { transactedAt: "desc" },
            take:    100,
          })
        : Promise.resolve([]),
      prisma.auditLog.findMany({
        where:   { entityType: "Product", entityId: id, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take:    50,
      }),
    ])

    return Response.json({ transactions, auditLogs })
  } catch (err) {
    return handleApiError(err, "articles/[id]/history")
  }
}
