import { describe, it, expect } from "vitest"
import { can, belongsToOrg, canModifyOwned } from "@/lib/rbac/policy"
import type { RBACContext } from "@/lib/rbac/context"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORG_A  = "aaaaaaaa-0000-0000-0000-000000000001"
const ORG_B  = "bbbbbbbb-0000-0000-0000-000000000002"
const USER_1 = "user-0000-0000-0000-000000000001"
const USER_2 = "user-0000-0000-0000-000000000002"

function ctx(
  role: RBACContext["role"],
  orgId: string = ORG_A,
  userId: string = USER_1
): RBACContext {
  return { role, organizationId: orgId, userId }
}

// ─── Tenant boundary: belongsToOrg ────────────────────────────────────────────

describe("tenant boundary — belongsToOrg()", () => {
  it("allows access when org matches", () => {
    expect(belongsToOrg(ctx("customer_owner", ORG_A), { organizationId: ORG_A })).toBe(true)
  })

  it("blocks access when org does not match", () => {
    expect(belongsToOrg(ctx("customer_owner", ORG_A), { organizationId: ORG_B })).toBe(false)
  })

  it("super_admin still returns false for mismatched org (use separate platform check)", () => {
    // belongsToOrg only checks the organizationId field — not the role.
    // Platform admin routes have their own guard.
    expect(belongsToOrg(ctx("super_admin", ORG_A), { organizationId: ORG_B })).toBe(false)
  })

  it("blocks empty string org from matching any real org", () => {
    expect(belongsToOrg(ctx("customer_owner", ""), { organizationId: ORG_A })).toBe(false)
  })

  it("blocks null-ish org from matching", () => {
    // @ts-expect-error — testing runtime safety with unexpected input
    expect(belongsToOrg(ctx("customer_owner", ORG_A), { organizationId: null })).toBe(false)
  })
})

// ─── Ownership isolation: canModifyOwned ─────────────────────────────────────

describe("ownership isolation — canModifyOwned()", () => {
  it("owner can modify any resource in their org", () => {
    expect(canModifyOwned(ctx("customer_owner"), { organizationId: ORG_A, createdByUserId: USER_2 })).toBe(true)
  })

  it("regular user can modify their own resource", () => {
    expect(canModifyOwned(ctx("customer_user"), { organizationId: ORG_A, createdByUserId: USER_1 })).toBe(true)
  })

  it("regular user cannot modify another user's resource", () => {
    expect(canModifyOwned(ctx("customer_user"), { organizationId: ORG_A, createdByUserId: USER_2 })).toBe(false)
  })

  it("regular user cannot modify resource from another org even if userId matches", () => {
    // The org check happens at the Prisma query level; canModifyOwned handles ownership.
    // Here we simulate: same userId, wrong org — org check must be done separately.
    expect(canModifyOwned(ctx("customer_user", ORG_A), { organizationId: ORG_B, createdByUserId: USER_1 })).toBe(true)
    // The CALLER must also call belongsToOrg() — these compose, not replace each other.
    expect(belongsToOrg(ctx("customer_user", ORG_A), { organizationId: ORG_B })).toBe(false)
  })

  it("viewer owns resource → canModifyOwned is true, but write perm is still denied", () => {
    // canModifyOwned checks OWNERSHIP, not write permission.
    // The caller must also call can(ctx, 'invoices:update') to enforce the role.
    expect(canModifyOwned(ctx("customer_viewer"), { organizationId: ORG_A, createdByUserId: USER_1 })).toBe(true)
    expect(can(ctx("customer_viewer"), "invoices:update")).toBe(false)
  })
})

// ─── Cross-org permission matrix ──────────────────────────────────────────────

describe("cross-org permission checks", () => {
  it("customer_owner in org A cannot claim permissions in org B context", () => {
    const ctxA = ctx("customer_owner", ORG_A)
    // Permissions are role-based, not org-based — but the org in context is ORG_A.
    // The Prisma queries use ctx.organizationId to scope data — verified by belongsToOrg.
    expect(can(ctxA, "invoices:create")).toBe(true)
    expect(belongsToOrg(ctxA, { organizationId: ORG_B })).toBe(false)
  })

  it("agency_staff impersonating client org gets client org id", () => {
    const impersonatingCtx: RBACContext = {
      role:           "agency_staff",
      organizationId: ORG_B,   // <-- set to client org during impersonation
      userId:         USER_1,
      impersonating:  { clientId: ORG_B, accessLevel: "full" },
    }
    expect(impersonatingCtx.organizationId).toBe(ORG_B)
    expect(can(impersonatingCtx, "invoices:create")).toBe(true)
    expect(can(impersonatingCtx, "settings:manage_billing")).toBe(false)
  })

  it("impersonating one client does not grant access to another client's data", () => {
    const ORG_C = "cccccccc-0000-0000-0000-000000000003"
    const impersonatingCtx: RBACContext = {
      role:           "agency_owner",
      organizationId: ORG_B,
      userId:         USER_1,
      impersonating:  { clientId: ORG_B, accessLevel: "full" },
    }
    // Data belonging to org C is blocked by belongsToOrg check
    expect(belongsToOrg(impersonatingCtx, { organizationId: ORG_C })).toBe(false)
    expect(belongsToOrg(impersonatingCtx, { organizationId: ORG_B })).toBe(true)
  })
})

// ─── Permission denial guards ─────────────────────────────────────────────────

describe("permission denial for restricted actions", () => {
  const WRITE_PERMISSIONS = [
    "invoices:create", "invoices:update", "invoices:delete",
    "contacts:create", "contacts:update", "contacts:delete",
    "products:create", "products:update",
    "settings:update",
  ] as const

  it("customer_viewer is denied all write permissions", () => {
    const c = ctx("customer_viewer")
    for (const perm of WRITE_PERMISSIONS) {
      expect(can(c, perm)).toBe(false)
    }
  })

  it("agency_viewer is denied all write permissions", () => {
    const c = ctx("agency_viewer")
    for (const perm of WRITE_PERMISSIONS) {
      expect(can(c, perm)).toBe(false)
    }
  })

  it("no non-super_admin role can access platform permissions", () => {
    const roles: RBACContext["role"][] = [
      "customer_owner", "customer_admin", "customer_user", "customer_viewer",
      "agency_owner",   "agency_admin",   "agency_staff",  "agency_viewer",
    ]
    for (const role of roles) {
      expect(can(ctx(role), "platform:manage_orgs")).toBe(false)
      expect(can(ctx(role), "platform:impersonate_org")).toBe(false)
    }
  })
})
