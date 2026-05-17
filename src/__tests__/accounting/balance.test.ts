import { describe, it, expect } from "vitest"

// ─── Debit/credit balance rules ───────────────────────────────────────────────
//
// Tests the core double-entry invariants that the ledger must enforce.
// These correspond to DB constraints + app-layer validation.

type AccountType = "asset" | "liability" | "equity" | "income" | "expense"

type Entry = {
  accountNumber: string
  accountType:   AccountType
  debit:         bigint
  credit:        bigint
}

// ─── Balance helpers ──────────────────────────────────────────────────────────

function totalDebit(entries: Entry[]): bigint {
  return entries.reduce((s, e) => s + e.debit, 0n)
}

function totalCredit(entries: Entry[]): bigint {
  return entries.reduce((s, e) => s + e.credit, 0n)
}

function isBalanced(entries: Entry[]): boolean {
  return totalDebit(entries) === totalCredit(entries)
}

// Account balance: sign depends on normal side for the account type.
// Assets + Expenses: debit increases balance (DR normal)
// Liabilities + Equity + Income: credit increases balance (CR normal)
function accountBalance(entries: Entry[], accountNumber: string): bigint {
  const rows = entries.filter(e => e.accountNumber === accountNumber)
  const type = rows[0]?.accountType
  if (!type) return 0n
  const debit  = rows.reduce((s, e) => s + e.debit,  0n)
  const credit = rows.reduce((s, e) => s + e.credit, 0n)
  if (type === "asset" || type === "expense") return debit - credit
  return credit - debit
}

// ─── Core double-entry invariants ────────────────────────────────────────────

describe("double-entry invariant: total debit = total credit", () => {
  it("simple two-line journal balances", () => {
    const entries: Entry[] = [
      { accountNumber: "1510", accountType: "asset",   debit: 10000n, credit: 0n },
      { accountNumber: "3001", accountType: "income",  debit: 0n,     credit: 10000n },
    ]
    expect(isBalanced(entries)).toBe(true)
  })

  it("three-line invoice journal balances (revenue + VAT split)", () => {
    const entries: Entry[] = [
      { accountNumber: "1510", accountType: "asset",     debit: 12500n, credit: 0n },
      { accountNumber: "3001", accountType: "income",    debit: 0n,     credit: 10000n },
      { accountNumber: "2610", accountType: "liability", debit: 0n,     credit: 2500n },
    ]
    expect(isBalanced(entries)).toBe(true)
  })

  it("payment journal balances (bank in, receivable out)", () => {
    const entries: Entry[] = [
      { accountNumber: "1930", accountType: "asset", debit: 12500n, credit: 0n },
      { accountNumber: "1510", accountType: "asset", debit: 0n,     credit: 12500n },
    ]
    expect(isBalanced(entries)).toBe(true)
  })

  it("detects imbalance of 1 öre", () => {
    const entries: Entry[] = [
      { accountNumber: "1510", accountType: "asset",  debit: 12501n, credit: 0n },
      { accountNumber: "3001", accountType: "income", debit: 0n,     credit: 12500n },
    ]
    expect(isBalanced(entries)).toBe(false)
  })

  it("detects imbalance when VAT row is missing", () => {
    const entries: Entry[] = [
      { accountNumber: "1510", accountType: "asset",  debit: 12500n, credit: 0n },
      { accountNumber: "3001", accountType: "income", debit: 0n,     credit: 10000n },
      // missing 2610 moms row
    ]
    expect(isBalanced(entries)).toBe(false)
    expect(totalDebit(entries) - totalCredit(entries)).toBe(2500n)
  })
})

// ─── Account balance sign convention ──────────────────────────────────────────

describe("account balance sign convention", () => {
  it("asset account: debit increases balance", () => {
    const entries: Entry[] = [
      { accountNumber: "1510", accountType: "asset", debit: 12500n, credit: 0n },
    ]
    expect(accountBalance(entries, "1510")).toBe(12500n)
  })

  it("asset account: credit decreases balance", () => {
    const entries: Entry[] = [
      { accountNumber: "1510", accountType: "asset", debit: 12500n, credit: 0n },
      { accountNumber: "1510", accountType: "asset", debit: 0n,     credit: 12500n },
    ]
    expect(accountBalance(entries, "1510")).toBe(0n)
  })

  it("income account: credit increases balance (revenue grows)", () => {
    const entries: Entry[] = [
      { accountNumber: "3001", accountType: "income", debit: 0n, credit: 10000n },
    ]
    expect(accountBalance(entries, "3001")).toBe(10000n)
  })

  it("income account: debit decreases balance (credit note reversal)", () => {
    const entries: Entry[] = [
      { accountNumber: "3001", accountType: "income", debit: 0n,     credit: 10000n },
      { accountNumber: "3001", accountType: "income", debit: 10000n, credit: 0n },   // reversed
    ]
    expect(accountBalance(entries, "3001")).toBe(0n)
  })

  it("liability account (VAT): credit increases balance", () => {
    const entries: Entry[] = [
      { accountNumber: "2610", accountType: "liability", debit: 0n,    credit: 2500n },
    ]
    expect(accountBalance(entries, "2610")).toBe(2500n)
  })

  it("expense account: debit increases balance", () => {
    const entries: Entry[] = [
      { accountNumber: "5000", accountType: "expense", debit: 5000n, credit: 0n },
    ]
    expect(accountBalance(entries, "5000")).toBe(5000n)
  })

  it("unknown account returns 0", () => {
    expect(accountBalance([], "9999")).toBe(0n)
  })
})

// ─── Balance sheet equation ───────────────────────────────────────────────────
// Assets = Liabilities + Equity + Net income
// In a balanced ledger this always holds.

describe("balance sheet equation", () => {
  function balanceSheet(entries: Entry[]) {
    const accounts = [...new Set(entries.map(e => e.accountNumber))]
    let assets = 0n, liabilities = 0n, equity = 0n, income = 0n, expenses = 0n
    for (const acc of accounts) {
      const bal = accountBalance(entries, acc)
      const type = entries.find(e => e.accountNumber === acc)!.accountType
      if (type === "asset")     assets      += bal
      if (type === "liability") liabilities += bal
      if (type === "equity")    equity      += bal
      if (type === "income")    income      += bal
      if (type === "expense")   expenses    += bal
    }
    return { assets, liabilities, equity, income, expenses }
  }

  it("invoice + payment: balance sheet equation holds", () => {
    const entries: Entry[] = [
      // Invoice sent
      { accountNumber: "1510", accountType: "asset",     debit: 12500n, credit: 0n },
      { accountNumber: "3001", accountType: "income",    debit: 0n,     credit: 10000n },
      { accountNumber: "2610", accountType: "liability", debit: 0n,     credit: 2500n },
      // Payment received
      { accountNumber: "1930", accountType: "asset",     debit: 12500n, credit: 0n },
      { accountNumber: "1510", accountType: "asset",     debit: 0n,     credit: 12500n },
    ]

    expect(isBalanced(entries)).toBe(true)
    const bs = balanceSheet(entries)
    // Assets: 1510 net=0, 1930=12500 → 12500
    expect(bs.assets).toBe(12500n)
    // Liabilities: 2610=2500
    // Net income: income(10000) - expenses(0) = 10000
    // Assets = Liabilities + Net income: 2500 + 10000 = 12500 ✓
    expect(bs.liabilities + bs.income - bs.expenses).toBe(bs.assets)
  })

  it("credit note: reversal zeroes out all accounts", () => {
    const invoice: Entry[] = [
      { accountNumber: "1510", accountType: "asset",     debit: 12500n, credit: 0n },
      { accountNumber: "3001", accountType: "income",    debit: 0n,     credit: 10000n },
      { accountNumber: "2610", accountType: "liability", debit: 0n,     credit: 2500n },
    ]
    const creditNote: Entry[] = [
      { accountNumber: "1510", accountType: "asset",     debit: 0n,     credit: 12500n },
      { accountNumber: "3001", accountType: "income",    debit: 10000n, credit: 0n },
      { accountNumber: "2610", accountType: "liability", debit: 2500n,  credit: 0n },
    ]
    const all = [...invoice, ...creditNote]
    expect(isBalanced(all)).toBe(true)
    const bs = balanceSheet(all)
    expect(bs.assets).toBe(0n)
    expect(bs.liabilities).toBe(0n)
    expect(bs.income).toBe(0n)
  })
})

// ─── Multi-period running balance ─────────────────────────────────────────────

describe("running balance across multiple journals", () => {
  type PostedEntry = Entry & { journalDate: string }

  function balanceAsOf(entries: PostedEntry[], accountNumber: string, upTo: string): bigint {
    const filtered = entries.filter(
      e => e.accountNumber === accountNumber && e.journalDate <= upTo
    )
    const type = filtered[0]?.accountType
    if (!type) return 0n
    const debit  = filtered.reduce((s, e) => s + e.debit, 0n)
    const credit = filtered.reduce((s, e) => s + e.credit, 0n)
    return type === "asset" || type === "expense" ? debit - credit : credit - debit
  }

  const ledger: PostedEntry[] = [
    // Jan: Invoice 10 000 kr ex. moms
    { accountNumber: "1510", accountType: "asset",     debit: 12500n, credit: 0n,     journalDate: "2025-01-15" },
    { accountNumber: "3001", accountType: "income",    debit: 0n,     credit: 10000n, journalDate: "2025-01-15" },
    { accountNumber: "2610", accountType: "liability", debit: 0n,     credit: 2500n,  journalDate: "2025-01-15" },
    // Feb: Payment received
    { accountNumber: "1930", accountType: "asset",     debit: 12500n, credit: 0n,     journalDate: "2025-02-01" },
    { accountNumber: "1510", accountType: "asset",     debit: 0n,     credit: 12500n, journalDate: "2025-02-01" },
    // Mar: Another invoice 5 000 kr ex. moms
    { accountNumber: "1510", accountType: "asset",     debit: 6250n,  credit: 0n,     journalDate: "2025-03-10" },
    { accountNumber: "3001", accountType: "income",    debit: 0n,     credit: 5000n,  journalDate: "2025-03-10" },
    { accountNumber: "2610", accountType: "liability", debit: 0n,     credit: 1250n,  journalDate: "2025-03-10" },
  ]

  it("1510 Kundfordringar is 12500 after January invoice", () => {
    expect(balanceAsOf(ledger, "1510", "2025-01-31")).toBe(12500n)
  })

  it("1510 Kundfordringar is 0 after February payment clears the debt", () => {
    expect(balanceAsOf(ledger, "1510", "2025-02-28")).toBe(0n)
  })

  it("1510 Kundfordringar is 6250 after March invoice", () => {
    expect(balanceAsOf(ledger, "1510", "2025-03-31")).toBe(6250n)
  })

  it("3001 Försäljning accumulates across periods", () => {
    expect(balanceAsOf(ledger, "3001", "2025-03-31")).toBe(15000n)  // 10000 + 5000
  })

  it("2610 Moms accumulates correctly", () => {
    expect(balanceAsOf(ledger, "2610", "2025-03-31")).toBe(3750n)   // 2500 + 1250
  })

  it("1930 Bank shows full receipts", () => {
    expect(balanceAsOf(ledger, "1930", "2025-03-31")).toBe(12500n)
  })
})
