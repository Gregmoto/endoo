import { getPeriodBalances, type AccountBalance, type ReportFilter } from "./engine"

export type TrialBalanceRow = AccountBalance

export type TrialBalanceReport = {
  fromDate:    string
  toDate:      string
  rows:        TrialBalanceRow[]
  totalDebit:  bigint
  totalCredit: bigint
  balanced:    boolean
}

export async function getTrialBalance(filter: ReportFilter): Promise<TrialBalanceReport> {
  const rows = await getPeriodBalances(filter)

  let totalDebit  = 0n
  let totalCredit = 0n

  for (const row of rows) {
    totalDebit  += row.debit
    totalCredit += row.credit
  }

  return {
    fromDate:    filter.fromDate,
    toDate:      filter.toDate,
    rows,
    totalDebit,
    totalCredit,
    balanced:    totalDebit === totalCredit,
  }
}
