/**
 * GET /api/agency/clients
 * Lists all active client organizations for the current agency.
 * Requires agency org type + agency:read_clients permission.
 */

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/rbac/guards"
import { canOrThrow } from "@/lib/rbac/policy"

export async function GET() {
  try {
    const ctx = await requireAuth()
    canOrThrow(ctx, "agency:read_clients")

    const relationships = await prisma.agencyClientRelationship.findMany({
      where: { agencyId: ctx.organizationId, status: "active" },
      include: {
        client: {
          select: {
            id: true, name: true, slug: true, isActive: true, plan: true,
            _count: { select: { members: true, invoices: { where: { deletedAt: null } } } },
          },
        },
      },
      orderBy: { grantedAt: "asc" },
    })

    return Response.json(
      relationships.map(r => ({
        id:           r.client.id,
        name:         r.client.name,
        slug:         r.client.slug,
        isActive:     r.client.isActive,
        plan:         r.client.plan,
        memberCount:  r.client._count.members,
        invoiceCount: r.client._count.invoices,
        grantedAt:    r.grantedAt,
      }))
    )
  } catch (err) {
    if ((err as { name?: string }).name === "UnauthenticatedError") return Response.json({ error: "Unauthorized" }, { status: 401 })
    if ((err as { name?: string }).name === "UnauthorizedError")    return Response.json({ error: "Forbidden" }, { status: 403 })
    console.error("[agency/clients]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
