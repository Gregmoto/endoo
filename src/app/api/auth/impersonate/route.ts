/**
 * POST /api/auth/impersonate
 *
 * Agency user enters a client organization's context.
 * The agency's own org remains as activeOrganizationId;
 * the client is set as impersonatingOrganizationId.
 *
 * Validates:
 *   - User is in an agency org (type = 'agency')
 *   - A live agency_client_relationship exists
 *   - If non-owner/admin: an agency_staff_access grant exists for this member
 *
 * On success:
 *   - Sets impersonatingOrganizationId in JWT
 *   - Writes impersonate_start audit log in BOTH the agency AND client org
 *   - Returns { slug } for redirect to /app/[clientSlug]
 */

import { auth, unstable_update } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/tenant-db"
import { buildRBACContext } from "@/lib/rbac/context"
import { z } from "zod"

const ImpersonateBody = z.object({
  clientOrganizationId: z.string().uuid(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = ImpersonateBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  const { clientOrganizationId } = parsed.data
  const userId = session.user.id
  const agencyId = session.activeOrganizationId

  // Load agency membership
  const agencyMembership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: agencyId, userId },
    },
    include: {
      organization: { select: { id: true, slug: true, type: true } },
      user: { select: { isPlatformAdmin: true } },
    },
  })

  if (!agencyMembership || agencyMembership.deletedAt) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  // Must be an agency org
  if (agencyMembership.organization.type !== "agency") {
    return Response.json({ error: "Only agency accounts can impersonate clients" }, { status: 403 })
  }

  // Verify agency → client relationship
  const relationship = await prisma.agencyClientRelationship.findUnique({
    where: {
      agencyId_clientId: { agencyId, clientId: clientOrganizationId },
    },
    include: {
      client: { select: { id: true, slug: true, isActive: true } },
    },
  })

  if (!relationship || relationship.status !== "active" || !relationship.client.isActive) {
    return Response.json({ error: "No active relationship with this client" }, { status: 403 })
  }

  // Resolve access level for this staff member
  let accessLevel: "full" | "invoicing_only" | "read_only" = "full"
  const isOwnerOrAdmin = agencyMembership.role === "owner" || agencyMembership.role === "admin"

  if (!isOwnerOrAdmin && !agencyMembership.user.isPlatformAdmin) {
    const grant = await prisma.agencyStaffAccess.findUnique({
      where: {
        agencyMemberId_clientId: {
          agencyMemberId: agencyMembership.id,
          clientId: clientOrganizationId,
        },
      },
    })

    if (!grant || grant.revokedAt) {
      return Response.json({ error: "No access grant for this client" }, { status: 403 })
    }

    accessLevel = grant.accessLevel as typeof accessLevel
  }

  const ipAddress = req.headers.get("x-forwarded-for") ?? undefined

  // Audit log: impersonate_start in agency org
  const agencyCtx = buildRBACContext({
    userId,
    isPlatformAdmin: agencyMembership.user.isPlatformAdmin,
    activeOrganizationId: agencyId,
    activeOrgType: "agency",
    memberRole: agencyMembership.role,
  })
  await writeAuditLog({
    ctx: agencyCtx,
    action: "impersonate_start",
    entityType: "organization",
    entityId: clientOrganizationId,
    meta: {
      clientId: clientOrganizationId,
      clientSlug: relationship.client.slug,
      accessLevel,
    },
    ipAddress,
  })

  // Audit log: impersonate_start in client org
  const clientCtx = buildRBACContext({
    userId,
    isPlatformAdmin: agencyMembership.user.isPlatformAdmin,
    activeOrganizationId: clientOrganizationId,
    activeOrgType: "customer",
    memberRole: agencyMembership.role,
    impersonatingOrganizationId: clientOrganizationId,
    agencyAccessLevel: accessLevel,
  })
  await writeAuditLog({
    ctx: clientCtx,
    action: "impersonate_start",
    entityType: "organization",
    entityId: agencyId,
    meta: {
      agencyId,
      agencySlug: agencyMembership.organization.slug,
      accessLevel,
    },
    ipAddress,
  })

  // Patch JWT
  await unstable_update({
    impersonatingOrganizationId: clientOrganizationId,
    impersonatingOrgSlug: relationship.client.slug,
  })

  return Response.json({
    slug: relationship.client.slug,
    accessLevel,
  })
}
