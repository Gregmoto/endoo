import { getLedgerEntries, getOpeningBalance, type LedgerEntry, type ReportFilter } from "./engine"

export type LedgerEntryWithBalance = LedgerEntry & {
  runningBalance: bigint
}

export type AccountLedger = {
  accountId:      string
  accountNumber:  string
  accountName:    string
  openingBalance: bigint
  entries:        LedgerEntryWithBalance[]
  closingBalance: bigint
}

export type GeneralLedgerReport = {
  fromDate:       string
  toDate:         string
  accountEntries: AccountLedger[]
}

export async function getGeneralLedger(
  filter: ReportFilter & { accountId?: string }
): Promise<GeneralLedgerReport> {
  const { organizationId, fromDate, toDate } = filter

  const entries = await getLedgerEntries(filter)

  const accountMap = new Map<string, {
    accountNumber: string
    accountName:   string
    entries:       LedgerEntry[]
  }>()

  for (const entry of entries) {
    const existing = accountMap.get(entry.accountId)
    if (existing) {
      existing.entries.push(entry)
    } else {
      accountMap.set(entry.accountId, {
        accountNumber: entry.accountNumber,
        accountName:   entry.accountName,
        entries:       [entry],
      })
    }
  }

  const accountEntries: AccountLedger[] = []

  for (const [accountId, data] of accountMap.entries()) {
    const openingBalance = await getOpeningBalance({ organizationId, toDate: fromDate, accountId })

    let runningBalance = openingBalance
    const entriesWithBalance: LedgerEntryWithBalance[] = []

    for (const entry of data.entries) {
      runningBalance += entry.debit - entry.credit
      entriesWithBalance.push({ ...entry, runningBalance })
    }

    accountEntries.push({
      accountId,
      accountNumber:  data.accountNumber,
      accountName:    data.accountName,
      openingBalance,
      entries:        entriesWithBalance,
      closingBalance: runningBalance,
    })
  }

  accountEntries.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))

  return {
    fromDate,
    toDate,
    accountEntries,
  }
}
