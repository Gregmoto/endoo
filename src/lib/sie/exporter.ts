import { prisma } from "@/lib/prisma"
import { getCumulativeBalances } from "@/services/reports/engine"
import type { AccountType } from "@prisma/client"
import type { SieKtyp } from "./types"

function oreToSek(ore: bigint): string {
  return (Number(ore) / 100).toFixed(2)
}

function toSieDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}${m}${d}`
}

function accountTypeToKtyp(type: AccountType): SieKtyp {
  switch (type) {
    case "asset":     return "T"
    case "liability": return "S"
    case "equity":    return "E"
    case "income":    return "I"
    case "expense":   return "K"
  }
}

function quote(str: string): string {
  return `"${str.replace(/"/g, "'")}"`
}

export async function exportSie4(params: {
  organizationId: string
  fiscalYearId:   string
}): Promise<string> {
  const { organizationId, fiscalYearId } = params

  const fiscalYear = await prisma.fiscalYear.findUnique({
    where: { id: fiscalYearId },
  })

  if (!fiscalYear || fiscalYear.organizationId !== organizationId) {
    throw new Error("Fiscal year not found")
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, orgNumber: true },
  })

  if (!org) throw new Error("Organization not found")

  const accounts = await prisma.account.findMany({
    where: { organizationId, isActive: true },
    orderBy: { number: "asc" },
  })

  const startDateStr = fiscalYear.startDate.toISOString().slice(0, 10)
  const endDateStr   = fiscalYear.endDate.toISOString().slice(0, 10)

  // IB = cumulative balance before fiscal year start
  const ibBalances = await getCumulativeBalances({
    organizationId,
    toDate: new Date(fiscalYear.startDate.getTime() - 86400000).toISOString().slice(0, 10),
  })

  const ibMap = new Map<string, bigint>()
  for (const b of ibBalances) {
    ibMap.set(b.number, b.net)
  }

  // UB = cumulative balance at fiscal year end
  const ubBalances = await getCumulativeBalances({
    organizationId,
    toDate: endDateStr,
  })

  const ubMap = new Map<string, bigint>()
  for (const b of ubBalances) {
    ubMap.set(b.number, b.net)
  }

  const journals = await prisma.journal.findMany({
    where: {
      organizationId,
      fiscalYearId,
      status: "posted",
    },
    include: {
      entries: {
        include: { account: { select: { number: true } } },
        orderBy: { sortOrder: "asc" },
      },
      series: { select: { prefix: true } },
    },
    orderBy: [{ date: "asc" }, { number: "asc" }],
  })

  const today = toSieDate(new Date())
  const lines: string[] = []

  // Header
  lines.push("﻿#FLAGGA 0")
  lines.push("#SIETYP 4")
  lines.push(`#PROGRAM ${quote("Endoo")} ${quote("1.0")}`)
  lines.push(`#GEN ${today}`)
  lines.push(`#ORGNR ${org.orgNumber ?? ""}`)
  lines.push(`#FNAMN ${quote(org.name)}`)
  lines.push(`#RAR 0 ${toSieDate(fiscalYear.startDate)} ${toSieDate(fiscalYear.endDate)}`)
  lines.push("")

  // Accounts
  for (const account of accounts) {
    lines.push(`#KONTO ${account.number} ${quote(account.name)}`)
    lines.push(`#KTYP ${account.number} ${accountTypeToKtyp(account.type)}`)
  }
  lines.push("")

  // IB/UB
  for (const account of accounts) {
    const ib = ibMap.get(account.number)
    const ub = ubMap.get(account.number)
    if (ib !== undefined && ib !== 0n) {
      lines.push(`#IB 0 ${account.number} ${oreToSek(ib)}`)
    }
    if (ub !== undefined && ub !== 0n) {
      lines.push(`#UB 0 ${account.number} ${oreToSek(ub)}`)
    }
  }
  lines.push("")

  // Journals (VER)
  for (const journal of journals) {
    const verDate   = toSieDate(journal.date)
    const series    = journal.series.prefix
    const verNumber = journal.number
    const desc      = quote(journal.description)

    lines.push(`#VER ${series} ${verNumber} ${verDate} ${desc} ${verDate}`)
    lines.push("{")

    for (const entry of journal.entries) {
      // In SIE4: positive amount = debit, negative = credit
      const amount = entry.debit > 0n
        ? oreToSek(entry.debit)
        : `-${oreToSek(entry.credit)}`
      lines.push(`#TRANS ${entry.account.number} {} ${amount}`)
    }

    lines.push("}")
  }

  return lines.join("\r\n")
}
