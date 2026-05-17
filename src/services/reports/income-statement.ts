import { getPeriodBalances, type AccountBalance, type ReportFilter } from "./engine"

export type IncomeSection = {
  title:    string
  rows:     AccountBalance[]
  subtotal: bigint
}

export type IncomeStatementReport = {
  fromDate:       string
  toDate:         string
  sections:       IncomeSection[]
  totalRevenue:   bigint
  totalExpenses:  bigint
  netIncome:      bigint
}

export async function getIncomeStatement(filter: ReportFilter): Promise<IncomeStatementReport> {
  const all = await getPeriodBalances(filter)
  const rows = all.filter((r) => r.reportClass === "income_statement")

  const sectionMap = new Map<string, AccountBalance[]>()

  for (const row of rows) {
    const key = row.reportSection ?? "Övriga"
    const existing = sectionMap.get(key)
    if (existing) {
      existing.push(row)
    } else {
      sectionMap.set(key, [row])
    }
  }

  const sections: IncomeSection[] = []

  for (const [title, sectionRows] of sectionMap.entries()) {
    const subtotal = sectionRows.reduce((acc, r) => acc + r.displayBalance, 0n)
    sections.push({ title, rows: sectionRows, subtotal })
  }

  let totalRevenue  = 0n
  let totalExpenses = 0n

  for (const row of rows) {
    if (row.type === "income") {
      totalRevenue += row.displayBalance
    } else if (row.type === "expense") {
      totalExpenses += row.displayBalance
    }
  }

  return {
    fromDate:      filter.fromDate,
    toDate:        filter.toDate,
    sections,
    totalRevenue,
    totalExpenses,
    netIncome:     totalRevenue - totalExpenses,
  }
}
