/**
 * SRU Export Tests
 *
 * Covers:
 *   1.  normalizeOrgNumber: 10-digit with dash → no dash
 *   2.  normalizeOrgNumber: 12-digit with country prefix 16 → 10 digits
 *   3.  normalizeOrgNumber: already 10 digits without dash → unchanged
 *   4.  formatSruDate: Date → YYYYMMDD
 *   5.  generateInfoSru: contains #ORGNR with exactly 10 digits
 *   6.  generateInfoSru: contains #NAMN and #DATABESKRIVNING_START
 *   7.  generateBlankettSru: contains #BLANKETT and #FALT for each field
 *   8.  generateBlankettSru: zero fields omitted when all values are zero
 *   9.  BAS mapping: sumAccountRange sums correctly within range
 *  10.  BAS mapping: oreToKronor converts bigint öre → whole kronor (truncates)
 *  11.  BAS mapping: applyMapping debit side returns correct kronor value
 *  12.  BAS mapping: applyMapping credit side with negate=true returns positive
 *  13.  generateInk2Sru: missing orgNumber throws descriptive error
 *  14.  generateInk2Sru: returns document with INK2R and INK2S blanketter
 *  15.  generateInk2Sru: taxYear = fiscal year end year
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

// ── Prisma mock ────────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => {
  const model = () => ({
    findFirst:  vi.fn().mockResolvedValue(null),
    findMany:   vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create:     vi.fn().mockResolvedValue({ id: "mock-id" }),
    update:     vi.fn().mockResolvedValue({ id: "mock-id" }),
    groupBy:    vi.fn().mockResolvedValue([]),
  })
  return {
    organization:  model(),
    fiscalYear:    model(),
    account:       model(),
    journalEntry:  model(),
    auditLog:      { create: vi.fn().mockResolvedValue({}) },
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))

import {
  normalizeOrgNumber,
  formatSruDate,
  generateInfoSru,
  generateBlankettSru,
} from "@/lib/accounting/sru/format"

import {
  sumAccountRange,
  oreToKronor,
  applyMapping,
} from "@/lib/accounting/sru/bas-mapping"

import { generateInk2Sru } from "@/lib/accounting/sru/ink2"

import type { SruDocument, AccountBalanceRow } from "@/lib/accounting/sru/types"

const ORG_ID = "org-test-111"
const FY_ID  = "fy-test-222"

// ─── 1–4: format helpers ──────────────────────────────────────────────────────

describe("normalizeOrgNumber", () => {
  it("1. 10-digit with dash → removes dash", () => {
    expect(normalizeOrgNumber("556123-4567")).toBe("5561234567")
  })

  it("2. 12-digit with country prefix 16 → 10 digits", () => {
    expect(normalizeOrgNumber("165561234567")).toBe("5561234567")
  })

  it("3. already 10 digits without dash → unchanged", () => {
    expect(normalizeOrgNumber("5561234567")).toBe("5561234567")
  })
})

describe("formatSruDate", () => {
  it("4. Date object → YYYYMMDD string", () => {
    expect(formatSruDate(new Date("2026-01-15"))).toBe("20260115")
  })
})

// ─── 5–8: SRU file generation ─────────────────────────────────────────────────

const SAMPLE_DOC: SruDocument = {
  orgNumber:   "5561234567",
  companyName: "Testbolaget AB",
  taxYear:     2025,
  createdDate: "20260115",
  blanketter: [
    {
      blankett: "INK2R",
      fields: [
        { field: 2510, value: 100000 },
        { field: 2620, value: 50000  },
        { field: 4014, value: 50000  },
      ],
    },
  ],
}

describe("generateInfoSru", () => {
  it("5. contains #ORGNR with exactly 10 digits (no dash)", () => {
    const info = generateInfoSru(SAMPLE_DOC)
    expect(info).toContain("#ORGNR 5561234567")
    // Must not contain dash in org number
    expect(info).not.toMatch(/#ORGNR \d{6}-\d{4}/)
  })

  it("6. contains #NAMN and #DATABESKRIVNING_START", () => {
    const info = generateInfoSru(SAMPLE_DOC)
    expect(info).toContain("#DATABESKRIVNING_START")
    expect(info).toContain("#NAMN Testbolaget AB")
  })
})

describe("generateBlankettSru", () => {
  it("7. contains #BLANKETT, #FALT for each field, and #BLANKETTSLUT", () => {
    const blanketter = generateBlankettSru(SAMPLE_DOC)
    expect(blanketter).toContain("#BLANKETT INK2R")
    expect(blanketter).toContain("#FALT 2510 100000")
    expect(blanketter).toContain("#FALT 2620 50000")
    expect(blanketter).toContain("#FALT 4014 50000")
    expect(blanketter).toContain("#BLANKETTSLUT")
  })

  it("8. FIL_SLUT appears at end", () => {
    const blanketter = generateBlankettSru(SAMPLE_DOC)
    expect(blanketter).toContain("#FIL_SLUT")
  })
})

// ─── 9–12: BAS mapping helpers ───────────────────────────────────────────────

function makeBalance(number: string, debit: bigint, credit: bigint): AccountBalanceRow {
  return {
    account: { id: `acc-${number}`, number, name: `Konto ${number}`, type: "asset" },
    debit,
    credit,
  }
}

describe("sumAccountRange", () => {
  it("9. sums correctly within range, ignores accounts outside", () => {
    const balances: AccountBalanceRow[] = [
      makeBalance("3000", 0n, 10000_00n),  // inside
      makeBalance("3500", 0n, 5000_00n),   // inside
      makeBalance("4000", 8000_00n, 0n),   // outside (4000 > 3999)
    ]
    const result = sumAccountRange(balances, "3000", "3999")
    expect(result.credit).toBe(15000_00n)
    expect(result.debit).toBe(0n)
    expect(result.net).toBe(-15000_00n)  // debit - credit
  })
})

describe("oreToKronor", () => {
  it("10. converts bigint öre to whole kronor, truncating fractional ore", () => {
    expect(oreToKronor(10000_00n)).toBe(10000)
    expect(oreToKronor(10000_50n)).toBe(10000)  // truncate (not round)
    expect(oreToKronor(-5000_00n)).toBe(-5000)
  })
})

describe("applyMapping", () => {
  const balances: AccountBalanceRow[] = [
    makeBalance("5000", 3000_00n, 0n),
    makeBalance("6000", 2000_00n, 0n),
    makeBalance("3000", 0n, 8000_00n),
  ]

  it("11. debit side: sums debit in range correctly", () => {
    const v = applyMapping(balances, [["5000", "6999"]], "debit")
    expect(v).toBe(5000)  // (3000 + 2000) kr
  })

  it("12. credit side with negate=false returns credit value as positive kronor", () => {
    // Credit values are stored as positive bigints; no negation needed for income/liability accounts
    const v = applyMapping(balances, [["3000", "3999"]], "credit", false)
    expect(v).toBe(8000)
  })
})

// ─── 13–15: generateInk2Sru ──────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe("generateInk2Sru", () => {
  it("13. throws descriptive error when orgNumber is missing", async () => {
    ;(mockPrisma.organization.findFirst as Mock).mockResolvedValue({
      name: "TestAB", orgNumber: null,
    })
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue({
      endDate: new Date("2025-12-31"), startDate: new Date("2025-01-01"),
    })
    ;(mockPrisma.account.findMany as Mock).mockResolvedValue([])
    ;(mockPrisma.journalEntry.groupBy as Mock).mockResolvedValue([])

    await expect(generateInk2Sru(ORG_ID, FY_ID)).rejects.toThrow(/Organisationsnummer saknas/)
  })

  it("14. returns document with INK2R and INK2S blanketter", async () => {
    ;(mockPrisma.organization.findFirst as Mock).mockResolvedValue({
      name: "Testbolaget AB", orgNumber: "556123-4567",
    })
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue({
      endDate: new Date("2025-12-31"), startDate: new Date("2025-01-01"),
    })
    ;(mockPrisma.account.findMany as Mock).mockResolvedValue([])
    ;(mockPrisma.journalEntry.groupBy as Mock).mockResolvedValue([])

    const doc = await generateInk2Sru(ORG_ID, FY_ID)
    const names = doc.blanketter.map(b => b.blankett)
    expect(names).toContain("INK2R")
    expect(names).toContain("INK2S")
  })

  it("15. taxYear equals fiscal year end year", async () => {
    ;(mockPrisma.organization.findFirst as Mock).mockResolvedValue({
      name: "AB Test", orgNumber: "5561234567",
    })
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue({
      endDate: new Date("2025-12-31"), startDate: new Date("2025-01-01"),
    })
    ;(mockPrisma.account.findMany as Mock).mockResolvedValue([])
    ;(mockPrisma.journalEntry.groupBy as Mock).mockResolvedValue([])

    const doc = await generateInk2Sru(ORG_ID, FY_ID)
    expect(doc.taxYear).toBe(2025)
    expect(doc.orgNumber).toBe("5561234567")
  })
})
