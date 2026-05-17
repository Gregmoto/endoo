import { describe, it, expect } from "vitest"

// ─── VAT calculation and mapping ──────────────────────────────────────────────
//
// Tests VAT code mapping, per-period aggregation, and the Swedish VAT
// declaration format (Skatteverket ruta-mapping).
// No DB — pure calculation functions.

// ─── VAT mapping table (mirrors lib/accounting/vat.ts) ───────────────────────

type VatCode = "MP1" | "MP2" | "MP3" | "MF"

type VatMapping = {
  vatCode:       VatCode
  incomeAccount: string
  vatAccount:    string
  ruta:          string    // SKV box: "05" | "06" | "07" | ""
}

const VAT_RATE_MAP: Record<string, VatMapping> = {
  "0.25": { vatCode: "MP1", incomeAccount: "3001", vatAccount: "2610", ruta: "05" },
  "0.12": { vatCode: "MP2", incomeAccount: "3051", vatAccount: "2611", ruta: "06" },
  "0.06": { vatCode: "MP3", incomeAccount: "3101", vatAccount: "2612", ruta: "07" },
  "0":    { vatCode: "MF",  incomeAccount: "3001", vatAccount: "",     ruta: ""   },
}

function getVatMapping(taxRate: number): VatMapping {
  return VAT_RATE_MAP[String(taxRate)] ?? VAT_RATE_MAP["0.25"]
}

// VAT amount calculation (mirrors calcTaxAmount — rounds to nearest öre)
function calcVat(lineTotal: bigint, taxRate: number): bigint {
  return BigInt(Math.round(Number(lineTotal) * taxRate))
}

// ─── VAT period aggregation (mirrors lib/accounting/vatPeriod.ts) ─────────────

type JournalEntry = {
  accountNumber: string
  credit:        bigint
  debit:         bigint
  vatCode:       string | null
  journalDate:   string   // ISO date string
}

type VatPeriodSummary = {
  vat25: bigint    // 2610 net credit
  vat12: bigint    // 2611 net credit
  vat6:  bigint    // 2612 net credit
  total: bigint
}

function aggregateVatPeriod(
  entries: JournalEntry[],
  from: string,
  to: string
): VatPeriodSummary {
  const inPeriod = entries.filter(e => e.journalDate >= from && e.journalDate <= to)

  function netCredit(accountNumber: string): bigint {
    return inPeriod
      .filter(e => e.accountNumber === accountNumber)
      .reduce((s, e) => s + e.credit - e.debit, 0n)
  }

  const vat25 = netCredit("2610")
  const vat12 = netCredit("2611")
  const vat6  = netCredit("2612")

  return { vat25, vat12, vat6, total: vat25 + vat12 + vat6 }
}

// ─── VAT rate → account mapping ───────────────────────────────────────────────

describe("VAT rate to account mapping", () => {
  it("25% → MP1, 2610, ruta 05", () => {
    const m = getVatMapping(0.25)
    expect(m.vatCode).toBe("MP1")
    expect(m.vatAccount).toBe("2610")
    expect(m.incomeAccount).toBe("3001")
    expect(m.ruta).toBe("05")
  })

  it("12% → MP2, 2611, ruta 06", () => {
    const m = getVatMapping(0.12)
    expect(m.vatCode).toBe("MP2")
    expect(m.vatAccount).toBe("2611")
    expect(m.incomeAccount).toBe("3051")
    expect(m.ruta).toBe("06")
  })

  it("6% → MP3, 2612, ruta 07", () => {
    const m = getVatMapping(0.06)
    expect(m.vatCode).toBe("MP3")
    expect(m.vatAccount).toBe("2612")
    expect(m.incomeAccount).toBe("3101")
    expect(m.ruta).toBe("07")
  })

  it("0% → MF, no VAT account, no ruta", () => {
    const m = getVatMapping(0)
    expect(m.vatCode).toBe("MF")
    expect(m.vatAccount).toBe("")
    expect(m.ruta).toBe("")
  })
})

// ─── VAT amount calculation ───────────────────────────────────────────────────

describe("calcVat() — Swedish rounding rules", () => {
  it("25% of 10 000 öre = 2 500", () => {
    expect(calcVat(10000n, 0.25)).toBe(2500n)
  })

  it("12% of 10 000 öre = 1 200", () => {
    expect(calcVat(10000n, 0.12)).toBe(1200n)
  })

  it("6% of 10 000 öre = 600", () => {
    expect(calcVat(10000n, 0.06)).toBe(600n)
  })

  it("0% of any amount = 0", () => {
    expect(calcVat(99999n, 0)).toBe(0n)
  })

  it("rounds 25% of 9 999 öre to nearest öre", () => {
    // 9999 × 0.25 = 2499.75 → rounds to 2500
    expect(calcVat(9999n, 0.25)).toBe(2500n)
  })

  it("rounds 12% of 9 999 öre correctly", () => {
    // 9999 × 0.12 = 1199.88 → rounds to 1200
    expect(calcVat(9999n, 0.12)).toBe(1200n)
  })

  it("rounds 6% of 9 999 öre correctly", () => {
    // 9999 × 0.06 = 599.94 → rounds to 600
    expect(calcVat(9999n, 0.06)).toBe(600n)
  })

  it("handles large amounts without overflow", () => {
    // 1 000 000 kr = 100 000 000 öre
    const lineTotal = 100_000_000n
    expect(calcVat(lineTotal, 0.25)).toBe(25_000_000n)
  })
})

// ─── VAT period aggregation ───────────────────────────────────────────────────

describe("aggregateVatPeriod() — monthly VAT summary", () => {
  const ledger: JournalEntry[] = [
    // Invoice 1: 10 000 kr + 25% moms — Jan
    { accountNumber: "2610", debit: 0n,    credit: 2500n, vatCode: "MP1", journalDate: "2025-01-15" },
    // Invoice 2: 4 000 kr + 12% moms — Jan
    { accountNumber: "2611", debit: 0n,    credit: 480n,  vatCode: "MP2", journalDate: "2025-01-20" },
    // Invoice 3: 8 000 kr + 25% moms — Feb
    { accountNumber: "2610", debit: 0n,    credit: 2000n, vatCode: "MP1", journalDate: "2025-02-10" },
    // Credit note: reverses Jan invoice 1 — Mar
    { accountNumber: "2610", debit: 2500n, credit: 0n,    vatCode: "MP1", journalDate: "2025-03-01" },
    // Invoice 4: 5 000 kr + 6% moms — Mar
    { accountNumber: "2612", debit: 0n,    credit: 300n,  vatCode: "MP3", journalDate: "2025-03-15" },
  ]

  it("January: vat25=2500, vat12=480, vat6=0", () => {
    const summary = aggregateVatPeriod(ledger, "2025-01-01", "2025-01-31")
    expect(summary.vat25).toBe(2500n)
    expect(summary.vat12).toBe(480n)
    expect(summary.vat6).toBe(0n)
    expect(summary.total).toBe(2980n)
  })

  it("February: vat25=2000, vat12=0, vat6=0", () => {
    const summary = aggregateVatPeriod(ledger, "2025-02-01", "2025-02-28")
    expect(summary.vat25).toBe(2000n)
    expect(summary.vat12).toBe(0n)
    expect(summary.total).toBe(2000n)
  })

  it("March: credit note reduces vat25 to -2500, vat6=300", () => {
    const summary = aggregateVatPeriod(ledger, "2025-03-01", "2025-03-31")
    expect(summary.vat25).toBe(-2500n)   // credit note reversal
    expect(summary.vat6).toBe(300n)
    expect(summary.total).toBe(-2200n)
  })

  it("Q1 total: all three months", () => {
    const summary = aggregateVatPeriod(ledger, "2025-01-01", "2025-03-31")
    // vat25: 2500 + 2000 - 2500 = 2000
    // vat12: 480
    // vat6:  300
    expect(summary.vat25).toBe(2000n)
    expect(summary.vat12).toBe(480n)
    expect(summary.vat6).toBe(300n)
    expect(summary.total).toBe(2780n)
  })

  it("empty period returns zero", () => {
    const summary = aggregateVatPeriod(ledger, "2024-01-01", "2024-12-31")
    expect(summary.vat25).toBe(0n)
    expect(summary.vat12).toBe(0n)
    expect(summary.vat6).toBe(0n)
    expect(summary.total).toBe(0n)
  })
})

// ─── Swedish VAT declaration format ───────────────────────────────────────────
// Ruta-mapping for Skatteverket

describe("SKV ruta mapping", () => {
  type SkvDeclaration = {
    ruta05: bigint   // 25% moms
    ruta06: bigint   // 12% moms
    ruta07: bigint   // 6% moms
    ruta49: bigint   // Total moms att betala/återfå
  }

  function buildSkvDeclaration(summary: VatPeriodSummary): SkvDeclaration {
    return {
      ruta05: summary.vat25,
      ruta06: summary.vat12,
      ruta07: summary.vat6,
      ruta49: summary.total,
    }
  }

  it("Q1 declaration maps correctly to ruta fields", () => {
    const summary: VatPeriodSummary = { vat25: 2000n, vat12: 480n, vat6: 300n, total: 2780n }
    const decl = buildSkvDeclaration(summary)
    expect(decl.ruta05).toBe(2000n)
    expect(decl.ruta06).toBe(480n)
    expect(decl.ruta07).toBe(300n)
    expect(decl.ruta49).toBe(2780n)
  })

  it("ruta49 always equals ruta05 + ruta06 + ruta07", () => {
    const summaries: VatPeriodSummary[] = [
      { vat25: 5000n, vat12: 1200n, vat6: 300n,  total: 6500n },
      { vat25: 0n,    vat12: 0n,    vat6: 0n,    total: 0n    },
      { vat25: -500n, vat12: 200n,  vat6: 0n,    total: -300n },
    ]
    for (const s of summaries) {
      const decl = buildSkvDeclaration(s)
      expect(decl.ruta49).toBe(decl.ruta05 + decl.ruta06 + decl.ruta07)
    }
  })
})

// ─── VAT on mixed-rate invoice (realistic scenario) ───────────────────────────

describe("multi-rate VAT on single invoice", () => {
  // Restaurangfaktura: mat (12%) + alkohol (25%) + kaffe (12%)
  const lines = [
    { description: "Lunch buffé",  lineTotal: 8000n, taxRate: 0.12 },
    { description: "Vin",          lineTotal: 4000n, taxRate: 0.25 },
    { description: "Kaffe",        lineTotal: 2000n, taxRate: 0.12 },
  ]

  it("computes correct VAT per rate", () => {
    const vat12 = lines
      .filter(l => l.taxRate === 0.12)
      .reduce((s, l) => s + calcVat(l.lineTotal, l.taxRate), 0n)
    const vat25 = lines
      .filter(l => l.taxRate === 0.25)
      .reduce((s, l) => s + calcVat(l.lineTotal, l.taxRate), 0n)

    expect(vat12).toBe(1200n)  // (8000 + 2000) × 0.12 = 1200
    expect(vat25).toBe(1000n)  // 4000 × 0.25 = 1000
  })

  it("total invoice amount = subtotal + all VAT", () => {
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0n)
    const totalVat = lines.reduce((s, l) => s + calcVat(l.lineTotal, l.taxRate), 0n)
    expect(subtotal).toBe(14000n)
    expect(totalVat).toBe(2200n)
    expect(subtotal + totalVat).toBe(16200n)
  })

  it("maps each rate to correct VAT account", () => {
    const mappings = [...new Set(lines.map(l => l.taxRate))].map(r => ({
      rate: r,
      account: getVatMapping(r).vatAccount,
    }))
    const m12 = mappings.find(m => m.rate === 0.12)!
    const m25 = mappings.find(m => m.rate === 0.25)!
    expect(m12.account).toBe("2611")
    expect(m25.account).toBe("2610")
  })
})
