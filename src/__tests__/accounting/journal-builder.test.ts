import { describe, it, expect } from "vitest"

// ─── Pure accounting logic ────────────────────────────────────────────────────
//
// These tests validate the core journal-building rules in isolation.
// No Prisma, no DB — purely the business rules that lib/accounting/ will enforce.

// ─── Types (mirrors lib/accounting/types.ts) ─────────────────────────────────

type JournalStatus = "draft" | "posted" | "voided"

type JournalEntryInput = {
  accountNumber: string
  debit:         bigint
  credit:        bigint
  description?:  string
  vatCode?:      string
}

type Journal = {
  id:             string
  organizationId: string
  fiscalYearId:   string
  reference:      string
  date:           Date
  description:    string
  status:         JournalStatus
  entries:        JournalEntryInput[]
  postedAt?:      Date
  postedByUserId?: string
  voidOf?:        string
  voidedById?:    string
}

// ─── Helpers mirroring lib/accounting/journal.ts ─────────────────────────────

function sumSide(entries: JournalEntryInput[], side: "debit" | "credit"): bigint {
  return entries.reduce((acc, e) => acc + e[side], 0n)
}

function isBalanced(entries: JournalEntryInput[]): boolean {
  return sumSide(entries, "debit") === sumSide(entries, "credit")
}

function validateEntries(entries: JournalEntryInput[]): string | null {
  if (entries.length === 0) return "journal_empty"

  for (const e of entries) {
    if (e.debit < 0n || e.credit < 0n) return "negative_amount"
    if (e.debit > 0n && e.credit > 0n) return "both_sides_nonzero"
    if (e.debit === 0n && e.credit === 0n) return "zero_entry"
  }

  if (!isBalanced(entries)) return "journal_unbalanced"
  return null
}

function buildReversingEntries(entries: JournalEntryInput[]): JournalEntryInput[] {
  return entries.map(e => ({
    ...e,
    debit:  e.credit,
    credit: e.debit,
  }))
}

function canPostJournal(journal: Journal, fiscalYearStatus: "open" | "closed" | "locked"): string | null {
  if (journal.status !== "draft") return "not_draft"
  if (fiscalYearStatus !== "open") return "fiscal_year_not_open"
  return validateEntries(journal.entries)
}

function canVoidJournal(journal: Journal): string | null {
  if (journal.status === "voided") return "already_voided"
  if (journal.status === "draft")  return "not_posted"
  return null
}

// ─── createJournal / validation ───────────────────────────────────────────────

describe("entry validation — validateEntries()", () => {
  it("rejects empty entry list", () => {
    expect(validateEntries([])).toBe("journal_empty")
  })

  it("rejects negative debit", () => {
    const entries = [{ accountNumber: "1510", debit: -100n, credit: 0n }]
    expect(validateEntries(entries)).toBe("negative_amount")
  })

  it("rejects negative credit", () => {
    const entries = [{ accountNumber: "1510", debit: 0n, credit: -100n }]
    expect(validateEntries(entries)).toBe("negative_amount")
  })

  it("rejects entry with both debit and credit > 0", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 100n, credit: 100n },
    ]
    expect(validateEntries(entries)).toBe("both_sides_nonzero")
  })

  it("rejects zero-amount entry", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 0n, credit: 0n },
    ]
    expect(validateEntries(entries)).toBe("zero_entry")
  })

  it("rejects unbalanced journal", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 12500n, credit: 0n },
      { accountNumber: "3001", debit: 0n, credit: 10000n },  // missing VAT row
    ]
    expect(validateEntries(entries)).toBe("journal_unbalanced")
  })

  it("accepts a balanced two-line entry", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 10000n, credit: 0n },
      { accountNumber: "3001", debit: 0n, credit: 10000n },
    ]
    expect(validateEntries(entries)).toBeNull()
  })

  it("accepts a balanced three-line entry (debit one side, two credits)", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 12500n, credit: 0n },
      { accountNumber: "3001", debit: 0n, credit: 10000n },
      { accountNumber: "2610", debit: 0n, credit: 2500n },
    ]
    expect(validateEntries(entries)).toBeNull()
  })

  it("accepts journal with many balanced lines", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 25240n, credit: 0n },
      { accountNumber: "3001", debit: 0n, credit: 16000n },  // 25% moms goods
      { accountNumber: "3051", debit: 0n, credit: 4000n },   // 12% moms services
      { accountNumber: "2610", debit: 0n, credit: 4000n },   // moms 25%
      { accountNumber: "2611", debit: 0n, credit: 480n },    // moms 12%
      { accountNumber: "3101", debit: 0n, credit: 700n },    // 6% moms
      { accountNumber: "2612", debit: 0n, credit: 60n },     // moms 6%
    ]
    expect(validateEntries(entries)).toBeNull()
  })
})

// ─── postJournal ──────────────────────────────────────────────────────────────

describe("postJournal — precondition checks", () => {
  const validEntries: JournalEntryInput[] = [
    { accountNumber: "1510", debit: 12500n, credit: 0n },
    { accountNumber: "3001", debit: 0n, credit: 10000n },
    { accountNumber: "2610", debit: 0n, credit: 2500n },
  ]

  const draftJournal: Journal = {
    id:             "j-001",
    organizationId: "org-A",
    fiscalYearId:   "fy-2025",
    reference:      "A-0001",
    date:           new Date("2025-05-17"),
    description:    "Faktura 2025-0042",
    status:         "draft",
    entries:        validEntries,
  }

  it("allows posting a valid draft journal in an open fiscal year", () => {
    expect(canPostJournal(draftJournal, "open")).toBeNull()
  })

  it("blocks posting an already-posted journal", () => {
    const posted = { ...draftJournal, status: "posted" as const }
    expect(canPostJournal(posted, "open")).toBe("not_draft")
  })

  it("blocks posting a voided journal", () => {
    const voided = { ...draftJournal, status: "voided" as const }
    expect(canPostJournal(voided, "open")).toBe("not_draft")
  })

  it("blocks posting when fiscal year is closed", () => {
    expect(canPostJournal(draftJournal, "closed")).toBe("fiscal_year_not_open")
  })

  it("blocks posting when fiscal year is locked", () => {
    expect(canPostJournal(draftJournal, "locked")).toBe("fiscal_year_not_open")
  })

  it("propagates entry validation errors", () => {
    const unbalanced = {
      ...draftJournal,
      entries: [
        { accountNumber: "1510", debit: 12500n, credit: 0n },
        { accountNumber: "3001", debit: 0n, credit: 10000n },
        // missing VAT row
      ],
    }
    expect(canPostJournal(unbalanced, "open")).toBe("journal_unbalanced")
  })
})

// ─── voidJournal ──────────────────────────────────────────────────────────────

describe("voidJournal — precondition checks", () => {
  const postedJournal: Journal = {
    id:             "j-001",
    organizationId: "org-A",
    fiscalYearId:   "fy-2025",
    reference:      "A-0001",
    date:           new Date("2025-05-17"),
    description:    "Test",
    status:         "posted",
    entries:        [],
  }

  it("allows voiding a posted journal", () => {
    expect(canVoidJournal(postedJournal)).toBeNull()
  })

  it("blocks voiding an already-voided journal", () => {
    expect(canVoidJournal({ ...postedJournal, status: "voided" })).toBe("already_voided")
  })

  it("blocks voiding a draft journal (must post before voiding)", () => {
    expect(canVoidJournal({ ...postedJournal, status: "draft" })).toBe("not_posted")
  })
})

// ─── Reversing entry generation ────────────────────────────────────────────────

describe("buildReversingEntries() — storno", () => {
  const original: JournalEntryInput[] = [
    { accountNumber: "1510", debit: 12500n, credit: 0n, description: "Kundfordran" },
    { accountNumber: "3001", debit: 0n, credit: 10000n, vatCode: "MP1" },
    { accountNumber: "2610", debit: 0n, credit: 2500n },
  ]

  it("swaps debit and credit on every entry", () => {
    const reversed = buildReversingEntries(original)
    expect(reversed[0]).toMatchObject({ debit: 0n, credit: 12500n })
    expect(reversed[1]).toMatchObject({ debit: 10000n, credit: 0n })
    expect(reversed[2]).toMatchObject({ debit: 2500n, credit: 0n })
  })

  it("reversing journal is balanced", () => {
    const reversed = buildReversingEntries(original)
    expect(isBalanced(reversed)).toBe(true)
  })

  it("preserves account number, description, and vatCode", () => {
    const reversed = buildReversingEntries(original)
    expect(reversed[0].accountNumber).toBe("1510")
    expect(reversed[0].description).toBe("Kundfordran")
    expect(reversed[1].vatCode).toBe("MP1")
  })

  it("original + reversing = net zero per account", () => {
    const reversed = buildReversingEntries(original)
    const combined = [...original, ...reversed]
    const netDebit  = sumSide(combined, "debit")
    const netCredit = sumSide(combined, "credit")
    expect(netDebit).toBe(netCredit)
    // Total movement cancels out — each account nets to zero
    const byAccount: Record<string, bigint> = {}
    for (const e of combined) {
      byAccount[e.accountNumber] = (byAccount[e.accountNumber] ?? 0n) + e.debit - e.credit
    }
    for (const net of Object.values(byAccount)) {
      expect(net).toBe(0n)
    }
  })
})

// ─── isBalanced edge cases ────────────────────────────────────────────────────

describe("isBalanced() edge cases", () => {
  it("empty entries are technically balanced but rejected by validateEntries", () => {
    expect(isBalanced([])).toBe(true)       // math: 0 = 0
    expect(validateEntries([])).toBe("journal_empty")  // but invalid
  })

  it("large BigInt amounts balance correctly", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 999_999_999_999n, credit: 0n },
      { accountNumber: "3001", debit: 0n, credit: 799_999_999_999n },
      { accountNumber: "2610", debit: 0n, credit: 200_000_000_000n },
    ]
    expect(isBalanced(entries)).toBe(true)
  })

  it("off-by-one öre is caught", () => {
    const entries: JournalEntryInput[] = [
      { accountNumber: "1510", debit: 12501n, credit: 0n },
      { accountNumber: "3001", debit: 0n, credit: 10000n },
      { accountNumber: "2610", debit: 0n, credit: 2500n },
    ]
    expect(isBalanced(entries)).toBe(false)
    expect(validateEntries(entries)).toBe("journal_unbalanced")
  })
})
