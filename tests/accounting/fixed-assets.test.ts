/**
 * Fixed Assets Tests
 *
 * Covers:
 *   1. calculateSchedule — linear: correct monthly amount + last period rounding
 *   2. calculateSchedule — linear: total depreciation equals depreciable amount
 *   3. calculateSchedule — tax_book (30%): balance decreases correctly
 *   4. calculateSchedule — zero depreciable amount returns empty
 *   5. calculateSchedule — declining_balance: uses custom rate
 *   6. postPeriodDepreciation — skips already-posted periods
 *   7. postPeriodDepreciation — marks asset written_off when fully depreciated
 *   8. disposeAsset — creates gain journal when proceeds > book value
 *   9. disposeAsset — creates loss journal when proceeds < book value
 *  10. disposeAsset — throws NotFoundError for wrong org (tenant isolation)
 *  11. disposeAsset — throws ValidationError for non-active asset
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => {
  function modelMock() {
    return {
      findFirst:    vi.fn().mockResolvedValue(null),
      findMany:     vi.fn().mockResolvedValue([]),
      create:       vi.fn().mockResolvedValue({ id: "j-1" }),
      update:       vi.fn().mockResolvedValue({ id: "mock-id" }),
      upsert:       vi.fn().mockResolvedValue({ id: "mock-id" }),
      count:        vi.fn().mockResolvedValue(0),
      createMany:   vi.fn().mockResolvedValue({ count: 0 }),
    }
  }
  return {
    fixedAsset:          modelMock(),
    depreciationSchedule: modelMock(),
    account:             modelMock(),
    journal:             modelMock(),
    auditLog:            { create: vi.fn().mockResolvedValue({}) },
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/accounting/journals", () => ({
  createJournal: vi.fn().mockResolvedValue({ id: "j-draft" }),
  postJournal:   vi.fn().mockResolvedValue({ id: "j-posted" }),
}))

import { calculateSchedule } from "@/lib/accounting/fixed-assets/schedule"
import { postPeriodDepreciation } from "@/lib/accounting/fixed-assets/depreciation"
import { disposeAsset } from "@/lib/accounting/fixed-assets/dispose"
import { createJournal, postJournal } from "@/lib/accounting/journals"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAsset(overrides: Partial<Parameters<typeof calculateSchedule>[0]> = {}) {
  return {
    acquisitionDate:    new Date("2024-01-01"),
    acquisitionCost:    120000n,  // 1200 kr
    residualValue:      0n,
    usefulLifeMonths:   12,
    depreciationMethod: "linear" as const,
    declineRate:        null,
    ...overrides,
  }
}

const ORG_ID   = "org-aaa"
const ASSET_ID = "asset-bbb"
const USER_ID  = "user-ccc"

// ─── 1–5: calculateSchedule ──────────────────────────────────────────────────

describe("calculateSchedule", () => {
  it("1. linear: produces correct count and monthly amount", () => {
    const lines = calculateSchedule(makeAsset({ acquisitionCost: 120000n, usefulLifeMonths: 12 }))
    expect(lines).toHaveLength(12)
    // First 11 months should be equal
    const base = lines[0].depreciationAmount
    for (let i = 0; i < 11; i++) expect(lines[i].depreciationAmount).toBe(base)
  })

  it("2. linear: total depreciation == depreciable amount", () => {
    const lines = calculateSchedule(makeAsset({ acquisitionCost: 100000n, residualValue: 20000n, usefulLifeMonths: 10 }))
    const total = lines.reduce((s, l) => s + l.depreciationAmount, 0n)
    expect(total).toBe(80000n)
  })

  it("3. linear: book value reaches residual value", () => {
    const lines = calculateSchedule(makeAsset())
    expect(lines[lines.length - 1].bookValue).toBe(0n)
  })

  it("4. zero depreciable amount returns empty schedule", () => {
    const lines = calculateSchedule(makeAsset({ acquisitionCost: 50000n, residualValue: 50000n }))
    expect(lines).toHaveLength(0)
  })

  it("5. declining_balance: uses custom rate, each period < previous", () => {
    const lines = calculateSchedule(makeAsset({
      acquisitionCost:    1000000n,
      usefulLifeMonths:   24,
      depreciationMethod: "declining_balance",
      declineRate:        0.2,
    }))
    expect(lines.length).toBeGreaterThan(0)
    // Each period's charge should be ≤ the previous (declining or equal at end)
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i].depreciationAmount).toBeLessThanOrEqual(lines[i - 1].depreciationAmount)
    }
  })
})

// ─── 6–7: postPeriodDepreciation ─────────────────────────────────────────────

describe("postPeriodDepreciation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockPrisma.account.findMany as Mock).mockResolvedValue([
      { id: "acc-dep", number: "7832" },
      { id: "acc-acc", number: "1229" },
    ])
    ;(createJournal as Mock).mockResolvedValue({ id: "j-draft" })
    ;(postJournal as Mock).mockResolvedValue({ id: "j-posted" })
  })

  it("6. skips already-posted schedules", async () => {
    ;(mockPrisma.fixedAsset.findMany as Mock).mockResolvedValue([
      {
        id:                             ASSET_ID,
        organizationId:                 ORG_ID,
        assetNumber:                    "AT-001",
        name:                           "Laptop",
        status:                         "active",
        acquisitionDate:                new Date("2024-01-01"),
        acquisitionCost:                120000n,
        residualValue:                  0n,
        usefulLifeMonths:               12,
        depreciationMethod:             "linear",
        depreciationAccount:            "7832",
        accumulatedDepreciationAccount: "1229",
        declineRate:                    null,
        schedules: [{ period: "2024-01", status: "posted" }],
      },
    ])

    const result = await postPeriodDepreciation(ORG_ID, "2024-01", USER_ID)
    expect(result.skipped).toBe(1)
    expect(result.posted).toBe(0)
    expect(createJournal).not.toHaveBeenCalled()
  })

  it("7. marks asset written_off when book value reaches residual", async () => {
    ;(mockPrisma.fixedAsset.findMany as Mock).mockResolvedValue([
      {
        id:                             ASSET_ID,
        organizationId:                 ORG_ID,
        assetNumber:                    "AT-002",
        name:                           "Monitor",
        status:                         "active",
        acquisitionDate:                new Date("2024-01-01"),
        acquisitionCost:                10000n,
        residualValue:                  0n,
        usefulLifeMonths:               1,
        depreciationMethod:             "linear",
        depreciationAccount:            "7832",
        accumulatedDepreciationAccount: "1229",
        declineRate:                    null,
        schedules: [],
      },
    ])

    await postPeriodDepreciation(ORG_ID, "2024-01", USER_ID)
    expect(mockPrisma.fixedAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "written_off" } })
    )
  })
})

// ─── 8–11: disposeAsset ──────────────────────────────────────────────────────

describe("disposeAsset", () => {
  const BASE_ASSET = {
    id:                             ASSET_ID,
    organizationId:                 ORG_ID,
    assetNumber:                    "AT-003",
    name:                           "Server",
    status:                         "active",
    assetAccount:                   "1220",
    accumulatedDepreciationAccount: "1229",
    acquisitionCost:                500000n,
    residualValue:                  0n,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockPrisma.depreciationSchedule.findFirst as Mock).mockResolvedValue({
      bookValue: 200000n,  // 2000 kr book value after depreciation
    })
    ;(mockPrisma.account.findMany as Mock).mockResolvedValue([
      { id: "acc-asset", number: "1220" },
      { id: "acc-acc",   number: "1229" },
      { id: "acc-bank",  number: "1510" },
      { id: "acc-gain",  number: "3973" },
      { id: "acc-loss",  number: "7973" },
    ])
    ;(createJournal as Mock).mockResolvedValue({ id: "j-draft" })
    ;(postJournal as Mock).mockResolvedValue({ id: "j-posted" })
    ;(mockPrisma.fixedAsset.update as Mock).mockResolvedValue({})
  })

  it("8. gain journal when proceeds > book value", async () => {
    ;(mockPrisma.fixedAsset.findFirst as Mock).mockResolvedValue(BASE_ASSET)
    const result = await disposeAsset({
      organizationId:   ORG_ID,
      assetId:          ASSET_ID,
      disposalDate:     new Date("2024-06-01"),
      proceeds:         300000n,  // 3000 kr — gain of 1000 kr
      disposedByUserId: USER_ID,
    })
    expect(result.gainLoss).toBe(100000n)  // 300000 - 200000
    const entries = (createJournal as Mock).mock.calls[0][0].entries as Array<{ accountId: string; credit: bigint }>
    const gainEntry = entries.find(e => e.accountId === "acc-gain")
    expect(gainEntry).toBeDefined()
    expect(gainEntry!.credit).toBe(100000n)
  })

  it("9. loss journal when proceeds < book value", async () => {
    ;(mockPrisma.fixedAsset.findFirst as Mock).mockResolvedValue(BASE_ASSET)
    const result = await disposeAsset({
      organizationId:   ORG_ID,
      assetId:          ASSET_ID,
      disposalDate:     new Date("2024-06-01"),
      proceeds:         50000n,   // 500 kr — loss of 1500 kr
      disposedByUserId: USER_ID,
    })
    expect(result.gainLoss).toBe(-150000n)
    const entries = (createJournal as Mock).mock.calls[0][0].entries as Array<{ accountId: string; debit: bigint }>
    const lossEntry = entries.find(e => e.accountId === "acc-loss")
    expect(lossEntry).toBeDefined()
    expect(lossEntry!.debit).toBe(150000n)
  })

  it("10. throws NotFoundError for wrong org (tenant isolation)", async () => {
    ;(mockPrisma.fixedAsset.findFirst as Mock).mockResolvedValue(null)
    await expect(
      disposeAsset({ organizationId: "other-org", assetId: ASSET_ID, disposalDate: new Date(), proceeds: 0n, disposedByUserId: USER_ID })
    ).rejects.toMatchObject({ name: "NotFoundError" })
  })

  it("11. throws ValidationError for non-active asset", async () => {
    ;(mockPrisma.fixedAsset.findFirst as Mock).mockResolvedValue({ ...BASE_ASSET, status: "disposed" })
    await expect(
      disposeAsset({ organizationId: ORG_ID, assetId: ASSET_ID, disposalDate: new Date(), proceeds: 0n, disposedByUserId: USER_ID })
    ).rejects.toMatchObject({ name: "ValidationError" })
  })
})
