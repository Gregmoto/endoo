import { describe, it, expect } from "vitest"
import { can, canOrThrow, canAll, canAny, effectivePermissions, belongsToOrg, canModifyOwned, UnauthorizedError } from "@/lib/rbac/policy"
import type { RBACContext } from "@/lib/rbac/context"

const ORG = "org-abc"
const USER = "user-123"

function ctx(role: RBACContext["role"], overrides?: Partial<RBACContext>): RBACContext {
  return { role, organizationId: ORG, userId: USER, ...overrides }
}

describe("can()", () => {
  it("super_admin has all permissions", () => {
    const c = ctx("super_admin")
    expect(can(c, "invoices:create")).toBe(true)
    expect(can(c, "platform:manage_orgs")).toBe(true)
    expect(can(c, "settings:delete_org")).toBe(true)
  })

  it("customer_viewer has only read permissions", () => {
    const c = ctx("customer_viewer")
    expect(can(c, "invoices:read")).toBe(true)
    expect(can(c, "invoices:create")).toBe(false)
    expect(can(c, "invoices:delete")).toBe(false)
    expect(can(c, "invoices:void")).toBe(false)
    expect(can(c, "settings:manage_billing")).toBe(false)
  })

  it("customer_user can create but not delete invoices", () => {
    const c = ctx("customer_user")
    expect(can(c, "invoices:create")).toBe(true)
    expect(can(c, "invoices:delete")).toBe(false)
    expect(can(c, "invoices:void")).toBe(false)
  })

  it("agency_staff cannot delete invoices or contacts", () => {
    const c = ctx("agency_staff")
    expect(can(c, "invoices:create")).toBe(true)
    expect(can(c, "invoices:delete")).toBe(false)
    expect(can(c, "contacts:delete")).toBe(false)
  })

  it("agency_viewer has only read permissions", () => {
    const c = ctx("agency_viewer")
    expect(can(c, "invoices:read")).toBe(true)
    expect(can(c, "invoices:create")).toBe(false)
    expect(can(c, "agency:read_clients")).toBe(true)
    expect(can(c, "agency:manage_clients")).toBe(false)
  })

  it("customer_owner has billing and delete_org", () => {
    const c = ctx("customer_owner")
    expect(can(c, "settings:manage_billing")).toBe(true)
    expect(can(c, "settings:delete_org")).toBe(true)
  })

  it("customer_admin does NOT have billing or delete_org", () => {
    const c = ctx("customer_admin")
    expect(can(c, "settings:manage_billing")).toBe(false)
    expect(can(c, "settings:delete_org")).toBe(false)
  })

  it("platform permissions are super_admin only", () => {
    expect(can(ctx("agency_owner"), "platform:manage_orgs")).toBe(false)
    expect(can(ctx("customer_owner"), "platform:impersonate_org")).toBe(false)
    expect(can(ctx("super_admin"), "platform:manage_orgs")).toBe(true)
  })
})

describe("can() — impersonation", () => {
  it("agency_owner with full access gets full invoice permissions", () => {
    const c = ctx("agency_owner", {
      organizationId: "client-org",
      impersonating: { clientId: "client-org", accessLevel: "full" },
    })
    expect(can(c, "invoices:create")).toBe(true)
    expect(can(c, "invoices:delete")).toBe(true)
    expect(can(c, "invoices:void")).toBe(true)
  })

  it("agency_staff with invoicing_only cannot delete invoices", () => {
    const c = ctx("agency_staff", {
      organizationId: "client-org",
      impersonating: { clientId: "client-org", accessLevel: "invoicing_only" },
    })
    expect(can(c, "invoices:read")).toBe(true)
    expect(can(c, "invoices:create")).toBe(true)
    expect(can(c, "invoices:delete")).toBe(false)
    expect(can(c, "invoices:void")).toBe(false)
  })

  it("agency_owner with read_only cannot create invoices", () => {
    const c = ctx("agency_owner", {
      organizationId: "client-org",
      impersonating: { clientId: "client-org", accessLevel: "read_only" },
    })
    expect(can(c, "invoices:read")).toBe(true)
    expect(can(c, "invoices:create")).toBe(false)
    expect(can(c, "contacts:read")).toBe(true)
    expect(can(c, "contacts:create")).toBe(false)
  })

  it("impersonation blocks settings:manage_billing regardless of access level", () => {
    // settings:manage_billing is not in any access level set
    const c = ctx("agency_owner", {
      organizationId: "client-org",
      impersonating: { clientId: "client-org", accessLevel: "full" },
    })
    expect(can(c, "settings:manage_billing")).toBe(false)
  })
})

describe("canOrThrow()", () => {
  it("does not throw when permission granted", () => {
    expect(() => canOrThrow(ctx("customer_owner"), "invoices:create")).not.toThrow()
  })

  it("throws UnauthorizedError with correct name when denied", () => {
    const err = (() => {
      try { canOrThrow(ctx("customer_viewer"), "invoices:create") }
      catch (e) { return e }
    })()
    expect(err).toBeInstanceOf(UnauthorizedError)
    expect((err as UnauthorizedError).name).toBe("UnauthorizedError")
    expect((err as UnauthorizedError).permission).toBe("invoices:create")
    expect((err as UnauthorizedError).role).toBe("customer_viewer")
  })
})

describe("canAll()", () => {
  it("returns true only when all permissions pass", () => {
    const c = ctx("agency_owner")
    expect(canAll(c, ["invoices:read", "invoices:create", "invoices:send"])).toBe(true)
    expect(canAll(c, ["invoices:read", "platform:manage_orgs"])).toBe(false)
  })

  it("returns false on empty array edge case — vacuously true", () => {
    expect(canAll(ctx("customer_viewer"), [])).toBe(true)
  })
})

describe("canAny()", () => {
  it("returns true when at least one permission passes", () => {
    const c = ctx("customer_viewer")
    expect(canAny(c, ["invoices:read", "invoices:create"])).toBe(true)
    expect(canAny(c, ["invoices:delete", "invoices:void"])).toBe(false)
  })
})

describe("effectivePermissions()", () => {
  it("returns all role permissions when not impersonating", () => {
    const perms = effectivePermissions(ctx("customer_owner"))
    expect(perms).toContain("invoices:create")
    expect(perms).toContain("settings:manage_billing")
  })

  it("returns intersected permissions when impersonating with read_only", () => {
    const c = ctx("agency_owner", {
      organizationId: "client",
      impersonating: { clientId: "client", accessLevel: "read_only" },
    })
    const perms = effectivePermissions(c)
    expect(perms).toContain("invoices:read")
    expect(perms).not.toContain("invoices:create")
    expect(perms).not.toContain("settings:manage_billing")
  })
})

describe("belongsToOrg()", () => {
  it("returns true when organizationId matches", () => {
    expect(belongsToOrg(ctx("customer_owner"), { organizationId: ORG })).toBe(true)
  })

  it("returns false when organizationId differs", () => {
    expect(belongsToOrg(ctx("customer_owner"), { organizationId: "other-org" })).toBe(false)
  })
})

describe("canModifyOwned()", () => {
  it("admin roles can modify any resource", () => {
    expect(canModifyOwned(ctx("customer_owner"), { organizationId: ORG, createdByUserId: "other" })).toBe(true)
    expect(canModifyOwned(ctx("agency_owner"), { organizationId: ORG, createdByUserId: "other" })).toBe(true)
  })

  it("non-admin can modify own resource", () => {
    const c = ctx("customer_user")
    expect(canModifyOwned(c, { organizationId: ORG, createdByUserId: USER })).toBe(true)
  })

  it("non-admin cannot modify others' resource", () => {
    const c = ctx("customer_user")
    expect(canModifyOwned(c, { organizationId: ORG, createdByUserId: "someone-else" })).toBe(false)
  })
})
