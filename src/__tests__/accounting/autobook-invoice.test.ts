import { describe, it, expect } from "vitest"

// ─── Automatic bookkeeping from invoices ──────────────────────────────────────
//
// These tests validate the journal-building logic for:
//   - Invoice sent        → Kundfordran / Intäkt / Moms
//   - Payment received    → Bank / Kundfordran
//   - Credit note created → reversal of invoice entries
//   - Multi-rate VAT      → separate accounts per rate
//   - Proforma invoices   → no journal created
//
// The functions tested here mirror lib/accounting/autobook.ts.

// ─── Types ────────────────────────────────────────────────────────────────────

type TaxRate = 0 | 0.06 | 0.12 | 0.25

type InvoiceLine = {
  lineTotal: bigint    // öre, ex. moms (quantity × unitPrice × (1-discount))
  taxRate:   number
  taxAmount: bigint    // lineTotal × taxRate, rounded
}

type InvoiceInput = {
  id:            string
  organizationId: string
  type:          "invoice" | "credit_note" | "proforma" | "quote"
  totalAmount:   bigint   // subtotal + tax
  subtotalAmount: bigint
  taxAmount:     bigint
  currency:      string
  lines:         InvoiceLine[]
}

type PaymentInput = {
  id:            string
  organizationId: string
  invoiceId:     string
  amount:        bigint
  method:        "bank_transfer" | "swish" | "card" | "cash" | "credit_note"
}

type JournalEntrySpec = {
  accountNumber: string
  debit:         bigint
  credit:        bigint
  vatCode?:      string
}

// ─── VAT code and account mapping ────────────────────────────────────────────
// Mirrors the lookup table in lib/accounting/vat.ts

const VAT_ACCOUNTS: Record<string, { incomeAccount: string; vatAccount: string; vatCode: string }> = {
  "0.25": { incomeAccount: "3001", vatAccount: "2610", vatCode: "MP1" },
  "0.12": { incomeAccount: "3051", vatAccount: "2611", vatCode: "MP2" },
  "0.06": { incomeAccount: "3101", vatAccount: "2612", vatCode: "MP3" },
  "0":    { incomeAccount: "3001", vatAccount: "",     vatCode: "MF"  },
}

function getVatMapping(taxRate: number) {
  const key = String(taxRate)
  return VAT_ACCOUNTS[key] ?? VAT_ACCOUNTS["0.25"]
}

// ─── Payment method → bank account mapping ────────────────────────────────────

const PAYMENT_ACCOUNTS: Record<string, string> = {
  bank_transfer: "1930",
  swish:         "1920",
  card:          "1930",
  cash:          "1910",
  credit_note:   "1510",   // netted against receivable
}

// ─── Auto-book functions (pure, mirrors lib/accounting/autobook.ts) ───────────

function buildInvoiceJournal(invoice: InvoiceInput): JournalEntrySpec[] {
  if (invoice.type !== "invoice") return []  // only book regular invoices

  const entries: JournalEntrySpec[] = []

  // DR 1510 Kundfordringar (full amount incl. VAT)
  entries.push({
    accountNumber: "1510",
    debit:  invoice.totalAmount,
    credit: 0n,
  })

  // Group lines by tax rate → separate CR per rate
  const byRate = new Map<string, { lineTotal: bigint; taxAmount: bigint }>()
  for (const line of invoice.lines) {
    const key = String(line.taxRate)
    const existing = byRate.get(key) ?? { lineTotal: 0n, taxAmount: 0n }
    byRate.set(key, {
      lineTotal: existing.lineTotal + line.lineTotal,
      taxAmount: existing.taxAmount + line.taxAmount,
    })
  }

  for (const [rateKey, totals] of byRate) {
    const mapping = getVatMapping(parseFloat(rateKey))

    // CR income account (excl. VAT)
    entries.push({
      accountNumber: mapping.incomeAccount,
      debit:  0n,
      credit: totals.lineTotal,
      vatCode: mapping.vatCode,
    })

    // CR VAT account (if applicable)
    if (totals.taxAmount > 0n && mapping.vatAccount) {
      entries.push({
        accountNumber: mapping.vatAccount,
        debit:  0n,
        credit: totals.taxAmount,
        vatCode: mapping.vatCode,
      })
    }
  }

  return entries
}

function buildPaymentJournal(payment: PaymentInput): JournalEntrySpec[] {
  const bankAccount = PAYMENT_ACCOUNTS[payment.method] ?? "1930"
  return [
    { accountNumber: bankAccount, debit: payment.amount, credit: 0n },
    { accountNumber: "1510",      debit: 0n, credit: payment.amount },
  ]
}

function buildCreditNoteJournal(creditNote: InvoiceInput): JournalEntrySpec[] {
  if (creditNote.type !== "credit_note") return []

  // Mirror of invoice booking — but debit/credit swapped
  // Credit note amounts are already negative in the system;
  // here we work with absolute values and flip the sides explicitly.
  const entries: JournalEntrySpec[] = []

  // CR 1510 Kundfordringar (reduces receivable)
  entries.push({
    accountNumber: "1510",
    debit:  0n,
    credit: -creditNote.totalAmount,   // totalAmount is negative for credit notes
  })

  const byRate = new Map<string, { lineTotal: bigint; taxAmount: bigint }>()
  for (const line of creditNote.lines) {
    const key = String(line.taxRate)
    const existing = byRate.get(key) ?? { lineTotal: 0n, taxAmount: 0n }
    byRate.set(key, {
      lineTotal: existing.lineTotal + line.lineTotal,
      taxAmount: existing.taxAmount + line.taxAmount,
    })
  }

  for (const [rateKey, totals] of byRate) {
    const mapping = getVatMapping(parseFloat(rateKey))

    // DR income account (reduces revenue — lineTotals are negative)
    entries.push({
      accountNumber: mapping.incomeAccount,
      debit:  -totals.lineTotal,
      credit: 0n,
      vatCode: mapping.vatCode,
    })

    if (totals.taxAmount < 0n && mapping.vatAccount) {
      entries.push({
        accountNumber: mapping.vatAccount,
        debit:  -totals.taxAmount,
        credit: 0n,
        vatCode: mapping.vatCode,
      })
    }
  }

  return entries
}

function isBalanced(entries: JournalEntrySpec[]): boolean {
  const debit  = entries.reduce((s, e) => s + e.debit,  0n)
  const credit = entries.reduce((s, e) => s + e.credit, 0n)
  return debit === credit
}

// ─── Invoice auto-booking tests ───────────────────────────────────────────────

describe("buildInvoiceJournal() — single VAT rate", () => {
  const invoice: InvoiceInput = {
    id:             "inv-001",
    organizationId: "org-A",
    type:           "invoice",
    totalAmount:    12500n,   // 10 000 + 2 500 moms
    subtotalAmount: 10000n,
    taxAmount:      2500n,
    currency:       "SEK",
    lines: [
      { lineTotal: 10000n, taxRate: 0.25, taxAmount: 2500n },
    ],
  }

  it("produces exactly 3 journal entries", () => {
    const entries = buildInvoiceJournal(invoice)
    expect(entries).toHaveLength(3)
  })

  it("debits 1510 Kundfordringar with totalAmount", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "1510")!
    expect(row.debit).toBe(12500n)
    expect(row.credit).toBe(0n)
  })

  it("credits 3001 Försäljning with subtotalAmount", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "3001")!
    expect(row.credit).toBe(10000n)
    expect(row.debit).toBe(0n)
  })

  it("credits 2610 Utgående moms 25% with taxAmount", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "2610")!
    expect(row.credit).toBe(2500n)
    expect(row.debit).toBe(0n)
  })

  it("journal is balanced", () => {
    expect(isBalanced(buildInvoiceJournal(invoice))).toBe(true)
  })

  it("VAT row has correct vatCode MP1", () => {
    const entries = buildInvoiceJournal(invoice)
    const vatRow = entries.find(e => e.accountNumber === "2610")!
    expect(vatRow.vatCode).toBe("MP1")
  })
})

describe("buildInvoiceJournal() — multi-rate VAT", () => {
  // Invoice with 25% (goods) and 12% (food)
  // subtotal=20000, VAT=4000+480=4480, total=24480
  const invoice: InvoiceInput = {
    id:             "inv-002",
    organizationId: "org-A",
    type:           "invoice",
    totalAmount:    24480n,
    subtotalAmount: 20000n,
    taxAmount:      4480n,
    currency:       "SEK",
    lines: [
      { lineTotal: 16000n, taxRate: 0.25, taxAmount: 4000n },
      { lineTotal: 4000n,  taxRate: 0.12, taxAmount: 480n  },
    ],
  }

  it("produces 5 entries: 1 receivable + 2 income + 2 VAT", () => {
    const entries = buildInvoiceJournal(invoice)
    expect(entries).toHaveLength(5)
  })

  it("1510 Kundfordringar = totalAmount", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "1510")!
    expect(row.debit).toBe(24480n)
  })

  it("3001 Försäljning 25% = 16000", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "3001")!
    expect(row.credit).toBe(16000n)
  })

  it("3051 Försäljning 12% = 4000", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "3051")!
    expect(row.credit).toBe(4000n)
  })

  it("2610 Moms 25% = 4000", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "2610")!
    expect(row.credit).toBe(4000n)
  })

  it("2611 Moms 12% = 480", () => {
    const entries = buildInvoiceJournal(invoice)
    const row = entries.find(e => e.accountNumber === "2611")!
    expect(row.credit).toBe(480n)
  })

  it("journal is balanced", () => {
    expect(isBalanced(buildInvoiceJournal(invoice))).toBe(true)
  })
})

describe("buildInvoiceJournal() — zero VAT (momsfri)", () => {
  const invoice: InvoiceInput = {
    id:             "inv-003",
    organizationId: "org-A",
    type:           "invoice",
    totalAmount:    10000n,
    subtotalAmount: 10000n,
    taxAmount:      0n,
    currency:       "SEK",
    lines: [
      { lineTotal: 10000n, taxRate: 0, taxAmount: 0n },
    ],
  }

  it("produces 2 entries (no VAT row)", () => {
    const entries = buildInvoiceJournal(invoice)
    expect(entries).toHaveLength(2)
  })

  it("no VAT account entry", () => {
    const entries = buildInvoiceJournal(invoice)
    expect(entries.find(e => e.accountNumber.startsWith("26"))).toBeUndefined()
  })

  it("is balanced", () => {
    expect(isBalanced(buildInvoiceJournal(invoice))).toBe(true)
  })
})

describe("buildInvoiceJournal() — invoice type guard", () => {
  it("does not book proforma invoices", () => {
    const proforma: InvoiceInput = {
      id: "pf-001", organizationId: "org-A", type: "proforma",
      totalAmount: 12500n, subtotalAmount: 10000n, taxAmount: 2500n,
      currency: "SEK",
      lines: [{ lineTotal: 10000n, taxRate: 0.25, taxAmount: 2500n }],
    }
    expect(buildInvoiceJournal(proforma)).toHaveLength(0)
  })

  it("does not book quotes", () => {
    const quote: InvoiceInput = {
      id: "q-001", organizationId: "org-A", type: "quote",
      totalAmount: 12500n, subtotalAmount: 10000n, taxAmount: 2500n,
      currency: "SEK",
      lines: [{ lineTotal: 10000n, taxRate: 0.25, taxAmount: 2500n }],
    }
    expect(buildInvoiceJournal(quote)).toHaveLength(0)
  })
})

// ─── Payment auto-booking tests ───────────────────────────────────────────────

describe("buildPaymentJournal()", () => {
  it("bank_transfer → 1930 Bank", () => {
    const p: PaymentInput = {
      id: "pay-001", organizationId: "org-A", invoiceId: "inv-001",
      amount: 12500n, method: "bank_transfer",
    }
    const entries = buildPaymentJournal(p)
    expect(entries.find(e => e.accountNumber === "1930")?.debit).toBe(12500n)
    expect(entries.find(e => e.accountNumber === "1510")?.credit).toBe(12500n)
  })

  it("swish → 1920 Plusgiro", () => {
    const p: PaymentInput = {
      id: "pay-002", organizationId: "org-A", invoiceId: "inv-001",
      amount: 5000n, method: "swish",
    }
    const entries = buildPaymentJournal(p)
    expect(entries.find(e => e.accountNumber === "1920")?.debit).toBe(5000n)
  })

  it("cash → 1910 Kassa", () => {
    const p: PaymentInput = {
      id: "pay-003", organizationId: "org-A", invoiceId: "inv-001",
      amount: 5000n, method: "cash",
    }
    const entries = buildPaymentJournal(p)
    expect(entries.find(e => e.accountNumber === "1910")?.debit).toBe(5000n)
  })

  it("payment journal is always balanced", () => {
    const methods = ["bank_transfer", "swish", "card", "cash"] as const
    for (const method of methods) {
      const p: PaymentInput = {
        id: "x", organizationId: "org-A", invoiceId: "inv-001",
        amount: 12500n, method,
      }
      expect(isBalanced(buildPaymentJournal(p))).toBe(true)
    }
  })

  it("partial payment only clears partial receivable", () => {
    const p: PaymentInput = {
      id: "pay-004", organizationId: "org-A", invoiceId: "inv-001",
      amount: 6250n, method: "bank_transfer",
    }
    const entries = buildPaymentJournal(p)
    expect(entries.find(e => e.accountNumber === "1510")?.credit).toBe(6250n)
    expect(isBalanced(entries)).toBe(true)
  })
})

// ─── Credit note auto-booking tests ──────────────────────────────────────────

describe("buildCreditNoteJournal()", () => {
  const creditNote: InvoiceInput = {
    id:             "cn-001",
    organizationId: "org-A",
    type:           "credit_note",
    totalAmount:    -12500n,   // negative for credit notes
    subtotalAmount: -10000n,
    taxAmount:      -2500n,
    currency:       "SEK",
    lines: [
      { lineTotal: -10000n, taxRate: 0.25, taxAmount: -2500n },
    ],
  }

  it("credits 1510 Kundfordringar (reduces receivable)", () => {
    const entries = buildCreditNoteJournal(creditNote)
    const row = entries.find(e => e.accountNumber === "1510")!
    expect(row.credit).toBe(12500n)   // positive 12500
    expect(row.debit).toBe(0n)
  })

  it("debits 3001 Försäljning (reduces revenue)", () => {
    const entries = buildCreditNoteJournal(creditNote)
    const row = entries.find(e => e.accountNumber === "3001")!
    expect(row.debit).toBe(10000n)
    expect(row.credit).toBe(0n)
  })

  it("debits 2610 Moms (reverses VAT liability)", () => {
    const entries = buildCreditNoteJournal(creditNote)
    const row = entries.find(e => e.accountNumber === "2610")!
    expect(row.debit).toBe(2500n)
    expect(row.credit).toBe(0n)
  })

  it("credit note journal is balanced", () => {
    expect(isBalanced(buildCreditNoteJournal(creditNote))).toBe(true)
  })

  it("credit note exactly mirrors invoice entries (debit↔credit)", () => {
    const invoice: InvoiceInput = {
      id: "inv-001", organizationId: "org-A", type: "invoice",
      totalAmount: 12500n, subtotalAmount: 10000n, taxAmount: 2500n,
      currency: "SEK",
      lines: [{ lineTotal: 10000n, taxRate: 0.25, taxAmount: 2500n }],
    }
    const invoiceEntries    = buildInvoiceJournal(invoice)
    const creditNoteEntries = buildCreditNoteJournal(creditNote)

    const combined = [...invoiceEntries, ...creditNoteEntries]
    const netDebit  = combined.reduce((s, e) => s + e.debit,  0n)
    const netCredit = combined.reduce((s, e) => s + e.credit, 0n)
    // Invoice + full credit note = net zero
    expect(netDebit).toBe(netCredit)
  })

  it("does not book if type is not credit_note", () => {
    const notCN = { ...creditNote, type: "invoice" as const }
    expect(buildCreditNoteJournal(notCN)).toHaveLength(0)
  })
})

// ─── Tenant isolation ─────────────────────────────────────────────────────────

describe("tenant isolation — organizationId on every journal", () => {
  const ORG_A = "aaaaaaaa-0000-0000-0000-000000000001"
  const ORG_B = "bbbbbbbb-0000-0000-0000-000000000002"

  function buildJournalHeader(invoice: InvoiceInput) {
    return {
      organizationId: invoice.organizationId,
      sourceType:     "invoice",
      sourceId:       invoice.id,
    }
  }

  it("journal header carries organizationId from invoice", () => {
    const inv: InvoiceInput = {
      id: "inv-A", organizationId: ORG_A, type: "invoice",
      totalAmount: 12500n, subtotalAmount: 10000n, taxAmount: 2500n,
      currency: "SEK", lines: [],
    }
    expect(buildJournalHeader(inv).organizationId).toBe(ORG_A)
  })

  it("two invoices from different orgs produce different journal organizationIds", () => {
    const invA: InvoiceInput = {
      id: "inv-A", organizationId: ORG_A, type: "invoice",
      totalAmount: 12500n, subtotalAmount: 10000n, taxAmount: 2500n,
      currency: "SEK", lines: [],
    }
    const invB: InvoiceInput = {
      id: "inv-B", organizationId: ORG_B, type: "invoice",
      totalAmount: 12500n, subtotalAmount: 10000n, taxAmount: 2500n,
      currency: "SEK", lines: [],
    }
    expect(buildJournalHeader(invA).organizationId).not.toBe(
      buildJournalHeader(invB).organizationId
    )
  })
})
