/**
 * POST /api/auth/exit-impersonation
 *
 * Returns the agency user back to their own org context.
 * Clears impersonatingOrganizationId from the JWT.
 * Writes impersonate_end audit logs in both orgs.
 */

import { auth, unstable_update } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/tenant-db"
import { buildRBACContext } from "@/lib/rbac/context"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!session.impersonatingOrganizationId) {
    return Response.json({ error: "Not impersonating" }, { status: 400 })
  }

  const userId = session.user.id
  const agencyId = session.activeOrganizationId
  const clientId = session.impersonatingOrganizationId
  const ipAddress = req.headers.get("x-forwarded-for") ?? undefined

  const agencyMembership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: agencyId, userId } },
    include: {
      organization: { select: { slug: true, type: true } },
      user: { select: { isPlatformAdmin: true } },
    },
  })

  if (!agencyMembership) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  // Audit log in client org
  const clientCtx = buildRBACContext({
    userId,
    isPlatformAdmin: agencyMembership.user.isPlatformAdmin,
    activeOrganizationId: clientId,
    activeOrgType: "customer",
    memberRole: agencyMembership.role,
    impersonatingOrganizationId: clientId,
  })
  await writeAuditLog({
    ctx: clientCtx,
    action: "impersonate_end",
    entityType: "organization",
    entityId: agencyId,
    meta: { agencyId, agencySlug: agencyMembership.organization.slug },
    ipAddress,
  })

  // Audit log in agency org
  const agencyCtx = buildRBACContext({
    userId,
    isPlatformAdmin: agencyMembership.user.isPlatformAdmin,
    activeOrganizationId: agencyId,
    activeOrgType: "agency",
    memberRole: agencyMembership.role,
  })
  await writeAuditLog({
    ctx: agencyCtx,
    action: "impersonate_end",
    entityType: "organization",
    entityId: clientId,
    meta: { clientId, clientSlug: session.impersonatingOrgSlug },
    ipAddress,
  })

  // Clear impersonation from JWT
  await unstable_update({
    impersonatingOrganizationId: undefined,
    impersonatingOrgSlug: undefined,
  })

  return Response.json({ slug: session.activeOrgSlug })
}
