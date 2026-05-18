/**
 * Year-end closing (årsavslut) for Swedish fiscal years.
 *
 * Steps performed by closeFiscalYear():
 *   1. validateYearEnd        — all periods locked, no draft journals
 *   2. generateClosingJournal — omföring: klass 3–8 nollställs mot 2099 (Årets resultat)
 *   3. generateOpeningJournal — ingående balanser (IB) for klass 1–2 in the next fiscal year
 *   4. snapshotAccounts       — immutable JSON snapshots of both statements
 *   5. Seal                   — SHA-256 hash, mark fiscal year "closed", lock all periods
 *
 * All monetary amounts are BigInt in öre (1 SEK = 100 öre).
 * Debit == Credit invariant is enforced by createJournal + postJournal.
 */

import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { createJournal, postJournal } from "@/lib/accounting/journals"
import type { FiscalYear, Account, JournalEntry } from "@prisma/client"

// ─── Public types ─────────────────────────────────────────────────────────────

export type AccountSnapshot = {
  accountId:     string
  accountNumber: string
  accountName:   string
  debit:         string  // BigInt serialized as string
  credit:        string
  balance:       string  // net balance (debit - credit for DR-normal, credit - debit for CR-normal)
}

export type YearEndValidation = {
  valid:   boolean
  errors:  string[]
}

export type YearEndResult = {
  closingJournalId: string
  openingJournalId: string | null  // null if no next fiscal year exists
  balanceSheetSnapshot:   AccountSnapshot[]
  incomeStatementSnapshot: AccountSnapshot[]
  closingHash: string
}

// ─── Error types ──────────────────────────────────────────────────────────────

export class YearEndValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Year-end validation failed: ${errors.join("; ")}`)
  }
}

export class YearEndAlreadyClosedError extends Error {
  constructor() { super("Fiscal year is already closed") }
}

export class FiscalYearNotFoundError extends Error {
  constructor(id: string) { super(`Fiscal year not found: ${id}`) }
}

// ─── validateYearEnd ──────────────────────────────────────────────────────────

export async function validateYearEnd(
  organizationId: string,
  fiscalYearId:   string
): Promise<YearEndValidation> {
  const errors: string[] = []

  const fy = await prisma.fiscalYear.findFirst({
    where: { id: fiscalYearId, organizationId },
    include: { accountingPeriods: true },
  })

  if (!fy) {
    return { valid: false, errors: ["Räkenskapsåret hittades inte"] }
  }

  if (fy.status === "closed" || fy.status === "locked") {
    return { valid: false, errors: ["Räkenskapsåret är redan avslutat"] }
  }

  // All periods must be locked or closed
  const unlockedPeriods = fy.accountingPeriods.filter(
    p => p.status === "open"
  )
  if (unlockedPeriods.length > 0) {
    const names = unlockedPeriods.map(p => `${p.year}-${String(p.month).padStart(2, "0")}`).join(", ")
    errors.push(`Följande perioder är fortfarande öppna: ${names}`)
  }

  // No draft journals allowed
  const draftCount = await prisma.journal.count({
    where: { organizationId, fiscalYearId, status: "draft" },
  })
  if (draftCount > 0) {
    errors.push(`Det finns ${draftCount} utkastverifikat som måste bokföras eller tas bort`)
  }

  // Account 2099 (Årets resultat) must exist
  const resultAccount = await prisma.account.findFirst({
    where: { organizationId, number: "2099", isActive: true },
  })
  if (!resultAccount) {
    errors.push('Kontot 2099 "Årets resultat" saknas i kontoplanen')
  }

  return { valid: errors.length === 0, errors }
}

// ─── getAccountBalances ───────────────────────────────────────────────────────

type AccountBalance = {
  account: Account
  debit:   bigint
  credit:  bigint
}

async function getAccountBalances(
  organizationId: string,
  fiscalYearId:   string,
  numberPrefix:   string   // "1" | "2" | "3456789" etc.
): Promise<AccountBalance[]> {
  // Fetch all active accounts matching the number prefix
  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      isActive: true,
      number: { startsWith: numberPrefix },
      level: 3,  // leaf accounts only (e.g. 1510, not 1500)
    },
    orderBy: { number: "asc" },
  })

  if (accounts.length === 0) return []

  const accountIds = accounts.map(a => a.id)

  // Aggregate posted entries for this fiscal year
  const entries = await prisma.journalEntry.groupBy({
    by:    ["accountId"],
    where: {
      organizationId,
      journal: { fiscalYearId, status: "posted" },
      accountId: { in: accountIds },
    },
    _sum: { debit: true, credit: true },
  })

  const entryMap = new Map(entries.map(e => [e.accountId, e._sum]))

  return accounts
    .map(account => ({
      account,
      debit:  entryMap.get(account.id)?.debit  ?? 0n,
      credit: entryMap.get(account.id)?.credit ?? 0n,
    }))
    .filter(b => b.debit !== 0n || b.credit !== 0n)
}

// ─── generateClosingJournal ───────────────────────────────────────────────────

/**
 * Creates and posts the resultatdisposition journal:
 *   - All income/expense accounts (3xxx–8xxx) are zeroed out
 *   - The net result flows to account 2099 (Årets resultat)
 *
 * Income accounts (CR normal): debit them to zero, net credit goes to 2099
 * Expense accounts (DR normal): credit them to zero, net debit comes from 2099
 *
 * Journal date = last day of fiscal year.
 */
export async function generateClosingJournal(
  organizationId: string,
  fiscalYearId:   string,
  closedByUserId: string
): Promise<string> {
  // Fetch balances for classes 3–8
  const classRanges = ["3", "4", "5", "6", "7", "8"]
  const allBalances: AccountBalance[] = []
  for (const prefix of classRanges) {
    const balances = await getAccountBalances(organizationId, fiscalYearId, prefix)
    allBalances.push(...balances)
  }

  const resultAccount = await prisma.account.findFirstOrThrow({
    where: { organizationId, number: "2099", isActive: true },
  })

  const fy = await prisma.fiscalYear.findFirstOrThrow({
    where: { id: fiscalYearId, organizationId },
  })

  // Calculate net result: income credits - income debits - expense debits + expense credits
  let totalIncome  = 0n
  let totalExpense = 0n
  for (const { account, debit, credit } of allBalances) {
    if (account.type === "income") {
      totalIncome += credit - debit   // net credit = income
    } else {
      totalExpense += debit - credit  // net debit = expense
    }
  }
  const netResult = totalIncome - totalExpense  // positive = profit, negative = loss

  // Build journal entries: zero out each income/expense account
  const entries: Array<{
    accountId:   string
    debit:       bigint
    credit:      bigint
    description: string
  }> = []

  for (const { account, debit, credit } of allBalances) {
    if (debit === 0n && credit === 0n) continue
    if (account.type === "income") {
      // Income has CR balance → debit to zero it
      const balance = credit - debit
      if (balance > 0n) entries.push({ accountId: account.id, debit: balance, credit: 0n, description: account.name })
      else if (balance < 0n) entries.push({ accountId: account.id, debit: 0n, credit: -balance, description: account.name })
    } else {
      // Expense has DR balance → credit to zero it
      const balance = debit - credit
      if (balance > 0n) entries.push({ accountId: account.id, debit: 0n, credit: balance, description: account.name })
      else if (balance < 0n) entries.push({ accountId: account.id, debit: -balance, credit: 0n, description: account.name })
    }
  }

  if (entries.length === 0) {
    // Nothing to close — create a zero journal only if there's a non-zero result
    // This shouldn't happen in practice but handle gracefully
    throw new Error("Inga resultatkonton med saldo att stänga")
  }

  // 2099 entry: receives or absorbs the net result
  if (netResult >= 0n) {
    // Profit → credit 2099
    entries.push({ accountId: resultAccount.id, debit: 0n, credit: netResult, description: "Årets resultat" })
  } else {
    // Loss → debit 2099
    entries.push({ accountId: resultAccount.id, debit: -netResult, credit: 0n, description: "Årets förlust" })
  }

  const endDate = fy.endDate.toISOString().slice(0, 10)

  const journal = await createJournal({
    organizationId,
    fiscalYearId,
    seriesPrefix:    "A",
    date:            endDate,
    description:     `Årsavslut ${fy.name} — omföring resultatkonton`,
    sourceType:      "year_end_closing",
    sourceId:        fiscalYearId,
    createdByUserId: closedByUserId,
    entries:         entries.map(e => ({
      accountId:   e.accountId,
      debit:       e.debit,
      credit:      e.credit,
      description: e.description,
    })),
  })

  await postJournal(organizationId, journal.id, closedByUserId)
  return journal.id
}

// ─── generateOpeningJournal ───────────────────────────────────────────────────

/**
 * Creates and posts the IB (ingående balans) journal for the next fiscal year.
 * Only runs if a next fiscal year exists and is open.
 *
 * Balance sheet accounts (1xxx = assets DR normal, 2xxx = liabilities CR normal)
 * are carried forward as-is.
 */
export async function generateOpeningJournal(
  organizationId: string,
  fiscalYearId:   string,
  closedByUserId: string
): Promise<string | null> {
  const fy = await prisma.fiscalYear.findFirstOrThrow({
    where: { id: fiscalYearId, organizationId },
  })

  // Find the next fiscal year (start date immediately after this one ends)
  const nextFy = await prisma.fiscalYear.findFirst({
    where: {
      organizationId,
      startDate: { gt: fy.endDate },
      status:    "open",
    },
    orderBy: { startDate: "asc" },
  })

  if (!nextFy) return null

  // Get final balances of all balance-sheet accounts (1xxx + 2xxx)
  const assetBalances     = await getAccountBalances(organizationId, fiscalYearId, "1")
  const liabilityBalances = await getAccountBalances(organizationId, fiscalYearId, "2")
  const allBS             = [...assetBalances, ...liabilityBalances]

  if (allBS.length === 0) return null

  const entries: Array<{
    accountId:   string
    debit:       bigint
    credit:      bigint
    description: string
  }> = []

  for (const { account, debit, credit } of allBS) {
    if (debit === 0n && credit === 0n) continue
    if (debit > credit) {
      entries.push({ accountId: account.id, debit: debit - credit, credit: 0n, description: `IB ${account.number} ${account.name}` })
    } else if (credit > debit) {
      entries.push({ accountId: account.id, debit: 0n, credit: credit - debit, description: `IB ${account.number} ${account.name}` })
    }
  }

  if (entries.length === 0) return null

  // IB journal must balance — add a balancing entry to 2099 if needed
  const totalDebit  = entries.reduce((s, e) => s + e.debit,  0n)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0n)
  if (totalDebit !== totalCredit) {
    const resultAccount = await prisma.account.findFirstOrThrow({
      where: { organizationId, number: "2099", isActive: true },
    })
    const diff = totalDebit - totalCredit
    if (diff > 0n) {
      entries.push({ accountId: resultAccount.id, debit: 0n, credit: diff, description: "IB Årets resultat" })
    } else {
      entries.push({ accountId: resultAccount.id, debit: -diff, credit: 0n, description: "IB Årets förlust" })
    }
  }

  const startDate = nextFy.startDate.toISOString().slice(0, 10)

  const journal = await createJournal({
    organizationId,
    fiscalYearId:    nextFy.id,
    seriesPrefix:    "A",
    date:            startDate,
    description:     `Ingående balanser ${nextFy.name} (från ${fy.name})`,
    sourceType:      "year_end_opening",
    sourceId:        fiscalYearId,
    createdByUserId: closedByUserId,
    entries:         entries.map(e => ({
      accountId:   e.accountId,
      debit:       e.debit,
      credit:      e.credit,
      description: e.description,
    })),
  })

  await postJournal(organizationId, journal.id, closedByUserId)
  return journal.id
}

// ─── snapshotAccounts ─────────────────────────────────────────────────────────

async function snapshotAccounts(
  organizationId: string,
  fiscalYearId:   string,
  prefix:         string
): Promise<AccountSnapshot[]> {
  const balances = await getAccountBalances(organizationId, fiscalYearId, prefix)
  return balances.map(({ account, debit, credit }) => {
    const balance = account.normalSide === "debit"
      ? debit - credit
      : credit - debit
    return {
      accountId:     account.id,
      accountNumber: account.number,
      accountName:   account.name,
      debit:         String(debit),
      credit:        String(credit),
      balance:       String(balance),
    }
  })
}

// ─── closeFiscalYear ─────────────────────────────────────────────────────────

/**
 * Orchestrates the full year-end closing sequence.
 * Throws YearEndValidationError if preconditions are not met.
 */
export async function closeFiscalYear(
  organizationId: string,
  fiscalYearId:   string,
  closedByUserId: string
): Promise<YearEndResult> {
  const fy = await prisma.fiscalYear.findFirst({
    where: { id: fiscalYearId, organizationId },
  })
  if (!fy) throw new FiscalYearNotFoundError(fiscalYearId)
  if (fy.status !== "open") throw new YearEndAlreadyClosedError()

  // 1. Validate
  const validation = await validateYearEnd(organizationId, fiscalYearId)
  if (!validation.valid) throw new YearEndValidationError(validation.errors)

  // 2. Closing journal (omföring 3xxx-8xxx → 2099)
  const closingJournalId = await generateClosingJournal(organizationId, fiscalYearId, closedByUserId)

  // 3. IB journal for next year
  const openingJournalId = await generateOpeningJournal(organizationId, fiscalYearId, closedByUserId)

  // 4. Snapshots — taken after closing journal is posted so 2099 has the result
  const bsPrefixes = ["1", "2"]
  const isSPrefixes = ["3", "4", "5", "6", "7", "8"]

  const balanceSheetRows: AccountSnapshot[] = []
  for (const p of bsPrefixes) {
    balanceSheetRows.push(...await snapshotAccounts(organizationId, fiscalYearId, p))
  }

  const incomeStatementRows: AccountSnapshot[] = []
  for (const p of isSPrefixes) {
    incomeStatementRows.push(...await snapshotAccounts(organizationId, fiscalYearId, p))
  }

  // 5. Hash — deterministic JSON of both snapshots
  const payload = JSON.stringify({
    organizationId,
    fiscalYearId,
    closingJournalId,
    openingJournalId,
    balanceSheet:     balanceSheetRows,
    incomeStatement:  incomeStatementRows,
  })
  const closingHash = crypto.createHash("sha256").update(payload).digest("hex")

  // 6. Seal: update fiscal year + lock all periods
  const now = new Date()
  await prisma.$transaction([
    prisma.fiscalYear.update({
      where: { id: fiscalYearId },
      data: {
        status:                       "closed",
        closingJournalId,
        openingJournalId,
        closingHash,
        closedAt:                     now,
        closedById:                   closedByUserId,
        closedBalanceSheetSnapshot:   balanceSheetRows as never,
        closedIncomeStatementSnapshot: incomeStatementRows as never,
      },
    }),
    prisma.accountingPeriod.updateMany({
      where:  { fiscalYearId, organizationId, status: "locked" },
      data:   { status: "closed" },
    }),
  ])

  // Audit log
  prisma.auditLog.create({
    data: {
      organizationId,
      userId:     closedByUserId,
      action:     "update",
      entityType: "FiscalYear",
      entityId:   fiscalYearId,
      before:     { status: "open" },
      after:      { status: "closed", closingHash },
      meta:       { closingJournalId, openingJournalId, fy: fy.name },
    },
  }).catch(() => {})

  return {
    closingJournalId,
    openingJournalId,
    balanceSheetSnapshot:    balanceSheetRows,
    incomeStatementSnapshot: incomeStatementRows,
    closingHash,
  }
}
