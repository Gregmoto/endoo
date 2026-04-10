/**
 * POST /api/auth/switch-org
 *
 * Switches the active organization in the JWT.
 * Used when a user belongs to multiple orgs (personal + agency, etc.)
 *
 * Validates:
 *   - User is authenticated
 *   - Target org exists and is active
 *   - User is a member of target org
 *   - Not switching to the impersonated org (use /impersonate for that)
 *
 * On success:
 *   - Patches the JWT via unstable_update()
 *   - Clears any impersonation context
 *   - Writes audit log in BOTH orgs (left + joined)
 *   - Returns { slug } for client-side redirect to /app/[slug]
 */

import { auth, unstable_update } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/tenant-db"
import { buildRBACContext, deriveRole } from "@/lib/rbac/context"
import { UnauthenticatedError } from "@/lib/rbac/policy"
import { z } from "zod"

const SwitchOrgBody = z.object({
  organizationId: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = SwitchOrgBody.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const { organizationId: targetOrgId } = parsed.data
    const userId = session.user.id

    // Validate membership in target org
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: targetOrgId, userId },
      },
      include: {
        organization: {
          select: { id: true, slug: true, type: true, isActive: true },
        },
        user: { select: { isPlatformAdmin: true } },
      },
    })

    if (!membership || membership.deletedAt || !membership.organization.isActive) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const previousOrgId = session.activeOrganizationId
    const previousOrgSlug = session.activeOrgSlug
    const { organization, user: memberUser } = membership

    // Write audit log in the org being LEFT
    if (previousOrgId && previousOrgId !== targetOrgId) {
      const prevMembership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId: previousOrgId, userId },
        },
        include: {
          organization: { select: { type: true } },
          user: { select: { isPlatformAdmin: true } },
        },
      })

      if (prevMembership) {
        const prevCtx = buildRBACContext({
          userId,
          isPlatformAdmin: memberUser.isPlatformAdmin,
          activeOrganizationId: previousOrgId,
          activeOrgType: prevMembership.organization.type,
          memberRole: prevMembership.role,
        })
        await writeAuditLog({
          ctx: prevCtx,
          action: "account_switch",
          meta: {
            direction: "left",
            fromOrgId: previousOrgId,
            fromOrgSlug: previousOrgSlug,
            toOrgId: targetOrgId,
            toOrgSlug: organization.slug,
          },
          ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        })
      }
    }

    // Build new context and write audit log in the org being ENTERED
    const newCtx = buildRBACContext({
      userId,
      isPlatformAdmin: memberUser.isPlatformAdmin,
      activeOrganizationId: organization.id,
      activeOrgType: organization.type,
      memberRole: membership.role,
    })

    await writeAuditLog({
      ctx: newCtx,
      action: "account_switch",
      meta: {
        direction: "entered",
        fromOrgId: previousOrgId ?? null,
        fromOrgSlug: previousOrgSlug ?? null,
        toOrgId: organization.id,
        toOrgSlug: organization.slug,
        role: deriveRole({
          isPlatformAdmin: memberUser.isPlatformAdmin,
          orgType: organization.type,
          memberRole: membership.role,
        }),
      },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    })

    // Patch the JWT — clears impersonation context
    await unstable_update({
      activeOrganizationId: organization.id,
      activeOrgSlug: organization.slug,
      impersonatingOrganizationId: undefined,
      impersonatingOrgSlug: undefined,
    })

    return Response.json({ slug: organization.slug })
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("[switch-org]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
