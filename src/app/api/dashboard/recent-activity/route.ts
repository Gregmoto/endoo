import { requireAuth } from "@/lib/rbac/guards"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await requireAuth()
    const items = await prisma.activityFeedItem.findMany({
      where: { organizationId: ctx.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    return Response.json({ items })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
