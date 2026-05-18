/**
 * Tenant Isolation Security Tests
 *
 * Verifies that no route leaks data across organization boundaries.
 *
 * Strategy:
 *   - Mock requireAuth() to return Org A's RBAC context
 *   - Configure Prisma mocks as "oracle" — returns a resource ONLY when queried
 *     without organizationId or with Org B's id (simulates missing isolation)
 *   - Call route handlers directly
 *   - Assert 404 / empty arrays — and that the response body contains NONE of
 *     Org B's identifying strings
 *
 * A failing test means a route returned Org B's data to an Org A caller.
 */

import { vi, describe, it, expect, beforeEach, type Mock } from "vitest"

// ── vi.hoisted: runs before module resolution, result shared with vi.mock ────

const mockPrisma = vi.hoisted(() => {
  function modelMock() {
    return {
      findFirst:   vi.fn().mockResolvedValue(null),
      findUnique:  vi.fn().mockResolvedValue(null),
      findMany:    vi.fn().mockResolvedValue([]),
      create:      vi.fn().mockResolvedValue({ id: "mock-created" }),
      update:      vi.fn().mockResolvedValue({ id: "mock-updated" }),
      upsert:      vi.fn().mockResolvedValue({ id: "mock-upserted" }),
      delete:      vi.fn().mockResolvedValue({ id: "mock-deleted" }),
      count:       vi.fn().mockResolvedValue(0),
      deleteMany:  vi.fn().mockResolvedValue({ count: 0 }),
      updateMany:  vi.fn().mockResolvedValue({ count: 0 }),
      createMany:  vi.fn().mockResolvedValue({ count: 0 }),
      aggregate:   vi.fn().mockResolvedValue({ _sum: {}, _count: {}, _avg: {}, _min: {}, _max: {} }),
      groupBy:     vi.fn().mockResolvedValue([]),
    }
  }
  const m = {
    invoice: modelMock(), contact: modelMock(), contactPerson: modelMock(),
    product: modelMock(), journal: modelMock(), journalEntry: modelMock(),
    accountingAccount: modelMock(), accountingPeriod: modelMock(),
    payment: modelMock(), quote: modelMock(), contract: modelMock(),
    supplierInvoice: modelMock(), supplier: modelMock(),
    webhook: modelMock(), webhookEndpoint: modelMock(), webhookEvent: modelMock(),
    apiKey: modelMock(), auditLog: modelMock(), activityFeedItem: modelMock(),
    emailDelivery: modelMock(), emailSuppression: modelMock(),
    notification: modelMock(), notificationJob: modelMock(),
    task: modelMock(), inventory: modelMock(), inventoryItem: modelMock(),
    inventoryTransaction: modelMock(), analyticsSnapshot: modelMock(),
    searchIndex: modelMock(), accountMapping: modelMock(),
    taxPeriod: modelMock(), dimension: modelMock(), dimensionAxis: modelMock(),
    dimensionValue: modelMock(), approvalPolicy: modelMock(), approvalRequest: modelMock(),
    signature: modelMock(), integration: modelMock(), syncJob: modelMock(),
    receipt: modelMock(), emailDomainVerification: modelMock(),
    portalMagicToken: modelMock(), recurringInvoice: modelMock(),
    organization: modelMock(), user: modelMock(), organizationMember: modelMock(),
    schemaVersion: modelMock(), agencyStaffAccess: modelMock(),
    agencyClientPin: modelMock(), subscription: modelMock(), invitation: modelMock(),
    $transaction: vi.fn().mockImplementation((fn: unknown) => {
      if (typeof fn === "function") return fn(m)
      return Promise.all(fn as Promise<unknown>[])
    }),
    $queryRaw:   vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(0),
    $disconnect: vi.fn(),
  }
  return m
})

// ── Mocks must be declared before any imports that trigger module resolution ──

vi.mock("@/lib/rbac/guards", () => ({
  requireAuth:          vi.fn(),
  requirePermission:    vi.fn(),
  requireSuperAdmin:    vi.fn(),
  requireOrgMembership: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

vi.mock("@/lib/plans/guard", () => ({
  getOrgPlan:       vi.fn().mockResolvedValue("pro"),
  enforceLimit:     vi.fn().mockResolvedValue(undefined),
  enforceFeature:   vi.fn().mockResolvedValue(undefined),
  PlanLimitError:   class PlanLimitError extends Error { requiredPlan = "pro" },
}))

vi.mock("@/lib/search/index-entity", () => ({
  indexInvoice:   vi.fn(),
  indexContact:   vi.fn(),
  indexProduct:   vi.fn(),
  removeFromIndex: vi.fn(),
}))

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
}))

vi.mock("@/lib/pdf/generate", () => ({
  generateInvoicePdf: vi.fn().mockResolvedValue(Buffer.from("pdf")),
  generateQuotePdf:   vi.fn().mockResolvedValue(Buffer.from("pdf")),
}))

// Mock the JSX PDF component directly — @react-pdf/renderer uses JSX that
// vitest's node environment can't parse without explicit JSX transform config.
vi.mock("@/lib/pdf/invoice-pdf", () => ({ default: null, InvoicePDF: vi.fn() }))
vi.mock("@/lib/pdf/quote-pdf",   () => ({ default: null, QuotePDF:   vi.fn() }))
vi.mock("@react-pdf/renderer",   () => ({ renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf")), Document: vi.fn(), Page: vi.fn(), View: vi.fn(), Text: vi.fn(), StyleSheet: { create: vi.fn() } }))

// Mock withApiAuth so v1 routes can be tested without a real API key in DB.
// We inject Org A's context directly, simulating a valid key for Org A.
vi.mock("@/lib/api/auth", () => ({
  withApiAuth: vi.fn().mockImplementation((_scope: string, handler: (req: Request, ctx: { organizationId: string; apiKeyId: string; scopes: string[]; environment: string }) => Promise<Response>) => {
    return (req: Request) => handler(req, {
      organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      apiKeyId:       "key-a-test",
      scopes:         ["*"],
      environment:    "live",
    })
  }),
}))

vi.mock("@/lib/portal/auth", () => ({
  requirePortalAuth: vi.fn(),
  portalUnauthorized: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
  PORTAL_COOKIE: "portal_session",
}))

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { NextRequest }       from "next/server"
import { requireAuth }       from "@/lib/rbac/guards"
import { requirePortalAuth } from "@/lib/portal/auth"

import {
  ORG_A, ORG_B,
  B,
  orgBContact, orgBInvoice, orgBProduct, orgBQuote, orgBJournal, orgBPayment,
  FORBIDDEN_STRINGS,
} from "./fixtures"

import { makeCtx, makeReq, makeJsonReq, assertNoLeak, seedOrgBResource } from "./helpers"

// ── Convenience aliases ───────────────────────────────────────────────────────

const mockRequireAuth = requireAuth as Mock
const db = mockPrisma

function asOrgA() { mockRequireAuth.mockResolvedValue(makeCtx(ORG_A)) }

beforeEach(() => {
  vi.clearAllMocks()
  asOrgA()
})

// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Contacts — tenant isolation", () => {
  it("GET /api/contacts — search matching Org B name returns empty list", async () => {
    // Oracle: findMany returns Org B contacts ONLY when no organizationId filter
    db.contact.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBContact])
      }
      return Promise.resolve([])
    })
    db.contact.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/contacts/route")
    const res = await GET(makeReq(`/api/contacts?search=${encodeURIComponent(B.CONTACT_NAME)}`))

    expect(res.status).toBe(200)
    await assertNoLeak(res, FORBIDDEN_STRINGS)
    const body = await res.json()
    expect(body.contacts ?? body).toHaveLength(0)
  })

  it("GET /api/contacts/:id — returns 404 for Org B's contact", async () => {
    seedOrgBResource(db.contact, orgBContact, ORG_B)

    const { GET } = await import("@/app/api/contacts/[id]/route")
    const res = await GET(
      makeReq(`/api/contacts/${B.CONTACT_ID}`),
      { params: Promise.resolve({ id: B.CONTACT_ID }) }
    )

    expect(res.status).toBe(404)
    await assertNoLeak(res, FORBIDDEN_STRINGS)
  })

  it("PATCH /api/contacts/:id — cannot update Org B's contact", async () => {
    seedOrgBResource(db.contact, orgBContact, ORG_B)

    const { PATCH } = await import("@/app/api/contacts/[id]/route")
    const res = await PATCH(
      makeJsonReq(`/api/contacts/${B.CONTACT_ID}`, { name: "Hijacked" }, "PATCH"),
      { params: Promise.resolve({ id: B.CONTACT_ID }) }
    )

    expect(res.status).toBe(404)
    // update must NOT have been called for Org B's contact
    expect(db.contact.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: B.CONTACT_ID }) })
    )
  })

  it("DELETE /api/contacts/:id — cannot soft-delete Org B's contact", async () => {
    seedOrgBResource(db.contact, orgBContact, ORG_B)

    const { DELETE } = await import("@/app/api/contacts/[id]/route")
    const res = await DELETE(
      makeReq(`/api/contacts/${B.CONTACT_ID}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: B.CONTACT_ID }) }
    )

    expect(res.status).toBe(404)
    expect(db.contact.update).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────────────────────

describe("Invoices — tenant isolation", () => {
  it("GET /api/invoices — list returns empty for Org A (no cross-org leak)", async () => {
    db.invoice.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBInvoice])
      }
      return Promise.resolve([])
    })
    db.invoice.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/invoices/route")
    const res = await GET(makeReq("/api/invoices"))

    expect(res.status).toBe(200)
    await assertNoLeak(res, [B.INVOICE_NUMBER, B.INVOICE_ID, ORG_B])
    const body = await res.json()
    expect(body.invoices ?? body).toHaveLength(0)
  })

  it("GET /api/invoices?contactId= — filter by Org B's contactId returns empty", async () => {
    db.invoice.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBInvoice])
      }
      return Promise.resolve([])
    })
    db.invoice.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/invoices/route")
    const res = await GET(makeReq(`/api/invoices?contactId=${B.CONTACT_ID}`))

    expect(res.status).toBe(200)
    await assertNoLeak(res, FORBIDDEN_STRINGS)
    const body = await res.json()
    expect(body.invoices ?? body).toHaveLength(0)
  })

  it("GET /api/invoices/:id — returns 404 for Org B's invoice", async () => {
    seedOrgBResource(db.invoice, orgBInvoice, ORG_B)

    const { GET } = await import("@/app/api/invoices/[id]/route")
    const res = await GET(
      makeReq(`/api/invoices/${B.INVOICE_ID}`),
      { params: Promise.resolve({ id: B.INVOICE_ID }) }
    )

    expect(res.status).toBe(404)
    await assertNoLeak(res, FORBIDDEN_STRINGS)
  })

  it("GET /api/invoices/:id/pdf — cannot download Org B's invoice PDF", async () => {
    seedOrgBResource(db.invoice, orgBInvoice, ORG_B)

    const { GET } = await import("@/app/api/invoices/[id]/pdf/route")
    const res = await GET(
      makeReq(`/api/invoices/${B.INVOICE_ID}/pdf`),
      { params: Promise.resolve({ id: B.INVOICE_ID }) }
    )

    expect(res.status).toBe(404)
  })

  it("GET /api/invoices/:id/payments — cannot list Org B's invoice payments", async () => {
    seedOrgBResource(db.invoice, orgBInvoice, ORG_B)

    const { GET } = await import("@/app/api/invoices/[id]/payments/route")
    const res = await GET(
      makeReq(`/api/invoices/${B.INVOICE_ID}/payments`),
      { params: Promise.resolve({ id: B.INVOICE_ID }) }
    )

    // 404 (invoice not found for org A) OR 200 with empty array — never Org B data
    if (res.status === 200) {
      await assertNoLeak(res, FORBIDDEN_STRINGS)
      const body = await res.json()
      expect(body.payments ?? body).toHaveLength(0)
    } else {
      expect(res.status).toBe(404)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Products — tenant isolation", () => {
  it("GET /api/products — list returns empty for Org A", async () => {
    db.product.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBProduct])
      }
      return Promise.resolve([])
    })
    db.product.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/products/route")
    const res = await GET(makeReq("/api/products"))

    expect(res.status).toBe(200)
    await assertNoLeak(res, ["Org B Hemlig Produkt", B.PRODUCT_ID])
  })

  it("GET /api/products/:id — returns 404 for Org B's product", async () => {
    seedOrgBResource(db.product, orgBProduct, ORG_B)

    const { GET } = await import("@/app/api/products/[id]/route")
    const res = await GET(
      makeReq(`/api/products/${B.PRODUCT_ID}`),
      { params: Promise.resolve({ id: B.PRODUCT_ID }) }
    )

    expect(res.status).toBe(404)
  })

  it("PATCH /api/products/:id — cannot update Org B's product", async () => {
    seedOrgBResource(db.product, orgBProduct, ORG_B)

    const { PATCH } = await import("@/app/api/products/[id]/route")
    const res = await PATCH(
      makeJsonReq(`/api/products/${B.PRODUCT_ID}`, { name: "Hijacked" }, "PATCH"),
      { params: Promise.resolve({ id: B.PRODUCT_ID }) }
    )

    expect(res.status).toBe(404)
    expect(db.product.update).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES
// ─────────────────────────────────────────────────────────────────────────────

describe("Quotes — tenant isolation", () => {
  it("GET /api/quotes — list returns empty for Org A", async () => {
    db.quote.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBQuote])
      }
      return Promise.resolve([])
    })
    db.quote.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/quotes/route")
    const res = await GET(makeReq("/api/quotes"))

    expect(res.status).toBe(200)
    await assertNoLeak(res, [B.QUOTE_ID, ORG_B, "ORG-B-Q"])
  })

  it("GET /api/quotes/:id — returns 404 for Org B's quote", async () => {
    seedOrgBResource(db.quote, orgBQuote, ORG_B)

    const { GET } = await import("@/app/api/quotes/[id]/route")
    const res = await GET(
      makeReq(`/api/quotes/${B.QUOTE_ID}`),
      { params: Promise.resolve({ id: B.QUOTE_ID }) }
    )

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// JOURNALS (Accounting)
// ─────────────────────────────────────────────────────────────────────────────

describe("Journals — tenant isolation", () => {
  it("GET /api/journals — list returns empty for Org A", async () => {
    db.journal.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBJournal])
      }
      return Promise.resolve([])
    })
    db.journal.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/journals/route")
    const res = await GET(new NextRequest("http://test/api/journals"))

    expect(res.status).toBe(200)
    await assertNoLeak(res, [B.JOURNAL_ID, "Org B Secret Journal"])
  })

  it("GET /api/journals/:id — returns 404 for Org B's journal", async () => {
    seedOrgBResource(db.journal, orgBJournal, ORG_B)

    const { GET } = await import("@/app/api/journals/[id]/route")
    const res = await GET(
      new NextRequest(`http://test/api/journals/${B.JOURNAL_ID}`),
      { params: Promise.resolve({ id: B.JOURNAL_ID }) }
    )

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Payments — tenant isolation", () => {
  it("POST /api/invoices/:id/payments — cannot record payment on Org B's invoice", async () => {
    seedOrgBResource(db.invoice, orgBInvoice, ORG_B)

    const { POST } = await import("@/app/api/invoices/[id]/payments/route")
    const res = await POST(
      makeJsonReq(`/api/invoices/${B.INVOICE_ID}/payments`, {
        amount: "500000", currency: "SEK", paidAt: "2026-05-18",
      }),
      { params: Promise.resolve({ id: B.INVOICE_ID }) }
    )

    expect(res.status).toBe(404)
    expect(db.payment.create).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH — cross-tenant query leak
// ─────────────────────────────────────────────────────────────────────────────

describe("Search — cross-tenant query leak", () => {
  it("GET /api/search — full-text search does not return Org B results", async () => {
    db.searchIndex.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([{
          id: "si-1", organizationId: ORG_B,
          entityType: "contact", entityId: B.CONTACT_ID,
          content: B.CONTACT_NAME,
        }])
      }
      return Promise.resolve([])
    })

    const { GET } = await import("@/app/api/search/route")
    const res = await GET(new NextRequest(`http://test/api/search?q=${encodeURIComponent(B.CONTACT_NAME)}`))

    expect(res.status).toBe(200)
    await assertNoLeak(res, [B.CONTACT_ID, B.CONTACT_NAME, ORG_B])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS / AGGREGATES
// ─────────────────────────────────────────────────────────────────────────────

describe("Reports — aggregate data isolation", () => {
  it("GET /api/reports/income-statement — never includes Org B figures", async () => {
    db.journalEntry.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([{ id: "je-b", organizationId: ORG_B, amount: BigInt(999999) }])
      }
      return Promise.resolve([])
    })
    db.accountingAccount.findMany.mockResolvedValue([])

    const { GET } = await import("@/app/api/reports/income-statement/route")
    const res = await GET(new NextRequest("http://test/api/reports/income-statement?fromDate=2026-01-01&toDate=2026-12-31"))

    expect(res.status).toBe(200)
    await assertNoLeak(res, [ORG_B, B.JOURNAL_ID])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL — cross-org token misuse
// ─────────────────────────────────────────────────────────────────────────────

describe("Portal — cross-org token isolation", () => {
  it("Org A portal token cannot access /api/portal/[org-b-slug]/invoices", async () => {
    // requirePortalAuth verifies the slug matches the token's org — here it throws
    ;(requirePortalAuth as Mock).mockRejectedValue(new Error("org slug mismatch"))

    const { GET } = await import("@/app/api/portal/[orgSlug]/invoices/route")
    const res = await GET(
      makeReq(`/api/portal/${B.ORG_SLUG}/invoices`),
      { params: Promise.resolve({ orgSlug: B.ORG_SLUG }) }
    )

    expect(res.status).toBe(401)
    await assertNoLeak(res, [B.INVOICE_ID, B.INVOICE_NUMBER, ORG_B])
  })

  it("Valid Org A portal token cannot list Org B invoices even with correct slug", async () => {
    // Token is for Org A's contact — but slug is Org B's
    ;(requirePortalAuth as Mock).mockResolvedValue({
      sub:   "contact-a-id",
      orgId: ORG_A,    // token says Org A
      email: "customer@org-a.example.com",
    })

    db.invoice.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      // Returns Org B invoices only when there's no org filter
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBInvoice])
      }
      return Promise.resolve([])
    })

    const { GET } = await import("@/app/api/portal/[orgSlug]/invoices/route")
    const res = await GET(
      makeReq(`/api/portal/${B.ORG_SLUG}/invoices`),
      { params: Promise.resolve({ orgSlug: B.ORG_SLUG }) }
    )

    expect(res.status).toBe(200)
    await assertNoLeak(res, [B.INVOICE_ID, B.INVOICE_NUMBER, ORG_B])
    const body = await res.json()
    expect(body.invoices ?? []).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// IMPERSONATION — exit guard
// ─────────────────────────────────────────────────────────────────────────────

describe("Impersonation — post-exit isolation", () => {
  it("After exiting impersonation, agency context no longer sees client org data", async () => {
    // Simulate: agency was impersonating Org B, now returned to their own org (Org A)
    // requireAuth returns agency context with organizationId = ORG_A (agency org)
    mockRequireAuth.mockResolvedValue(makeCtx(ORG_A, "agency_owner"))

    seedOrgBResource(db.invoice, orgBInvoice, ORG_B)

    const { GET } = await import("@/app/api/invoices/[id]/route")
    const res = await GET(
      makeReq(`/api/invoices/${B.INVOICE_ID}`),
      { params: Promise.resolve({ id: B.INVOICE_ID }) }
    )

    expect(res.status).toBe(404)
    await assertNoLeak(res, FORBIDDEN_STRINGS)
  })

  it("Active impersonation of Org B only sees Org B data (not leaking Org A)", async () => {
    // Agency is impersonating Org B — ctx.organizationId is set to Org B
    mockRequireAuth.mockResolvedValue({
      ...makeCtx(ORG_B, "agency_staff"),
      impersonating: { clientId: ORG_B, accessLevel: "full" },
    })

    // Agency should only see Org B data, not Org A data
    db.invoice.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_A) {
        // Would be a leak of Org A data
        return Promise.resolve([{ id: "a-invoice", organizationId: ORG_A, invoiceNumber: "ORG-A-ONLY" }])
      }
      return Promise.resolve([])
    })
    db.invoice.count.mockResolvedValue(0)

    const { GET } = await import("@/app/api/invoices/route")
    const res = await GET(makeReq("/api/invoices"))

    expect(res.status).toBe(200)
    await assertNoLeak(res, [ORG_A, "ORG-A-ONLY"])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// API KEYS (v1) — key from Org B cannot access Org A data
// ─────────────────────────────────────────────────────────────────────────────
// Note: v1 routes use withApiAuth (API key), not session auth.
// The organizationId comes from the API key record, so tenant isolation is
// enforced at the DB level. These tests verify the Prisma queries are scoped.

describe("V1 API — API key tenant isolation", () => {
  it("v1 contacts list always scopes to key's organizationId", async () => {
    db.contact.findMany.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
      if (!where?.organizationId || where.organizationId === ORG_B) {
        return Promise.resolve([orgBContact])
      }
      return Promise.resolve([])
    })
    db.contact.count.mockResolvedValue(0)

    // Simulate apiCtx injected by withApiAuth for Org A's key
    const { GET: v1ContactsGET } = await import("@/app/api/v1/contacts/route")

    // withApiAuth is mocked to inject Org A's context automatically.
    // The handler receives organizationId: ORG_A — Org B's contacts must not appear.
    const res = await v1ContactsGET(makeReq("/api/v1/contacts") as Parameters<typeof v1ContactsGET>[0])

    expect(res.status).toBe(200)
    await assertNoLeak(res, [B.CONTACT_ID, B.CONTACT_NAME, ORG_B])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// assertNoLeak helper unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe("assertNoLeak helper", () => {
  it("passes when response body is clean", async () => {
    const res = new Response(JSON.stringify({ invoices: [] }))
    await expect(assertNoLeak(res, [ORG_B])).resolves.toBeUndefined()
  })

  it("throws when response body contains forbidden string", async () => {
    const res = new Response(JSON.stringify({ id: ORG_B }))
    await expect(assertNoLeak(res, [ORG_B])).rejects.toThrow("TENANT LEAK")
  })
})
