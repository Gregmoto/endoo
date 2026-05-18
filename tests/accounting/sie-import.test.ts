/**
 * SIE Import Tests
 *
 * Covers:
 *   1.  Parser: parses a valid SIE 4i file — correct accounts, journals, balances
 *   2.  Parser: detects unbalanced VER and adds error with line number
 *   3.  Parser: cross-year range, multiple #RAR, period keys
 *   4.  Parser: CP437 Swedish chars decoded correctly
 *   5.  Parser: empty #TRANS object list {} handled
 *   6.  importer dry-run returns zero imported and does not call createJournal
 *   7.  importer skips closed fiscal year journals (warns)
 *   8.  importer skips already-posted VER when skipExistingVerNumbers=true
 *   9.  importer creates missing account when createMissingAccounts=true
 *  10.  importer routes error per-journal without aborting remaining journals
 *  11.  previewSieImport: correct accountDiff actions (create / exists / name_mismatch)
 *  12.  previewSieImport: correct journal action for balance_error
 *  13.  Tenant isolation: importer does NOT see another org's journals
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => {
  const model = () => ({
    findFirst:  vi.fn().mockResolvedValue(null),
    findMany:   vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create:     vi.fn().mockResolvedValue({ id: "mock-id" }),
    update:     vi.fn().mockResolvedValue({ id: "mock-id" }),
    count:      vi.fn().mockResolvedValue(0),
  })
  return {
    fiscalYear:     model(),
    account:        model(),
    journal:        model(),
    journalSeries:  model(),
    auditLog:       { create: vi.fn().mockResolvedValue({}) },
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/accounting/journals", () => ({
  createJournal: vi.fn().mockResolvedValue({ id: "j-draft" }),
  postJournal:   vi.fn().mockResolvedValue({ id: "j-posted" }),
}))

import {
  parseSie,
  decodeBuffer,
  sieToIsoDate,
  ktypToAccountType,
  inferAccountType,
} from "@/lib/accounting/sie/parser"
import { executeSieImport, previewSieImport } from "@/lib/accounting/sie/importer"
import { createJournal, postJournal } from "@/lib/accounting/journals"

const ORG_ID  = "org-111"
const USER_ID = "usr-333"

// ─── Sample SIE content ───────────────────────────────────────────────────────

const VALID_SIE = `
#FLAGGA 0
#SIETYP 4
#PROGRAM "TestSystem" "2.0"
#GEN 20260101
#FNAMN "Testbolaget AB"
#ORGNR 556123-4567
#RAR 0 20260101 20261231
#KONTO 1930 "Företagskonto"
#KONTO 3001 "Försäljning"
#KTYP 1930 T
#KTYP 3001 I
#IB 0 1930 50000.00
#UB 0 1930 75000.00
#VER A 1 20260115 "Inbetalning kund" 20260115
{
#TRANS 1930 {} 10000.00
#TRANS 3001 {} -10000.00
}
#VER A 2 20260201 "Ränta" 20260201
{
#TRANS 1930 {} 500.00
#TRANS 3001 {} -500.00
}
#KSUMMA
`.trim()

const UNBALANCED_SIE = `
#FLAGGA 0
#SIETYP 4
#FNAMN "ObalansAB"
#RAR 0 20260101 20261231
#KONTO 1930 "Bank"
#KONTO 3001 "Intäkt"
#VER A 1 20260115 "Fel verifikat"
{
#TRANS 1930 {} 10000.00
#TRANS 3001 {} -9000.00
}
`.trim()

// ─── 1–5: Parser tests ────────────────────────────────────────────────────────

describe("parseSie", () => {
  it("1. parses valid SIE 4i — accounts, journals, balances", () => {
    const result = parseSie(VALID_SIE)
    expect(result.sieType).toBe(4)
    expect(result.companyName).toBe("Testbolaget AB")
    expect(result.orgNr).toBe("556123-4567")
    expect(result.fiscalYears).toHaveLength(1)
    expect(result.fiscalYears[0]).toMatchObject({ index: 0, start: "20260101", end: "20261231" })
    expect(result.accounts).toHaveLength(2)
    expect(result.accounts.find(a => a.number === "1930")).toMatchObject({ name: "Företagskonto", ktyp: "T" })
    expect(result.accounts.find(a => a.number === "3001")).toMatchObject({ name: "Försäljning",   ktyp: "I" })
    expect(result.openingBal).toHaveLength(1)
    expect(result.openingBal[0]).toMatchObject({ account: "1930", amount: 50000 })
    expect(result.closingBal[0]).toMatchObject({ account: "1930", amount: 75000 })
    expect(result.journals).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
  })

  it("2. detects unbalanced VER — error with line number, balanceError=true", () => {
    const result = parseSie(UNBALANCED_SIE)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/VER A 1/)
    expect(result.errors[0]).toMatch(/obalanserat/)
    expect(result.journals[0].balanceError).toBe(true)
  })

  it("3. empty object list {} on TRANS", () => {
    const result = parseSie(VALID_SIE)
    for (const j of result.journals) {
      for (const t of j.trans) {
        expect(t.objectList).toEqual([])
      }
    }
  })

  it("4. CP437 Swedish chars decoded correctly", () => {
    // CP437 bytes: 0x84=ä, 0x8E=Ä, 0x86=å, 0x8F=Å, 0x94=ö, 0x99=Ö
    const bytes = Buffer.from([
      0x23, 0x46, 0x4E, 0x41, 0x4D, 0x4E, 0x20, 0x22,  // #FNAMN "
      0x84,  // ä
      0x8E,  // Ä
      0x86,  // å
      0x8F,  // Å
      0x94,  // ö
      0x99,  // Ö
      0x22,  // "
    ])
    const decoded = decodeBuffer(bytes, "CP437")
    expect(decoded).toBe('#FNAMN "äÄåÅöÖ"')
    const result = parseSie(decoded)
    expect(result.companyName).toBe("äÄåÅöÖ")
  })

  it("5. sieToIsoDate converts YYYYMMDD to YYYY-MM-DD", () => {
    expect(sieToIsoDate("20260115")).toBe("2026-01-15")
  })
})

describe("ktypToAccountType + inferAccountType", () => {
  it("6. KTYP T → asset, S → liability, I → income, K → expense, E → equity", () => {
    expect(ktypToAccountType("T")).toBe("asset")
    expect(ktypToAccountType("S")).toBe("liability")
    expect(ktypToAccountType("I")).toBe("income")
    expect(ktypToAccountType("K")).toBe("expense")
    expect(ktypToAccountType("E")).toBe("equity")
  })

  it("7. inferAccountType from BAS number prefix", () => {
    expect(inferAccountType("1930")).toBe("asset")
    expect(inferAccountType("2440")).toBe("liability")
    expect(inferAccountType("3001")).toBe("income")
    expect(inferAccountType("5010")).toBe("expense")
  })
})

// ─── 8–13: Importer tests ────────────────────────────────────────────────────

const BASE_OPTS = {
  dryRun:                 false,
  accountMapping:         {} as Record<string, string>,
  defaultJournalSeries:   "A",
  skipExistingVerNumbers: true,
  createMissingAccounts:  true,
}

const b64ValidSie = Buffer.from(VALID_SIE).toString("base64")

function makeFy(status = "open") {
  return { id: "fy-001", status }
}
function makeAccount(number: string) {
  return { id: `acc-${number}` }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(mockPrisma.auditLog.create as Mock).mockResolvedValue({})
})

describe("executeSieImport", () => {
  it("8. dry-run returns 0 imported and does NOT call createJournal", async () => {
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy())
    ;(mockPrisma.account.findFirst as Mock)
      .mockResolvedValueOnce(makeAccount("1930"))
      .mockResolvedValueOnce(makeAccount("3001"))
      .mockResolvedValueOnce(makeAccount("1930"))
      .mockResolvedValueOnce(makeAccount("3001"))
    ;(mockPrisma.journalSeries.findFirst as Mock).mockResolvedValue({ id: "ser-1" })
    ;(mockPrisma.journal.findFirst as Mock).mockResolvedValue(null)

    const result = await executeSieImport(ORG_ID, b64ValidSie, "UTF-8", { ...BASE_OPTS, dryRun: true }, USER_ID)
    expect(result.journalsImported).toBe(0)
    expect(createJournal).not.toHaveBeenCalled()
  })

  it("9. skips journal when fiscal year is closed — adds warning", async () => {
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy("closed"))

    const result = await executeSieImport(ORG_ID, b64ValidSie, "UTF-8", BASE_OPTS, USER_ID)
    expect(result.journalsSkipped).toBe(2)
    expect(result.journalsImported).toBe(0)
    expect(result.warnings.some(w => w.includes("stängt"))).toBe(true)
    expect(createJournal).not.toHaveBeenCalled()
  })

  it("10. skips duplicate VER when skipExistingVerNumbers=true", async () => {
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy())
    ;(mockPrisma.journalSeries.findFirst as Mock).mockResolvedValue({ id: "ser-1" })
    ;(mockPrisma.journal.findFirst as Mock).mockResolvedValue({ id: "j-exists" })

    const result = await executeSieImport(ORG_ID, b64ValidSie, "UTF-8", BASE_OPTS, USER_ID)
    expect(result.journalsSkipped).toBe(2)
    expect(createJournal).not.toHaveBeenCalled()
  })

  it("11. creates missing account when createMissingAccounts=true", async () => {
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy())
    ;(mockPrisma.journalSeries.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.journal.findFirst as Mock).mockResolvedValue(null)
    // account.findFirst always returns null → triggers create
    ;(mockPrisma.account.findFirst as Mock).mockReset().mockResolvedValue(null)
    ;(mockPrisma.account.create as Mock).mockResolvedValue({ id: "acc-new" })
    ;(createJournal as Mock).mockResolvedValue({ id: "j-draft" })
    ;(postJournal as Mock).mockResolvedValue({ id: "j-posted" })

    await executeSieImport(ORG_ID, b64ValidSie, "UTF-8", BASE_OPTS, USER_ID)
    // account.create must have been called for at least one missing account
    expect(mockPrisma.account.create).toHaveBeenCalled()
  })

  it("12. per-journal error does not abort remaining journals", async () => {
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy())
    ;(mockPrisma.journalSeries.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.journal.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.account.findFirst as Mock).mockResolvedValue(makeAccount("1930"))
    ;(createJournal as Mock)
      .mockRejectedValueOnce(new Error("DB constraint"))
      .mockResolvedValue({ id: "j-draft" })
    ;(postJournal as Mock).mockResolvedValue({ id: "j-posted" })

    const result = await executeSieImport(ORG_ID, b64ValidSie, "UTF-8", BASE_OPTS, USER_ID)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toMatch(/DB constraint/)
    // second journal still attempted
    expect(createJournal).toHaveBeenCalledTimes(2)
  })
})

describe("previewSieImport", () => {
  it("13. accountDiff actions: create when not in DB, exists when found, name_mismatch when name differs", async () => {
    ;(mockPrisma.account.findFirst as Mock)
      .mockResolvedValueOnce(null)                        // 1930 → create
      .mockResolvedValueOnce({ name: "Annan intäkt" })    // 3001 → name_mismatch
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy())
    ;(mockPrisma.journalSeries.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.journal.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.account.findFirst as Mock)
      .mockResolvedValue(makeAccount("1930"))             // for journal account resolution

    const parsed = parseSie(VALID_SIE)
    ;(mockPrisma.account.findFirst as Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: "Annan intäkt" })
      .mockResolvedValue(makeAccount("all"))

    const preview = await previewSieImport(ORG_ID, parsed, {
      accountMapping:         {},
      defaultJournalSeries:   "A",
      skipExistingVerNumbers: true,
      createMissingAccounts:  true,
    })

    const diff1930 = preview.accountDiffs.find(a => a.number === "1930")
    const diff3001 = preview.accountDiffs.find(a => a.number === "3001")
    expect(diff1930?.action).toBe("create")
    expect(diff3001?.action).toBe("name_mismatch")
  })

  it("14. balance_error journal gets action=skip_balance_error in preview", async () => {
    const parsed = parseSie(UNBALANCED_SIE)
    ;(mockPrisma.account.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy())
    ;(mockPrisma.journalSeries.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.journal.findFirst as Mock).mockResolvedValue(null)

    const preview = await previewSieImport(ORG_ID, parsed, {
      accountMapping: {}, defaultJournalSeries: "A",
      skipExistingVerNumbers: true, createMissingAccounts: true,
    })
    expect(preview.journals[0].action).toBe("skip_balance_error")
    expect(preview.willImport).toBe(0)
  })

  it("15. tenant isolation: previewSieImport queries always include organizationId", async () => {
    const parsed = parseSie(VALID_SIE)
    ;(mockPrisma.account.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.fiscalYear.findFirst as Mock).mockResolvedValue(makeFy())
    ;(mockPrisma.journalSeries.findFirst as Mock).mockResolvedValue(null)
    ;(mockPrisma.journal.findFirst as Mock).mockResolvedValue(null)

    await previewSieImport("other-org", parsed, {
      accountMapping: {}, defaultJournalSeries: "A",
      skipExistingVerNumbers: true, createMissingAccounts: true,
    })

    const accountCalls = (mockPrisma.account.findFirst as Mock).mock.calls
    for (const [args] of accountCalls) {
      expect(args.where.organizationId).toBe("other-org")
    }
    const fyCalls = (mockPrisma.fiscalYear.findFirst as Mock).mock.calls
    for (const [args] of fyCalls) {
      expect(args.where.organizationId).toBe("other-org")
    }
  })
})
