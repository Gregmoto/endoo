import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"
import { handleApiError } from "@/lib/api/handle-error"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "products:update")
    const { id } = await params

    const existing = await prisma.product.findFirst({
      where: { id, organizationId: ctx.organizationId, deletedAt: null },
    })
    if (!existing) {
      return Response.json({ error: "Artikel hittades inte" }, { status: 404 })
    }

    await prisma.product.update({
      where: { id },
      data:  { isActive: true, isPhasingOut: false },
    })

    prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId:         ctx.userId,
        action:         "update",
        entityType:     "Product",
        entityId:       id,
        after:          { isActive: true },
      },
    }).catch(() => {})

    return Response.json({ ok: true })
  } catch (err) {
    return handleApiError(err, "articles/[id]/activate")
  }
}
