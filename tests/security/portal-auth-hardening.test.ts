/**
 * Security tests for portal auth hardening (Task 3):
 *   - cleanup-tokens cron
 *   - rate limiting (send + verify)
 *   - IP-mismatch challenge flow
 *   - trusted device bypass
 *   - session revocation
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import crypto from "crypto"

// Provide secrets required by JWT helpers
process.env.NEXTAUTH_SECRET = "test-secret-for-portal-auth-hardening-tests"

// ─── Shared mock infrastructure ───────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => {
  function m() {
    return {
      findFirst:   vi.fn().mockResolvedValue(null),
      findUnique:  vi.fn().mockResolvedValue(null),
      findMany:    vi.fn().mockResolvedValue([]),
      create:      vi.fn().mockResolvedValue({ id: "mock-id" }),
      update:      vi.fn().mockResolvedValue({ id: "mock-id" }),
      delete:      vi.fn().mockResolvedValue({ id: "mock-id" }),
      count:       vi.fn().mockResolvedValue(0),
      deleteMany:  vi.fn().mockResolvedValue({ count: 0 }),
      updateMany:  vi.fn().mockResolvedValue({ count: 0 }),
    }
  }
  const mock = {
    portalMagicToken:  m(),
    portalAuthAttempt: m(),
    trustedDevice:     m(),
    emailSuppression:  m(),
    organization:      m(),
    contact:           m(),
    $transaction: vi.fn().mockImplementation((fn: unknown) => {
      if (typeof fn === "function") return (fn as (tx: unknown) => unknown)(mock)
      return Promise.all(fn as Promise<unknown>[])
    }),
    $queryRaw:   vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(0),
    $disconnect: vi.fn(),
  }
  return mock
})

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

// Mock cookies()
const mockCookieStore = vi.hoisted(() => ({
  get:  vi.fn().mockReturnValue(undefined),
  set:  vi.fn(),
  getAll: vi.fn().mockReturnValue([]),
}))
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue(mockCookieStore) }))

// Mock next/server
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn().mockImplementation((url: string) =>
      new Response(null, { status: 302, headers: { Location: url } })
    ),
  },
}))

// Mock portal email helpers
vi.mock("@/lib/portal/emails", () => ({
  sendPortalMagicLink:     vi.fn().mockResolvedValue(undefined),
  sendPortalSecurityCode:  vi.fn().mockResolvedValue(undefined),
}))

// Mock signing/tokens
vi.mock("@/lib/signing/tokens", () => ({
  generateSignerToken: vi.fn().mockReturnValue({ rawToken: "raw-abc", tokenHash: "hash-abc" }),
  hashToken: vi.fn().mockImplementation((t: string) => `hash-${t}`),
}))

// Mock resolveBranding
vi.mock("@/lib/branding/resolver", () => ({
  resolveBranding: vi.fn().mockResolvedValue({ displayName: "Test Org", primaryColor: "#4f46e5" }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(path: string, init?: RequestInit) {
  return new Request(`http://test${path}`, init)
}

function makeJsonReq(path: string, body: unknown, method = "POST") {
  return new Request(`http://test${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const ORG = { id: "org-111", name: "Test Org", slug: "test-org" }
const CONTACT = { id: "contact-111", name: "Test User" }
const MAGIC_TOKEN = {
  id:             "token-111",
  contactId:      CONTACT.id,
  organizationId: ORG.id,
  email:          "test@example.com",
  expiresAt:      new Date(Date.now() + 10 * 60_000),
  usedAt:         null,
  requestIp:      "192.168.1.100",
  pendingCode:    null as string | null,
}

function resetMocks() {
  vi.clearAllMocks()
  mockCookieStore.get.mockReturnValue(undefined)
}

// ─── 1. Cleanup-tokens cron ───────────────────────────────────────────────────

describe("cleanup-tokens cron", () => {
  beforeEach(resetMocks)

  it("deletes expired tokens and returns counts", async () => {
    mockPrisma.portalMagicToken.deleteMany.mockResolvedValue({ count: 12 })
    mockPrisma.portalAuthAttempt.deleteMany.mockResolvedValue({ count: 340 })
    mockPrisma.trustedDevice.deleteMany.mockResolvedValue({ count: 2 })
    mockPrisma.emailSuppression.deleteMany.mockResolvedValue({ count: 5 })

    const { GET } = await import("@/app/api/cron/cleanup-tokens/route")
    const res  = await GET(makeReq("/api/cron/cleanup-tokens"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.deleted.portalMagicTokens).toBe(12)
    expect(json.deleted.trustedDevices).toBe(2)
  })

  it("returns 401 when CRON_SECRET mismatch", async () => {
    const orig = process.env.CRON_SECRET
    process.env.CRON_SECRET = "secret-xyz"
    try {
      const { GET } = await import("@/app/api/cron/cleanup-tokens/route")
      const res = await GET(makeReq("/api/cron/cleanup-tokens", {
        headers: { Authorization: "Bearer wrong" },
      }))
      expect(res.status).toBe(401)
    } finally {
      process.env.CRON_SECRET = orig
    }
  })
})

// ─── 2. Rate limiting on send ─────────────────────────────────────────────────

describe("portal auth/send — rate limiting", () => {
  beforeEach(resetMocks)

  it("returns 429 when 5+ tokens exist in the past hour", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)
    mockPrisma.contact.findFirst.mockResolvedValue(CONTACT)
    mockPrisma.portalMagicToken.count.mockResolvedValue(5)

    const { POST } = await import("@/app/api/portal/[orgSlug]/auth/send/route")
    const res = await POST(
      makeJsonReq("/api/portal/test-org/auth/send", { email: "test@example.com" }),
      { params: Promise.resolve({ orgSlug: "test-org" }) }
    )

    expect(res.status).toBe(429)
  })

  it("succeeds and creates token when under rate limit", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)
    mockPrisma.contact.findFirst.mockResolvedValue(CONTACT)
    mockPrisma.portalMagicToken.count.mockResolvedValue(2)
    mockPrisma.portalMagicToken.create.mockResolvedValue({ id: "new-token" })

    const { POST } = await import("@/app/api/portal/[orgSlug]/auth/send/route")
    const res = await POST(
      makeJsonReq("/api/portal/test-org/auth/send", { email: "test@example.com" }),
      { params: Promise.resolve({ orgSlug: "test-org" }) }
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.portalMagicToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requestIp: expect.any(String) }),
      })
    )
  })
})

// ─── 3. Rate limiting on verify ───────────────────────────────────────────────

describe("portal auth/verify — IP rate limiting", () => {
  beforeEach(resetMocks)

  it("returns redirect with rate-limit error when 10+ attempts from IP", async () => {
    mockPrisma.portalAuthAttempt.count.mockResolvedValue(10)

    const { GET } = await import("@/app/api/portal/[orgSlug]/auth/verify/route")
    const res = await GET(
      makeReq("/api/portal/test-org/auth/verify?token=raw-abc"),
      { params: Promise.resolve({ orgSlug: "test-org" }) }
    )

    // Should redirect to login with error
    expect(res.status).toBe(302)
    const location = res.headers.get("Location") ?? ""
    expect(location).toContain("error=")
    expect(decodeURIComponent(location)).toContain("IP")
  })
})

// ─── 4. IP-mismatch challenge ─────────────────────────────────────────────────

describe("portal auth/verify — IP-mismatch challenge", () => {
  beforeEach(resetMocks)

  it("redirects to verify-code page on IP mismatch", async () => {
    mockPrisma.portalAuthAttempt.count.mockResolvedValue(0)
    // Token stored from IP 192.168.1.x; request comes from 10.0.0.x
    mockPrisma.portalMagicToken.findUnique.mockResolvedValue({
      ...MAGIC_TOKEN,
      requestIp: "192.168.1.100",
    })
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)

    const req = new Request("http://test/api/portal/test-org/auth/verify?token=raw-abc", {
      headers: { "x-forwarded-for": "10.0.0.5" },
    })

    const { GET } = await import("@/app/api/portal/[orgSlug]/auth/verify/route")
    const res = await GET(req, { params: Promise.resolve({ orgSlug: "test-org" }) })

    expect(res.status).toBe(302)
    const location = res.headers.get("Location") ?? ""
    expect(location).toContain("/portal/test-org/auth/verify")
    expect(location).toContain("token=")

    // pendingCode should be stored
    expect(mockPrisma.portalMagicToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pendingCode: expect.any(String) }),
      })
    )
  })

  it("issues session when IPs match (same /24)", async () => {
    mockPrisma.portalAuthAttempt.count.mockResolvedValue(0)
    mockPrisma.portalMagicToken.findUnique.mockResolvedValue({
      ...MAGIC_TOKEN,
      requestIp: "192.168.1.100",
    })
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)
    mockPrisma.portalMagicToken.update.mockResolvedValue({ id: "token-111" })

    const req = new Request("http://test/api/portal/test-org/auth/verify?token=raw-abc", {
      headers: { "x-forwarded-for": "192.168.1.200" },
    })

    const { GET } = await import("@/app/api/portal/[orgSlug]/auth/verify/route")
    const res = await GET(req, { params: Promise.resolve({ orgSlug: "test-org" }) })

    // Should redirect to portal home (success)
    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toContain("/portal/test-org")
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "portal_session",
      expect.any(String),
      expect.any(Object)
    )
  })
})

// ─── 5. verify-code route ─────────────────────────────────────────────────────

describe("portal auth/verify-code", () => {
  beforeEach(resetMocks)

  it("accepts correct code and issues session", async () => {
    const code        = "123456"
    const pendingCode = crypto.createHash("sha256").update(code).digest("hex")

    mockPrisma.portalMagicToken.findUnique.mockResolvedValue({
      ...MAGIC_TOKEN,
      pendingCode,
    })
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)
    mockPrisma.portalMagicToken.update.mockResolvedValue({ id: "token-111" })
    mockPrisma.portalAuthAttempt.create.mockResolvedValue({ id: "a1" })

    const { POST } = await import("@/app/api/portal/[orgSlug]/auth/verify-code/route")
    const res = await POST(
      makeJsonReq("/api/portal/test-org/auth/verify-code", { token: "raw-abc", code }),
      { params: Promise.resolve({ orgSlug: "test-org" }) }
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockCookieStore.set).toHaveBeenCalledWith("portal_session", expect.any(String), expect.any(Object))
  })

  it("rejects wrong code with 401", async () => {
    const pendingCode = crypto.createHash("sha256").update("999999").digest("hex")
    mockPrisma.portalMagicToken.findUnique.mockResolvedValue({
      ...MAGIC_TOKEN,
      pendingCode,
    })

    const { POST } = await import("@/app/api/portal/[orgSlug]/auth/verify-code/route")
    const res = await POST(
      makeJsonReq("/api/portal/test-org/auth/verify-code", { token: "raw-abc", code: "123456" }),
      { params: Promise.resolve({ orgSlug: "test-org" }) }
    )

    expect(res.status).toBe(401)
  })
})

// ─── 6. Trusted device bypass ─────────────────────────────────────────────────

describe("portal auth/verify — trusted device bypass", () => {
  beforeEach(resetMocks)

  it("issues session without IP check when trusted device cookie is valid", async () => {
    mockPrisma.portalAuthAttempt.count.mockResolvedValue(0)
    mockPrisma.portalMagicToken.findUnique.mockResolvedValue({
      ...MAGIC_TOKEN,
      requestIp: "192.168.1.100",  // different subnet from request
    })
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)
    mockPrisma.portalMagicToken.update.mockResolvedValue({ id: "token-111" })

    // Simulate valid trusted device JWT in cookie
    const { signTrustedDeviceJwt } = await import("@/lib/portal/auth")
    const deviceJwt = await signTrustedDeviceJwt({
      deviceId: "device-xyz",
      sub:      CONTACT.id,
      org:      ORG.id,
    })
    mockCookieStore.get.mockImplementation((name: string) =>
      name === "portal_trusted_device" ? { value: deviceJwt } : undefined
    )
    mockPrisma.trustedDevice.findUnique.mockResolvedValue({ id: "td-1", revokedAt: null })

    const req = new Request("http://test/api/portal/test-org/auth/verify?token=raw-abc", {
      headers: { "x-forwarded-for": "10.99.99.1" },  // different /24
    })

    const { GET } = await import("@/app/api/portal/[orgSlug]/auth/verify/route")
    const res = await GET(req, { params: Promise.resolve({ orgSlug: "test-org" }) })

    // Should succeed despite IP mismatch
    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toContain("/portal/test-org")
    expect(mockCookieStore.set).toHaveBeenCalledWith("portal_session", expect.any(String), expect.any(Object))
  })
})

// ─── 7. Session revocation ────────────────────────────────────────────────────

describe("portal sessions — revocation", () => {
  beforeEach(resetMocks)

  it("revokes a trusted device", async () => {
    // requirePortalAuth is tested elsewhere; mock its dependency
    const { signPortalJwt } = await import("@/lib/portal/auth")
    const jwt = await signPortalJwt({ sub: CONTACT.id, org: ORG.id, email: "test@example.com" })
    mockCookieStore.get.mockImplementation((name: string) =>
      name === "portal_session" ? { value: jwt } : undefined
    )
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)
    mockPrisma.trustedDevice.findFirst.mockResolvedValue({ id: "td-1" })
    mockPrisma.trustedDevice.update.mockResolvedValue({ id: "td-1", revokedAt: new Date() })

    const { DELETE } = await import("@/app/api/portal/[orgSlug]/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/portal/test-org/sessions/td-1", { method: "DELETE" }),
      { params: Promise.resolve({ orgSlug: "test-org", id: "td-1" }) }
    )

    expect(res.status).toBe(200)
    expect(mockPrisma.trustedDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      })
    )
  })

  it("returns 404 when device does not belong to contact", async () => {
    const { signPortalJwt } = await import("@/lib/portal/auth")
    const jwt = await signPortalJwt({ sub: CONTACT.id, org: ORG.id, email: "test@example.com" })
    mockCookieStore.get.mockImplementation((name: string) =>
      name === "portal_session" ? { value: jwt } : undefined
    )
    mockPrisma.organization.findUnique.mockResolvedValue(ORG)
    mockPrisma.trustedDevice.findFirst.mockResolvedValue(null)  // not found / other contact

    const { DELETE } = await import("@/app/api/portal/[orgSlug]/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/portal/test-org/sessions/other-device", { method: "DELETE" }),
      { params: Promise.resolve({ orgSlug: "test-org", id: "other-device" }) }
    )

    expect(res.status).toBe(404)
  })
})
