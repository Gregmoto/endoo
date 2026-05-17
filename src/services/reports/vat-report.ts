import { prisma } from "@/lib/prisma"
import type { ReportFilter } from "./engine"

export type VatReport = {
  fromDate: string
  toDate:   string
  box05:    bigint
  box06:    bigint
  box07:    bigint
  box10:    bigint
  box11:    bigint
  box12:    bigint
  box48:    bigint
  box49:    bigint
}

const OUTPUT_VAT_ACCOUNTS   = ["2610", "2620", "2630"]
const INPUT_VAT_ACCOUNTS    = ["2640", "2641", "2645"]

export async function getVatReport(
  filter: Omit<ReportFilter, "accountNumbers">
): Promise<VatReport> {
  const { organizationId, fromDate, toDate } = filter

  const vatAccountNumbers = [...OUTPUT_VAT_ACCOUNTS, ...INPUT_VAT_ACCOUNTS]

  const vatEntries = await prisma.journalEntry.findMany({
    where: {
      organizationId,
      account: { number: { in: vatAccountNumbers }, isActive: true },
      journal: {
        status: "posted",
        date: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    },
    include: { account: { select: { number: true } } },
  })

  const accountTotals = new Map<string, { debit: bigint; credit: bigint }>()

  for (const entry of vatEntries) {
    const num = entry.account.number
    const existing = accountTotals.get(num)
    if (existing) {
      existing.debit  += entry.debit
      existing.credit += entry.credit
    } else {
      accountTotals.set(num, { debit: entry.debit, credit: entry.credit })
    }
  }

  function creditNet(accountNumber: string): bigint {
    const t = accountTotals.get(accountNumber)
    if (!t) return 0n
    return t.credit - t.debit
  }

  function debitNet(...accountNumbers: string[]): bigint {
    return accountNumbers.reduce((acc, n) => {
      const t = accountTotals.get(n)
      if (!t) return acc
      return acc + (t.debit - t.credit)
    }, 0n)
  }

  const box10 = creditNet("2610")
  const box11 = creditNet("2620")
  const box12 = creditNet("2630")
  const box48 = debitNet("2640", "2641", "2645")
  const box49 = box10 + box11 + box12 - box48

  // Base amounts: revenue by vatCode
  const baseEntries = await prisma.journalEntry.findMany({
    where: {
      organizationId,
      vatCode: { in: ["MP1", "MP2", "MP3"] },
      account: { type: "income", isActive: true },
      journal: {
        status: "posted",
        date: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    },
    select: { vatCode: true, debit: true, credit: true },
  })

  const baseTotals = new Map<string, { debit: bigint; credit: bigint }>()

  for (const entry of baseEntries) {
    const code = entry.vatCode!
    const existing = baseTotals.get(code)
    if (existing) {
      existing.debit  += entry.debit
      existing.credit += entry.credit
    } else {
      baseTotals.set(code, { debit: entry.debit, credit: entry.credit })
    }
  }

  function baseNet(code: string): bigint {
    const t = baseTotals.get(code)
    if (!t) return 0n
    return t.credit - t.debit
  }

  return {
    fromDate,
    toDate,
    box05: baseNet("MP1"),
    box06: baseNet("MP2"),
    box07: baseNet("MP3"),
    box10,
    box11,
    box12,
    box48,
    box49,
  }
}
