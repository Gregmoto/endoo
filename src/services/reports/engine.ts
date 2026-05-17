import { prisma } from "@/lib/prisma"
import type { AccountType, NormalSide, ReportClass } from "@prisma/client"

export type ReportFilter = {
  organizationId:  string
  fromDate:        string
  toDate:          string
  accountNumbers?: string[]
}

export type AccountBalance = {
  accountId:        string
  number:           string
  name:             string
  type:             AccountType
  normalSide:       NormalSide
  reportClass:      ReportClass
  reportSection:    string | null
  reportSubsection: string | null
  debit:            bigint
  credit:           bigint
  net:              bigint
  displayBalance:   bigint
}

export type LedgerEntry = {
  entryId:       string
  journalId:     string
  reference:     string
  date:          Date
  description:   string
  accountId:     string
  accountNumber: string
  accountName:   string
  debit:         bigint
  credit:        bigint
  vatCode:       string | null
}

function computeDisplayBalance(type: AccountType, net: bigint): bigint {
  if (type === "asset" || type === "expense") return net
  return -net
}

export async function getPeriodBalances(filter: ReportFilter): Promise<AccountBalance[]> {
  const { organizationId, fromDate, toDate, accountNumbers } = filter

  const entries = await prisma.journalEntry.findMany({
    where: {
      organizationId,
      account: {
        isActive: true,
        ...(accountNumbers && accountNumbers.length > 0 ? { number: { in: accountNumbers } } : {}),
      },
      journal: {
        status: "posted",
        date: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
    },
    include: {
      account: {
        select: {
          id: true,
          number: true,
          name: true,
          type: true,
          normalSide: true,
          reportClass: true,
          reportSection: true,
          reportSubsection: true,
        },
      },
    },
  })

  const map = new Map<string, AccountBalance>()

  for (const entry of entries) {
    const acc = entry.account
    const existing = map.get(acc.id)
    if (existing) {
      existing.debit  += entry.debit
      existing.credit += entry.credit
      existing.net     = existing.debit - existing.credit
      existing.displayBalance = computeDisplayBalance(acc.type, existing.net)
    } else {
      const debit  = entry.debit
      const credit = entry.credit
      const net    = debit - credit
      map.set(acc.id, {
        accountId:        acc.id,
        number:           acc.number,
        name:             acc.name,
        type:             acc.type,
        normalSide:       acc.normalSide,
        reportClass:      acc.reportClass,
        reportSection:    acc.reportSection,
        reportSubsection: acc.reportSubsection,
        debit,
        credit,
        net,
        displayBalance: computeDisplayBalance(acc.type, net),
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.number.localeCompare(b.number))
}

export async function getCumulativeBalances(params: {
  organizationId: string
  toDate:         string
  accountNumbers?: string[]
}): Promise<AccountBalance[]> {
  const { organizationId, toDate, accountNumbers } = params

  const entries = await prisma.journalEntry.findMany({
    where: {
      organizationId,
      account: {
        isActive: true,
        ...(accountNumbers && accountNumbers.length > 0 ? { number: { in: accountNumbers } } : {}),
      },
      journal: {
        status: "posted",
        date: { lte: new Date(toDate) },
      },
    },
    include: {
      account: {
        select: {
          id: true,
          number: true,
          name: true,
          type: true,
          normalSide: true,
          reportClass: true,
          reportSection: true,
          reportSubsection: true,
        },
      },
    },
  })

  const map = new Map<string, AccountBalance>()

  for (const entry of entries) {
    const acc = entry.account
    const existing = map.get(acc.id)
    if (existing) {
      existing.debit  += entry.debit
      existing.credit += entry.credit
      existing.net     = existing.debit - existing.credit
      existing.displayBalance = computeDisplayBalance(acc.type, existing.net)
    } else {
      const debit  = entry.debit
      const credit = entry.credit
      const net    = debit - credit
      map.set(acc.id, {
        accountId:        acc.id,
        number:           acc.number,
        name:             acc.name,
        type:             acc.type,
        normalSide:       acc.normalSide,
        reportClass:      acc.reportClass,
        reportSection:    acc.reportSection,
        reportSubsection: acc.reportSubsection,
        debit,
        credit,
        net,
        displayBalance: computeDisplayBalance(acc.type, net),
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.number.localeCompare(b.number))
}

export async function getLedgerEntries(
  filter: ReportFilter & { accountId?: string }
): Promise<LedgerEntry[]> {
  const { organizationId, fromDate, toDate, accountNumbers, accountId } = filter

  const entries = await prisma.journalEntry.findMany({
    where: {
      organizationId,
      ...(accountId ? { accountId } : {}),
      account: {
        isActive: true,
        ...(accountNumbers && accountNumbers.length > 0 ? { number: { in: accountNumbers } } : {}),
      },
      journal: {
        status: "posted",
        date: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      },
    },
    include: {
      account: { select: { id: true, number: true, name: true } },
      journal: { select: { id: true, reference: true, date: true, description: true } },
    },
    orderBy: [
      { journal: { date: "asc" } },
      { journal: { reference: "asc" } },
    ],
  })

  return entries.map((e) => ({
    entryId:       e.id,
    journalId:     e.journal.id,
    reference:     e.journal.reference,
    date:          e.journal.date,
    description:   e.description ?? e.journal.description,
    accountId:     e.account.id,
    accountNumber: e.account.number,
    accountName:   e.account.name,
    debit:         e.debit,
    credit:        e.credit,
    vatCode:       e.vatCode,
  }))
}

export async function getOpeningBalance(params: {
  organizationId: string
  toDate:         string
  accountId:      string
}): Promise<bigint> {
  const { organizationId, toDate, accountId } = params

  const entries = await prisma.journalEntry.findMany({
    where: {
      organizationId,
      accountId,
      journal: {
        status: "posted",
        date: { lt: new Date(toDate) },
      },
    },
    select: { debit: true, credit: true },
  })

  return entries.reduce((acc, e) => acc + e.debit - e.credit, 0n)
}

export function formatOre(ore: bigint): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(ore) / 100)
}
