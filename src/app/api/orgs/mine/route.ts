/**
 * GET /api/orgs/mine — Lista konton användaren har access till
 */
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Ej inloggad" }, { status: 401 })
  }

  const userId = session.user.id

  const memberships = await prisma.organizationMember.findMany({
    where: { userId, deletedAt: null },
    include: {
      organization: {
        select: { id: true, slug: true, name: true, type: true, plan: true, logoUrl: true, isActive: true },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  })

  const orgs = await Promise.all(
    memberships
      .filter((m) => m.organization.isActive)
      .map(async (m) => {
        const base = {
          id: m.organization.id, slug: m.organization.slug,
          name: m.organization.name, type: m.organization.type,
          plan: m.organization.plan, logoUrl: m.organization.logoUrl,
          role: m.role, isPrimary: m.isPrimary, clients: [] as ClientOrg[],
        }

        if (m.organization.type === "agency") {
          const relationships = await prisma.agencyClientRelationship.findMany({
            where: { agencyId: m.organization.id, status: "active" },
            include: { client: { select: { id: true, slug: true, name: true, logoUrl: true, isActive: true } } },
          })

          let allowedClientIds: Set<string> | null = null
          if (m.role !== "owner" && m.role !== "admin") {
            const grants = await prisma.agencyStaffAccess.findMany({
              where: { agencyMemberId: m.id, revokedAt: null },
              select: { clientId: true, accessLevel: true },
            })
            allowedClientIds = new Set(grants.map((g) => g.clientId))
          }

          base.clients = relationships
            .filter((r) => r.client.isActive && (allowedClientIds === null || allowedClientIds.has(r.client.id)))
            .map((r) => ({ id: r.client.id, slug: r.client.slug, name: r.client.name, logoUrl: r.client.logoUrl, accessLevel: "full" as const }))
        }

        return base
      })
  )

  return Response.json({ orgs })
}

interface ClientOrg {
  id: string; slug: string; name: string; logoUrl: string | null
  accessLevel: "full" | "invoicing_only" | "read_only"
}
