/**
 * Shared helpers for tenant-isolation security tests.
 *
 * createMockPrisma()  — returns a structured vi.fn() mock where every model
 *                       method is spyable and returns null/[] by default.
 *
 * assertNoLeak()      — scans a Response body for forbidden strings that would
 *                       indicate cross-tenant data exposure.
 */

import { vi } from "vitest"
import type { RBACContext } from "@/lib/rbac/context"

// ─── Mock Prisma factory ──────────────────────────────────────────────────────

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

export function createMockPrisma() {
  const mock = {
    // Tenant-scoped models — each query MUST include organizationId
    invoice:              modelMock(),
    contact:              modelMock(),
    contactPerson:        modelMock(),
    product:              modelMock(),
    journal:              modelMock(),
    journalEntry:         modelMock(),
    accountingAccount:    modelMock(),
    accountingPeriod:     modelMock(),
    payment:              modelMock(),
    quote:                modelMock(),
    contract:             modelMock(),
    supplierInvoice:      modelMock(),
    supplier:             modelMock(),
    webhook:              modelMock(),
    webhookEndpoint:      modelMock(),
    webhookEvent:         modelMock(),
    apiKey:               modelMock(),
    auditLog:             modelMock(),
    activityFeedItem:     modelMock(),
    emailDelivery:        modelMock(),
    emailSuppression:     modelMock(),
    notification:         modelMock(),
    notificationJob:      modelMock(),
    task:                 modelMock(),
    inventory:            modelMock(),
    inventoryItem:        modelMock(),
    inventoryTransaction: modelMock(),
    analyticsSnapshot:    modelMock(),
    searchIndex:          modelMock(),
    accountMapping:       modelMock(),
    taxPeriod:            modelMock(),
    dimension:            modelMock(),
    dimensionAxis:        modelMock(),
    dimensionValue:       modelMock(),
    approvalPolicy:       modelMock(),
    approvalRequest:      modelMock(),
    signature:            modelMock(),
    integration:          modelMock(),
    syncJob:              modelMock(),
    receipt:              modelMock(),
    emailDomainVerification: modelMock(),
    portalMagicToken:     modelMock(),
    recurringInvoice:     modelMock(),
    report:               modelMock(),

    // Platform-scoped models (no organizationId required)
    organization:         modelMock(),
    user:                 modelMock(),
    organizationMember:   modelMock(),
    schemaVersion:        modelMock(),
    agencyStaffAccess:    modelMock(),
    agencyClientPin:      modelMock(),
    subscription:         modelMock(),
    invitation:           modelMock(),

    // Prisma client utilities
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => unknown) => {
      if (typeof fn === "function") return fn(mock)
      // Array of promises
      return Promise.all(fn as Promise<unknown>[])
    }),
    $queryRaw:    vi.fn().mockResolvedValue([]),
    $executeRaw:  vi.fn().mockResolvedValue(0),
    $disconnect:  vi.fn(),
  }
  return mock
}

export type MockPrisma = ReturnType<typeof createMockPrisma>

// ─── Oracle mock helpers ──────────────────────────────────────────────────────
//
// These configure a model's findFirst to simulate a resource that EXISTS in
// org B but NOT in org A. If the route forgets organizationId in its where
// clause, it will receive the resource and return 200 instead of 404.

interface ModelMock {
  findFirst:  ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  findMany:   ReturnType<typeof vi.fn>
  update:     ReturnType<typeof vi.fn>
  [key: string]: ReturnType<typeof vi.fn>
}

export function seedOrgBResource(
  modelMock: ModelMock,
  resource: Record<string, unknown>,
  orgBId: string
) {
  modelMock.findFirst.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
    if (!where) return Promise.resolve(resource)
    const orgFilter = where.organizationId
    if (orgFilter === orgBId || orgFilter === undefined || orgFilter === null) {
      return Promise.resolve(resource)
    }
    return Promise.resolve(null)
  })

  modelMock.findUnique.mockImplementation(({ where }: { where?: Record<string, unknown> }) => {
    if (!where) return Promise.resolve(resource)
    const orgFilter = where.organizationId
    if (orgFilter === orgBId || orgFilter === undefined || orgFilter === null) {
      return Promise.resolve(resource)
    }
    return Promise.resolve(null)
  })
}

// ─── assertNoLeak ────────────────────────────────────────────────────────────

export async function assertNoLeak(
  response: Response,
  forbiddenStrings: string[]
): Promise<void> {
  const body = await response.clone().text()
  for (const s of forbiddenStrings) {
    if (body.includes(s)) {
      throw new Error(
        `TENANT LEAK: response contains forbidden string "${s}"\n` +
        `Response body (first 500 chars): ${body.slice(0, 500)}`
      )
    }
  }
}

// ─── RBACContext factories ────────────────────────────────────────────────────

export function makeCtx(
  organizationId: string,
  role: RBACContext["role"] = "customer_owner",
  userId = "user-" + organizationId.slice(0, 8)
): RBACContext {
  return { role, organizationId, userId }
}

// ─── Request factory ─────────────────────────────────────────────────────────

export function makeReq(path: string, init?: RequestInit): Request {
  return new Request(`http://test${path}`, init)
}

export function makeJsonReq(path: string, body: unknown, method = "POST"): Request {
  return new Request(`http://test${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}
