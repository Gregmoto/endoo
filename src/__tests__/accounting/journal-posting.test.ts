import { describe, it, expect } from "vitest"

// ─── Journal posting business rules ──────────────────────────────────────────
//
// Pure function tests — no Prisma, no DB.
// We re-implement the core rules inline to verify they are correct before
// they go into lib/accounting/journals.ts.

// ─── Types ────────────────────────────────────────────────────────────────────

type JournalStatus     = "draft" | "posted" | "voided"
type FiscalYearStatus  = "open"  | "closed"  | "locked"

type EntryInput = {
  accountId:   string
  debit:       bigint
  credit:      bigint
  description?: string
  vatCode?:    string
}

type Journal = {
  id:             string
  organizationId: string
  fiscalYearId:   string
  seriesId:       string
  number:         number
  reference:      string
  date:           Date
  description:    string
  status:         JournalStatus
  voidOf?:        string
  entries:        EntryInput[]
}

type FiscalYear = {
  id:             string
  organizationId: string
  startDate:      Date
  endDate:        Date
  status:         FiscalYearStatus
}

// ─── Pure helpers (mirrors lib/accounting/journals.ts logic) ─────────────────

function validateBalance(entries: EntryInput[]): string | null {
  if (entries.length < 2) return `too_few_entries:${entries.length}`

  let totalDebit  = 0n
  let totalCredit = 0n
  for (const e of entries) {
    totalDebit  += e.debit
    totalCredit += e.credit
  }

  if (totalDebit === 0n)          return "empty:zero_debit"
  if (totalDebit !== totalCredit) return `unbalanced:${totalDebit}:${totalCredit}`

  return null // valid
}

function canPost(journal: Journal, fy: FiscalYear): string | null {
  if (journal.status !== "draft")   return `not_draft:${journal.status}`
  if (fy.status     !== "open")     return `fiscal_year_${fy.status}`

  const err = validateBalance(journal.entries)
  if (err) return err

  return null
}

function canVoid(journal: Journal, fy: FiscalYear): string | null {
  if (journal.status === "voided")  return "already_voided"
  if (journal.status !== "posted")  return `not_posted:${journal.status}`
  if (fy.status      !== "open")    return `fiscal_year_${fy.status}`

  return null
}

function buildReversal(original: Journal, newNumber: number): Journal {
  const prefix    = original.reference.split("-")[0]
  const reference = `${prefix}-${String(newNumber).padStart(4, "0")}`

  return {
    ...original,
    id:          `rev-${original.id}`,
    number:      newNumber,
    reference,
    date:        new Date(),
    description: `Makulering: ${original.reference}`,
    status:      "posted",
    voidOf:      original.id,
    entries:     original.entries.map(e => ({
      ...e,
      debit:  e.credit,   // swap sides
      credit: e.debit,
    })),
  }
}

function makeReference(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, "0")}`
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG = "org-1"

const openFY: FiscalYear = {
  id:             "fy-2025",
  organizationId: ORG,
  startDate:      new Date("2025-01-01"),
  endDate:        new Date("2025-12-31"),
  status:         "open",
}

const closedFY: FiscalYear = { ...openFY, id: "fy-2024", status: "closed" }
const lockedFY: FiscalYear = { ...openFY, id: "fy-2023", status: "locked" }

function makeJournal(overrides?: Partial<Journal>): Journal {
  return {
    id:             "j-1",
    organizationId: ORG,
    fiscalYearId:   "fy-2025",
    seriesId:       "s-1",
    number:         1,
    reference:      "A-0001",
    date:           new Date("2025-06-01"),
    description:    "Test verifikation",
    status:         "draft",
    entries: [
      { accountId: "acc-1510", debit: 12500n, credit: 0n },
      { accountId: "acc-3001", debit: 0n,     credit: 10000n },
      { accountId: "acc-2610", debit: 0n,     credit: 2500n },
    ],
    ...overrides,
  }
}

// ─── validateBalance ──────────────────────────────────────────────────────────

describe("validateBalance", () => {
  it("accepts a balanced 3-line journal", () => {
    const entries: EntryInput[] = [
      { accountId: "a", debit: 12500n, credit: 0n },
      { accountId: "b", debit: 0n,     credit: 10000n },
      { accountId: "c", debit: 0n,     credit: 2500n },
    ]
    expect(validateBalance(entries)).toBeNull()
  })

  it("accepts a balanced 2-line journal", () => {
    const entries: EntryInput[] = [
      { accountId: "a", debit: 5000n, credit: 0n },
      { accountId: "b", debit: 0n,    credit: 5000n },
    ]
    expect(validateBalance(entries)).toBeNull()
  })

  it("rejects a single entry", () => {
    const entries: EntryInput[] = [{ accountId: "a", debit: 1000n, credit: 0n }]
    expect(validateBalance(entries)).toMatch(/too_few_entries/)
  })

  it("rejects zero entries", () => {
    expect(validateBalance([])).toMatch(/too_few_entries/)
  })

  it("rejects unbalanced entries", () => {
    const entries: EntryInput[] = [
      { accountId: "a", debit: 1000n, credit: 0n },
      { accountId: "b", debit: 0n,    credit: 900n },
    ]
    const result = validateBalance(entries)
    expect(result).toMatch(/unbalanced/)
    expect(result).toContain("1000")
    expect(result).toContain("900")
  })

  it("rejects entries where all amounts are zero", () => {
    const entries: EntryInput[] = [
      { accountId: "a", debit: 0n, credit: 0n },
      { accountId: "b", debit: 0n, credit: 0n },
    ]
    expect(validateBalance(entries)).toMatch(/empty|too_few_entries|unbalanced/)
  })

  it("handles multi-rate VAT journal (5 entries)", () => {
    // 100 kr @ 25% + 100 kr @ 12%
    const entries: EntryInput[] = [
      { accountId: "1510", debit: 24480n, credit: 0n      },  // AR
      { accountId: "3001", debit: 0n,     credit: 10000n  },  // income 25%
      { accountId: "2610", debit: 0n,     credit: 2500n   },  // VAT 25%
      { accountId: "3051", debit: 0n,     credit: 10000n  },  // income 12%
      { accountId: "2611", debit: 0n,     credit: 1980n   },  // VAT 12%
    ]
    // 10000+2500+10000+1980 = 24480 ✓
    expect(validateBalance(entries)).toBeNull()
  })
})

// ─── canPost ──────────────────────────────────────────────────────────────────

describe("canPost", () => {
  it("allows posting a valid draft journal in an open fiscal year", () => {
    expect(canPost(makeJournal(), openFY)).toBeNull()
  })

  it("blocks posting an already-posted journal", () => {
    const j = makeJournal({ status: "posted" })
    expect(canPost(j, openFY)).toMatch(/not_draft/)
  })

  it("blocks posting a voided journal", () => {
    const j = makeJournal({ status: "voided" })
    expect(canPost(j, openFY)).toMatch(/not_draft/)
  })

  it("blocks posting into a closed fiscal year", () => {
    const j = makeJournal({ fiscalYearId: "fy-2024" })
    expect(canPost(j, closedFY)).toMatch(/fiscal_year_closed/)
  })

  it("blocks posting into a locked fiscal year", () => {
    const j = makeJournal({ fiscalYearId: "fy-2023" })
    expect(canPost(j, lockedFY)).toMatch(/fiscal_year_locked/)
  })

  it("blocks posting an unbalanced draft journal", () => {
    const j = makeJournal({
      entries: [
        { accountId: "a", debit: 1000n, credit: 0n },
        { accountId: "b", debit: 0n,    credit: 900n },
      ],
    })
    expect(canPost(j, openFY)).toMatch(/unbalanced/)
  })

  it("blocks posting a single-entry draft journal", () => {
    const j = makeJournal({
      entries: [{ accountId: "a", debit: 1000n, credit: 0n }],
    })
    expect(canPost(j, openFY)).toMatch(/too_few_entries/)
  })
})

// ─── canVoid ──────────────────────────────────────────────────────────────────

describe("canVoid", () => {
  it("allows voiding a posted journal in an open fiscal year", () => {
    const j = makeJournal({ status: "posted" })
    expect(canVoid(j, openFY)).toBeNull()
  })

  it("blocks voiding an already-voided journal", () => {
    const j = makeJournal({ status: "voided" })
    expect(canVoid(j, openFY)).toBe("already_voided")
  })

  it("blocks voiding a draft journal", () => {
    const j = makeJournal({ status: "draft" })
    expect(canVoid(j, openFY)).toMatch(/not_posted/)
  })

  it("blocks voiding if fiscal year is closed", () => {
    const j = makeJournal({ status: "posted", fiscalYearId: "fy-2024" })
    expect(canVoid(j, closedFY)).toMatch(/fiscal_year_closed/)
  })

  it("blocks voiding if fiscal year is locked", () => {
    const j = makeJournal({ status: "posted", fiscalYearId: "fy-2023" })
    expect(canVoid(j, lockedFY)).toMatch(/fiscal_year_locked/)
  })
})

// ─── buildReversal ────────────────────────────────────────────────────────────

describe("buildReversal", () => {
  it("swaps all debit/credit sides", () => {
    const original = makeJournal({ status: "posted" })
    const reversal = buildReversal(original, 2)

    for (let i = 0; i < original.entries.length; i++) {
      expect(reversal.entries[i].debit).toBe(original.entries[i].credit)
      expect(reversal.entries[i].credit).toBe(original.entries[i].debit)
    }
  })

  it("produces a balanced reversal", () => {
    const original = makeJournal({ status: "posted" })
    const reversal = buildReversal(original, 2)
    expect(validateBalance(reversal.entries)).toBeNull()
  })

  it("has status=posted", () => {
    const reversal = buildReversal(makeJournal({ status: "posted" }), 2)
    expect(reversal.status).toBe("posted")
  })

  it("sets voidOf to the original journal id", () => {
    const original = makeJournal({ id: "j-42", status: "posted" })
    const reversal = buildReversal(original, 2)
    expect(reversal.voidOf).toBe("j-42")
  })

  it("uses the next sequence number for the reference", () => {
    const original = makeJournal({ reference: "A-0007", status: "posted" })
    const reversal = buildReversal(original, 8)
    expect(reversal.reference).toBe("A-0008")
  })

  it("net effect is zero (original + reversal = no change)", () => {
    const original = makeJournal({ status: "posted" })
    const reversal = buildReversal(original, 2)

    let netDebit = 0n, netCredit = 0n
    for (const e of [...original.entries, ...reversal.entries]) {
      netDebit  += e.debit
      netCredit += e.credit
    }

    // Both sides net out identically — no real change to any account balance
    expect(netDebit).toBe(netCredit)
    // Each original side appears twice (once forward, once reversed)
    const origDebit = original.entries.reduce((s, e) => s + e.debit, 0n)
    expect(netDebit).toBe(origDebit * 2n)
  })
})

// ─── makeReference ────────────────────────────────────────────────────────────

describe("makeReference", () => {
  it("zero-pads to 4 digits", () => {
    expect(makeReference("A", 1)).toBe("A-0001")
    expect(makeReference("A", 42)).toBe("A-0042")
    expect(makeReference("A", 999)).toBe("A-0999")
    expect(makeReference("A", 1000)).toBe("A-1000")
  })

  it("works with different series prefixes", () => {
    expect(makeReference("K", 1)).toBe("K-0001")
    expect(makeReference("L", 15)).toBe("L-0015")
  })

  it("handles sequences beyond 4 digits gracefully", () => {
    expect(makeReference("A", 10000)).toBe("A-10000")
  })
})

// ─── Reference sequence integrity ────────────────────────────────────────────

describe("reference sequence integrity", () => {
  it("each journal gets a unique reference within a series", () => {
    const refs = Array.from({ length: 100 }, (_, i) => makeReference("A", i + 1))
    const unique = new Set(refs)
    expect(unique.size).toBe(100)
  })

  it("different series produce different references", () => {
    const a = makeReference("A", 1)
    const k = makeReference("K", 1)
    expect(a).not.toBe(k)
    expect(a).toBe("A-0001")
    expect(k).toBe("K-0001")
  })
})

// ─── Tenant isolation ─────────────────────────────────────────────────────────

describe("tenant isolation invariants", () => {
  it("a reversal belongs to the same organization as the original", () => {
    const original = makeJournal({ status: "posted", organizationId: "org-abc" })
    const reversal = buildReversal(original, 2)
    expect(reversal.organizationId).toBe("org-abc")
  })

  it("a reversal belongs to the same fiscal year as the original", () => {
    const original = makeJournal({ status: "posted", fiscalYearId: "fy-xyz" })
    const reversal = buildReversal(original, 2)
    expect(reversal.fiscalYearId).toBe("fy-xyz")
  })
})
