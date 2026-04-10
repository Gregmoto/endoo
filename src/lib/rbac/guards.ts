/**
 * Endoo RBAC — Server-side guards
 *
 * Used in:
 *   - Next.js Route Handlers (API routes)
 *   - Server Actions
 *   - React Server Components (layout / page level)
 *
 * Pattern:
 *   const ctx = await requireAuth()          // throws if unauthenticated
 *   requirePermission(ctx, "invoices:create") // throws if unauthorized
 *
 * These functions throw structured errors that are caught either by
 * Next.js error boundaries or the API response layer.
 */

import { auth } from "@/lib/auth"         // NextAuth session helper — created in auth setup
import { prisma } from "@/lib/prisma"     // Prisma client singleton
import { buildRBACContext, type RBACContext } from "./context"
import { canOrThrow, UnauthenticatedError, UnauthorizedError } from "./policy"
import type { Permission } from "./permissions"

// ─────────────────────────────────────────────
// requireAuth — load full RBAC context from session
// ─────────────────────────────────────────────

/**
 * Loads the session and resolves the full RBACContext.
 * Throws UnauthenticatedError if no valid session exists.
 *
 * Call once per request at the top of a handler / RSC.
 */
export async function requireAuth(): Promise<RBACContext> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new UnauthenticatedError()
  }

  const userId = session.user.id
  const activeOrgId = session.activeOrganizationId
  const impersonatingOrgId = session.impersonatingOrganizationId ?? null

  if (!activeOrgId) {
    throw new UnauthenticatedError() // No org context in session
  }

  // Resolve the org the user is *acting in*
  // If impersonating, we still load the agency membership for role derivation
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: activeOrgId,
        userId,
      },
    },
    include: {
      organization: { select: { type: true } },
      user: { select: { isPlatformAdmin: true } },
    },
  })

  if (!membership) {
    throw new UnauthenticatedError()
  }

  let agencyAccessLevel: "full" | "invoicing_only" | "read_only" | null = null

  if (impersonatingOrgId) {
    // For non-owner agency staff, check explicit grant
    if (membership.role !== "owner" && membership.role !== "admin") {
      const grant = await prisma.agencyStaffAccess.findUnique({
        where: {
          agencyMemberId_clientId: {
            agencyMemberId: membership.id,
            clientId: impersonatingOrgId,
          },
        },
      })

      if (!grant || grant.revokedAt) {
        throw new UnauthorizedError("agency:switch_to_client", "agency_staff")
      }

      agencyAccessLevel = grant.accessLevel as typeof agencyAccessLevel
    } else {
      agencyAccessLevel = "full"
    }
  }

  return buildRBACContext({
    userId,
    isPlatformAdmin: membership.user.isPlatformAdmin,
    activeOrganizationId: activeOrgId,
    activeOrgType: membership.organization.type,
    memberRole: membership.role,
    impersonatingOrganizationId: impersonatingOrgId,
    agencyAccessLevel,
  })
}

// ─────────────────────────────────────────────
// requirePermission — guard a single action
// ─────────────────────────────────────────────

export function requirePermission(ctx: RBACContext, permission: Permission): void {
  canOrThrow(ctx, permission)
}

// ─────────────────────────────────────────────
// withPermission — wraps a handler with auth + permission check
//
// Usage in Route Handler:
//   export const POST = withPermission(
//     "invoices:create",
//     async (req, ctx) => { ... }
//   )
// ─────────────────────────────────────────────

type RouteHandler = (
  req: Request,
  ctx: RBACContext
) => Promise<Response>

export function withPermission(
  permission: Permission,
  handler: RouteHandler
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      const ctx = await requireAuth()
      requirePermission(ctx, permission)
      return handler(req, ctx)
    } catch (err) {
      if (err instanceof UnauthenticatedError) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (err instanceof UnauthorizedError) {
        return Response.json({ error: "Forbidden", detail: err.message }, { status: 403 })
      }
      throw err
    }
  }
}

// ─────────────────────────────────────────────
// requireOrgMembership — verify user is a member of a specific org
// Use this when the org slug comes from the URL params.
// ─────────────────────────────────────────────

export async function requireOrgMembership(
  userId: string,
  orgSlug: string
): Promise<{ organizationId: string }> {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  })

  if (!org) {
    throw new Error("Organization not found")
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId,
      },
    },
  })

  if (!membership || membership.deletedAt) {
    throw new UnauthenticatedError()
  }

  return { organizationId: org.id }
}

// ─────────────────────────────────────────────
// requireSuperAdmin — for platform admin routes only
// ─────────────────────────────────────────────

export async function requireSuperAdmin(): Promise<RBACContext> {
  const ctx = await requireAuth()
  if (ctx.role !== "super_admin") {
    throw new UnauthorizedError("platform:manage_orgs", ctx.role)
  }
  return ctx
}
