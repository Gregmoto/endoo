import { getCumulativeBalances, type AccountBalance } from "./engine"
import { getIncomeStatement } from "./income-statement"

export type BalanceSection = {
  title:    string
  rows:     AccountBalance[]
  subtotal: bigint
}

export type BalanceSheetReport = {
  toDate:            string
  sections:          BalanceSection[]
  totalAssets:       bigint
  totalLiabilities:  bigint
  totalEquity:       bigint
  balanced:          boolean
}

export async function getBalanceSheet(params: {
  organizationId: string
  toDate:         string
  fiscalYearFromDate?: string
}): Promise<BalanceSheetReport> {
  const { organizationId, toDate, fiscalYearFromDate } = params

  const all = await getCumulativeBalances({ organizationId, toDate })
  const rows = all.filter((r) => r.reportClass === "balance_sheet")

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

  const sections: BalanceSection[] = []

  for (const [title, sectionRows] of sectionMap.entries()) {
    const subtotal = sectionRows.reduce((acc, r) => acc + r.displayBalance, 0n)
    sections.push({ title, rows: sectionRows, subtotal })
  }

  // Add net income (årets resultat) as an equity line
  if (fiscalYearFromDate) {
    const incomeStmt = await getIncomeStatement({
      organizationId,
      fromDate: fiscalYearFromDate,
      toDate,
    })

    if (incomeStmt.netIncome !== 0n) {
      const equitySection = sections.find((s) => s.rows.some((r) => r.type === "equity"))
      const netIncomeRow: AccountBalance = {
        accountId:        "net-income",
        number:           "8999",
        name:             "Årets resultat",
        type:             "equity",
        normalSide:       "credit",
        reportClass:      "balance_sheet",
        reportSection:    equitySection?.title ?? "Eget kapital",
        reportSubsection: null,
        debit:            incomeStmt.netIncome < 0n ? -incomeStmt.netIncome : 0n,
        credit:           incomeStmt.netIncome >= 0n ? incomeStmt.netIncome : 0n,
        net:              incomeStmt.netIncome >= 0n ? incomeStmt.netIncome : -incomeStmt.netIncome,
        displayBalance:   incomeStmt.netIncome,
      }

      if (equitySection) {
        equitySection.rows.push(netIncomeRow)
        equitySection.subtotal += incomeStmt.netIncome
      } else {
        sections.push({
          title:    "Eget kapital",
          rows:     [netIncomeRow],
          subtotal: incomeStmt.netIncome,
        })
      }
    }
  }

  let totalAssets       = 0n
  let totalLiabilities  = 0n
  let totalEquity       = 0n

  for (const section of sections) {
    for (const row of section.rows) {
      if (row.type === "asset") {
        totalAssets += row.displayBalance
      } else if (row.type === "liability") {
        totalLiabilities += row.displayBalance
      } else if (row.type === "equity") {
        totalEquity += row.displayBalance
      }
    }
  }

  return {
    toDate,
    sections,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: totalAssets === totalLiabilities + totalEquity,
  }
}
