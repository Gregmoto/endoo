/**
 * Endoo RBAC — Policy checker
 *
 * Single entry point for permission checks throughout the app.
 *
 * Usage:
 *   can(ctx, "invoices:create")          // boolean
 *   canOrThrow(ctx, "invoices:void")     // throws UnauthorizedError
 *   canAll(ctx, ["invoices:read", "invoices:send"])
 *   canAny(ctx, ["users:invite", "users:update_role"])
 */

import { ROLE_PERMISSIONS, ACCESS_LEVEL_ALLOWED_PERMISSIONS } from "./roles"
import type { RBACContext } from "./context"
import type { Permission } from "./permissions"

// ─────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────

export class UnauthorizedError extends Error {
  readonly permission: Permission
  readonly role: string

  constructor(permission: Permission, role: string) {
    super(`Role "${role}" does not have permission "${permission}"`)
    this.name = "UnauthorizedError"
    this.permission = permission
    this.role = role
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated")
    this.name = "UnauthenticatedError"
  }
}

// ─────────────────────────────────────────────
// Core check
// ─────────────────────────────────────────────

/**
 * Returns true if the context has the given permission.
 *
 * For agency staff impersonating a client, the permission must exist
 * in BOTH the staff's role permissions AND the access level grant.
 */
export function can(ctx: RBACContext, permission: Permission): boolean {
  const rolePerms = ROLE_PERMISSIONS[ctx.role]

  if (!rolePerms.has(permission)) return false

  // If impersonating a client, intersect with the access level
  if (ctx.impersonating) {
    const accessPerms = ACCESS_LEVEL_ALLOWED_PERMISSIONS[ctx.impersonating.accessLevel]
    return accessPerms.has(permission)
  }

  return true
}

/**
 * Throws UnauthorizedError if the context lacks the permission.
 */
export function canOrThrow(ctx: RBACContext, permission: Permission): void {
  if (!can(ctx, permission)) {
    throw new UnauthorizedError(permission, ctx.role)
  }
}

/**
 * Returns true only if ALL permissions pass.
 */
export function canAll(ctx: RBACContext, permissions: Permission[]): boolean {
  return permissions.every((p) => can(ctx, p))
}

/**
 * Returns true if ANY permission passes.
 */
export function canAny(ctx: RBACContext, permissions: Permission[]): boolean {
  return permissions.some((p) => can(ctx, p))
}

// ─────────────────────────────────────────────
// Convenience: list all effective permissions for a context
// Useful for seeding frontend permission maps.
// ─────────────────────────────────────────────

export function effectivePermissions(ctx: RBACContext): Permission[] {
  const rolePerms = ROLE_PERMISSIONS[ctx.role]

  if (!ctx.impersonating) {
    return [...rolePerms] as Permission[]
  }

  const accessPerms = ACCESS_LEVEL_ALLOWED_PERMISSIONS[ctx.impersonating.accessLevel]
  return ([...rolePerms] as Permission[]).filter((p) => accessPerms.has(p))
}

// ─────────────────────────────────────────────
// Resource ownership check
// Some resources have ownership rules beyond role:
// e.g. only the user who created a draft can delete it
// (unless admin+). Compose with can() in handlers.
// ─────────────────────────────────────────────

interface OwnedResource {
  organizationId: string
  createdByUserId?: string | null
}

/**
 * Returns true if the resource belongs to the context's org.
 * Always verify this alongside permission checks — prevents
 * cross-tenant data leakage even if RLS is disabled accidentally.
 */
export function belongsToOrg(ctx: RBACContext, resource: OwnedResource): boolean {
  return resource.organizationId === ctx.organizationId
}

/**
 * Returns true if the user owns the resource OR has an elevated role.
 */
export function canModifyOwned(
  ctx: RBACContext,
  resource: OwnedResource,
  adminRoles: readonly string[] = ["super_admin", "agency_owner", "agency_admin", "customer_owner", "customer_admin"]
): boolean {
  if (adminRoles.includes(ctx.role)) return true
  return resource.createdByUserId === ctx.userId
}
