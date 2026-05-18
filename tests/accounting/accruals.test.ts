/**
 * Accruals (Periodiseringar) Tests
 *
 * Covers:
 *   1.  calculateAccrualPeriods: 12 equal months
 *   2.  calculateAccrualPeriods: total sum equals input (no öre lost)
 *   3.  calculateAccrualPeriods: remainder lands in the LAST period
 *   4.  calculateAccrualPeriods: 1-month range produces single entry
 *   5.  calculateAccrualPeriods: zero amount returns empty
 *   6.  calculateAccrualPeriods: correct period keys generated
 *   7.  monthsBetween: same month = 1
 *   8.  monthsBetween: cross-year range
 *   9.  postAccrualPeriod: creates combined journal + marks periods posted
 *  10.  postAccrualPeriod: skips already-posted periods (idempotent)
 *  11.  reverseAccrual: voids posted journals and marks accrual reversed
 *  12.  reverseAccrual: throws NotFoundError for wrong org (tenant isolation)
 *  13.  reverseAccrual: throws ValidationError if already reversed
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => {
  function model() {
    return {
      findFirst:  vi.fn().mockResolvedValue(null),
      findMany:   vi.fn().mockResolvedValue([]),
      create:     vi.fn().mockResolvedValue({ id: "mock-id" }),
      update:     vi.fn().mockResolvedValue({ id: "mock-id" }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count:      vi.fn().mockResolvedValue(0),
    }
  }
  return {
    accrualPeriod: model(),
    accrual:       model(),
    account:       model(),
    auditLog:      { create: vi.fn().mockResolvedValue({}) },
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/accounting/journals", () => ({
  createJournal: vi.fn().mockResolvedValue({ id: "j-draft" }),
  postJournal:   vi.fn().mockResolvedValue({ id: "j-posted" }),
  voidJournal:   vi.fn().mockResolvedValue({}),
}))

import { calculateAccrualPeriods, monthsBetween } from "@/lib/accounting/accruals/periods"
import { postAccrualPeriod, reverseAccrual } from "@/lib/accounting/accruals/post"
import { createJournal, postJournal, voidJournal } from "@/lib/accounting/journals"

const ORG_ID    = "org-111"
const ACCRUAL_ID = "acc-222"
const USER_ID   = "usr-333"

// ─── 1–8: calculateAccrualPeriods / monthsBetween ────────────────────────────

describe("calculateAccrualPeriods", () => {
  const start12 = new Date("2026-01-01")
  const end12   = new Date("2026-12-01")

  it("1. 12 equal months for amount divisible by 12", () => {
    const lines = calculateAccrualPeriods(120000n, start12, end12)
    expect(lines).toHaveLength(12)
    for (const l of lines) expect(l.amount).toBe(10000n)
  })

  it("2. sum always equals totalAmount (no öre lost)", () => {
    // 100001 öre over 12 months — not evenly divisible
    const lines = calculateAccrualPeriods(100001n, start12, end12)
    const sum   = lines.reduce((s, l) => s + l.amount, 0n)
    expect(sum).toBe(100001n)
  })

  it("3. remainder lands in the LAST period", () => {
    const total = 100003n  // 100000 / 12 = 8333 remainder 4
    const lines = calculateAccrualPeriods(total, start12, end12)
    const base  = total / 12n
    const rem   = total - base * 12n
    // All but last should equal base
    for (let i = 0; i < 11; i++) expect(lines[i].amount).toBe(base)
    // Last gets base + remainder
    expect(lines[11].amount).toBe(base + rem)
  })

  it("4. 1-month range produces single entry equalling total", () => {
    const lines = calculateAccrualPeriods(50000n, new Date("2026-05-01"), new Date("2026-05-31"))
    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe(50000n)
  })

  it("5. zero amount returns empty array", () => {
    const lines = calculateAccrualPeriods(0n, start12, end12)
    expect(lines).toHaveLength(0)
  })

  it("6. period keys are YYYY-MM and in order", () => {
    const lines = calculateAccrualPeriods(12000n, new Date("2025-11-01"), new Date("2026-02-01"))
    expect(lines.map(l => l.period)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"])
  })
})

describe("monthsBetween", () => {
  it("7. same month = 1", () => {
    expect(monthsBetween(new Date("2026-01-01"), new Date("2026-01-31"))).toBe(1)
  })

  it("8. cross-year: Jan 2025 → Mar 2026 = 15", () => {
    expect(monthsBetween(new Date("2025-01-01"), new Date("2026-03-01"))).toBe(15)
  })
})

// ─── 9–10: postAccrualPeriod ──────────────────────────────────────────────────

describe("postAccrualPeriod", () => {
  const makePeriodRow = (overrides = {}) => ({
    id:        "p-1",
    accrualId: ACCRUAL_ID,
    amount:    10000n,
    status:    "planned",
    accrual:   {
      accrualNumber:  "AC-001",
      type:           "prepaid_expense",
      description:    "Hyra",
      mainAccount:    "5010",
      accrualAccount: "1710",
    },
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockPrisma.account.findMany as Mock).mockResolvedValue([
      { id: "acc-main",    number: "5010" },
      { id: "acc-accrual", number: "1710" },
    ])
    ;(createJournal as Mock).mockResolvedValue({ id: "j-draft" })
    ;(postJournal as Mock).mockResolvedValue({ id: "j-posted" })
    ;(mockPrisma.accrualPeriod.count as Mock).mockResolvedValue(0)
  })

  it("9. creates journal + marks periods posted", async () => {
    ;(mockPrisma.accrualPeriod.findMany as Mock).mockResolvedValue([makePeriodRow()])

    const result = await postAccrualPeriod(ORG_ID, "2026-01", USER_ID)

    expect(createJournal).toHaveBeenCalledOnce()
    expect(postJournal).toHaveBeenCalledOnce()
    expect(mockPrisma.accrualPeriod.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "posted" }) })
    )
    expect(result.posted).toBe(1)
    expect(result.journalId).toBe("j-posted")
  })

  it("10. returns zero when no planned periods (idempotent)", async () => {
    ;(mockPrisma.accrualPeriod.findMany as Mock).mockResolvedValue([])

    const result = await postAccrualPeriod(ORG_ID, "2026-01", USER_ID)
    expect(result.posted).toBe(0)
    expect(result.journalId).toBeNull()
    expect(createJournal).not.toHaveBeenCalled()
  })
})

// ─── 11–13: reverseAccrual ────────────────────────────────────────────────────

describe("reverseAccrual", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(voidJournal as Mock).mockResolvedValue({})
    ;(mockPrisma.accrual.update as Mock).mockResolvedValue({})
  })

  it("11. voids posted journals + marks accrual reversed", async () => {
    ;(mockPrisma.accrual.findFirst as Mock).mockResolvedValue({
      id:            ACCRUAL_ID,
      accrualNumber: "AC-001",
      status:        "active",
      periods: [
        { id: "p-1", status: "posted", journalId: "j-abc" },
        { id: "p-2", status: "posted", journalId: "j-abc" },  // same journal — void only once
        { id: "p-3", status: "planned", journalId: null },
      ],
    })

    await reverseAccrual(ORG_ID, ACCRUAL_ID, USER_ID)

    // Same journalId → voidJournal called exactly once
    expect(voidJournal).toHaveBeenCalledOnce()
    expect(mockPrisma.accrual.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "reversed" } })
    )
  })

  it("12. throws NotFoundError for wrong org (tenant isolation)", async () => {
    ;(mockPrisma.accrual.findFirst as Mock).mockResolvedValue(null)
    await expect(
      reverseAccrual("other-org", ACCRUAL_ID, USER_ID)
    ).rejects.toMatchObject({ name: "NotFoundError" })
  })

  it("13. throws ValidationError if already reversed", async () => {
    ;(mockPrisma.accrual.findFirst as Mock).mockResolvedValue({
      id:      ACCRUAL_ID,
      status:  "reversed",
      periods: [],
    })
    await expect(
      reverseAccrual(ORG_ID, ACCRUAL_ID, USER_ID)
    ).rejects.toMatchObject({ name: "ValidationError" })
  })
})
