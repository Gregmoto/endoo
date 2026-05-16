import { describe, it, expect } from "vitest"
import { deriveRole, buildRBACContext, isImpersonating, isAgencyRole, isCustomerRole } from "@/lib/rbac/context"

describe("deriveRole()", () => {
  it("isPlatformAdmin always returns super_admin", () => {
    expect(deriveRole({ isPlatformAdmin: true, orgType: "customer", memberRole: "viewer" })).toBe("super_admin")
    expect(deriveRole({ isPlatformAdmin: true, orgType: "agency",   memberRole: "member" })).toBe("super_admin")
  })

  it("agency org maps member roles correctly", () => {
    expect(deriveRole({ isPlatformAdmin: false, orgType: "agency", memberRole: "owner"  })).toBe("agency_owner")
    expect(deriveRole({ isPlatformAdmin: false, orgType: "agency", memberRole: "admin"  })).toBe("agency_admin")
    expect(deriveRole({ isPlatformAdmin: false, orgType: "agency", memberRole: "member" })).toBe("agency_staff")
    expect(deriveRole({ isPlatformAdmin: false, orgType: "agency", memberRole: "viewer" })).toBe("agency_viewer")
  })

  it("customer org maps member roles correctly", () => {
    expect(deriveRole({ isPlatformAdmin: false, orgType: "customer", memberRole: "owner"  })).toBe("customer_owner")
    expect(deriveRole({ isPlatformAdmin: false, orgType: "customer", memberRole: "admin"  })).toBe("customer_admin")
    expect(deriveRole({ isPlatformAdmin: false, orgType: "customer", memberRole: "member" })).toBe("customer_user")
    expect(deriveRole({ isPlatformAdmin: false, orgType: "customer", memberRole: "viewer" })).toBe("customer_viewer")
  })
})

describe("buildRBACContext()", () => {
  const base = {
    userId: "u-1",
    isPlatformAdmin: false,
    activeOrganizationId: "org-a",
    activeOrgType: "customer" as const,
    memberRole: "owner" as const,
  }

  it("builds a plain context without impersonation", () => {
    const ctx = buildRBACContext(base)
    expect(ctx.role).toBe("customer_owner")
    expect(ctx.organizationId).toBe("org-a")
    expect(ctx.userId).toBe("u-1")
    expect(ctx.impersonating).toBeUndefined()
  })

  it("sets organizationId to the impersonated org when impersonating", () => {
    const ctx = buildRBACContext({
      ...base,
      activeOrgType: "agency",
      memberRole: "admin",
      impersonatingOrganizationId: "client-org",
      agencyAccessLevel: "invoicing_only",
    })
    expect(ctx.role).toBe("agency_admin")
    expect(ctx.organizationId).toBe("client-org")
    expect(ctx.impersonating?.clientId).toBe("client-org")
    expect(ctx.impersonating?.accessLevel).toBe("invoicing_only")
  })

  it("defaults accessLevel to full when not specified", () => {
    const ctx = buildRBACContext({
      ...base,
      activeOrgType: "agency",
      memberRole: "owner",
      impersonatingOrganizationId: "client-org",
    })
    expect(ctx.impersonating?.accessLevel).toBe("full")
  })

  it("super_admin context has super_admin role", () => {
    const ctx = buildRBACContext({ ...base, isPlatformAdmin: true })
    expect(ctx.role).toBe("super_admin")
  })
})

describe("isImpersonating()", () => {
  it("returns false for normal context", () => {
    expect(isImpersonating({ role: "customer_owner", organizationId: "o", userId: "u" })).toBe(false)
  })

  it("returns true when impersonating is set", () => {
    expect(isImpersonating({
      role: "agency_owner",
      organizationId: "client",
      userId: "u",
      impersonating: { clientId: "client", accessLevel: "full" },
    })).toBe(true)
  })
})

describe("isAgencyRole / isCustomerRole", () => {
  it("correctly classifies agency roles", () => {
    expect(isAgencyRole("agency_owner")).toBe(true)
    expect(isAgencyRole("agency_viewer")).toBe(true)
    expect(isAgencyRole("customer_owner")).toBe(false)
    expect(isAgencyRole("super_admin")).toBe(false)
  })

  it("correctly classifies customer roles", () => {
    expect(isCustomerRole("customer_viewer")).toBe(true)
    expect(isCustomerRole("customer_owner")).toBe(true)
    expect(isCustomerRole("agency_staff")).toBe(false)
    expect(isCustomerRole("super_admin")).toBe(false)
  })
})
