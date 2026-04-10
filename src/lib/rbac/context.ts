/**
 * Endoo RBAC — Effective role context resolution
 *
 * Resolves which SystemRole a user has in the CURRENT request context.
 * The context depends on:
 *   1. Is the user a platform admin?
 *   2. What org are they acting in? (activeOrganizationId from session)
 *   3. Are they impersonating a client? (impersonatingOrganizationId)
 *   4. If agency staff impersonating, what access level do they have?
 */

import type { SystemRole } from "./roles"
import type { MemberRole, OrganizationType } from "@prisma/client"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface RBACContext {
  role: SystemRole
  organizationId: string
  userId: string
  /**
   * Set when an agency is acting on behalf of a client.
   * The permission set is intersected with the access level grant.
   */
  impersonating?: {
    clientId: string
    accessLevel: "full" | "invoicing_only" | "read_only"
  }
}

interface ResolveRoleInput {
  isPlatformAdmin: boolean
  orgType: OrganizationType
  memberRole: MemberRole
}

// ─────────────────────────────────────────────
// Derive SystemRole from DB values
// ─────────────────────────────────────────────

export function deriveRole({
  isPlatformAdmin,
  orgType,
  memberRole,
}: ResolveRoleInput): SystemRole {
  if (isPlatformAdmin) return "super_admin"

  if (orgType === "agency") {
    switch (memberRole) {
      case "owner":  return "agency_owner"
      case "admin":  return "agency_admin"
      case "member": return "agency_staff"
      case "viewer": return "agency_viewer"
    }
  }

  // orgType === "customer"
  switch (memberRole) {
    case "owner":  return "customer_owner"
    case "admin":  return "customer_admin"
    case "member": return "customer_user"
    case "viewer": return "customer_viewer"
  }
}

// ─────────────────────────────────────────────
// Build RBACContext from session data
// Called once per request in middleware / layout RSC
// ─────────────────────────────────────────────

interface BuildContextInput {
  userId: string
  isPlatformAdmin: boolean
  activeOrganizationId: string
  activeOrgType: OrganizationType
  memberRole: MemberRole
  impersonatingOrganizationId?: string | null
  agencyAccessLevel?: "full" | "invoicing_only" | "read_only" | null
}

export function buildRBACContext({
  userId,
  isPlatformAdmin,
  activeOrganizationId,
  activeOrgType,
  memberRole,
  impersonatingOrganizationId,
  agencyAccessLevel,
}: BuildContextInput): RBACContext {
  const role = deriveRole({ isPlatformAdmin, orgType: activeOrgType, memberRole })

  if (impersonatingOrganizationId) {
    return {
      role,
      organizationId: impersonatingOrganizationId,
      userId,
      impersonating: {
        clientId: impersonatingOrganizationId,
        accessLevel: agencyAccessLevel ?? "full",
      },
    }
  }

  return { role, organizationId: activeOrganizationId, userId }
}

// ─────────────────────────────────────────────
// Helper: is the context in impersonation mode?
// ─────────────────────────────────────────────

export function isImpersonating(ctx: RBACContext): boolean {
  return ctx.impersonating !== undefined
}

export function isAgencyRole(role: SystemRole): boolean {
  return role.startsWith("agency_")
}

export function isCustomerRole(role: SystemRole): boolean {
  return role.startsWith("customer_")
}
