import { prisma } from "@/lib/prisma"

export type ClientInfo = { id: string; name: string; slug: string }

/**
 * Returns the list of client org IDs this agency user may access.
 * Owners/admins → all active agency-client relationships.
 * Other roles → only clients with an explicit, non-revoked AgencyStaffAccess grant.
 */
export async function getAccessibleClientIds(
  agencyOrgId: string,
  userId: string,
  role: string,
): Promise<string[]> {
  const isPrivileged = role === "owner" || role === "admin"

  if (isPrivileged) {
    const rels = await prisma.agencyClientRelationship.findMany({
      where: { agencyId: agencyOrgId, status: "active" },
      select: { clientId: true },
    })
    return rels.map(r => r.clientId)
  }

  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: agencyOrgId, userId } },
    select: { id: true },
  })
  if (!member) return []

  const grants = await prisma.agencyStaffAccess.findMany({
    where: { agencyMemberId: member.id, revokedAt: null },
    select: { clientId: true },
  })
  return grants.map(g => g.clientId)
}

/**
 * Returns a map of clientId → { id, name, slug } for all given ids.
 */
export async function getClientMap(clientIds: string[]): Promise<Map<string, ClientInfo>> {
  if (clientIds.length === 0) return new Map()
  const orgs = await prisma.organization.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, slug: true },
  })
  return new Map(orgs.map(o => [o.id, o]))
}
