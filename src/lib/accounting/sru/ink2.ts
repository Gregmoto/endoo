// INK2 — Inkomstdeklaration 2 (aktiebolag)
//
// Genererar SRU-filer för bilagorna INK2R (Resultaträkning) och INK2S (Balansräkning).
// INK2 är skattedeklarationen för aktiebolag som lämnas till Skatteverket.
//
// OSÄKERHET: Blankettstrukturen för INK2 ändras varje taxeringsår.
// Kontrollera alltid mot Skatteverkets aktuella blankettkrav.
// Källa: skatteverket.se/foretagochorganisationer/skatter/deklarera/inkomstdeklaration
//
// OSÄKERHET: Denna implementation täcker enbart INK2R och INK2S bilagorna.
// INK2 (huvudblanketten) kräver ytterligare uppgifter (skattemässiga justeringar
// m.m.) som inte kan genereras automatiskt från BAS-kontona.

import { prisma } from "@/lib/prisma"
import {
  INK2R_MAPPINGS,
  INK2S_ASSET_MAPPINGS,
  INK2S_LIABILITY_MAPPINGS,
  applyMapping,
  oreToKronor,
} from "./bas-mapping"
import { normalizeOrgNumber, formatSruDate } from "./format"
import type { SruDocument, SruBlankett, AccountBalanceRow } from "./types"

// ─── getBalancesForFiscalYear ─────────────────────────────────────────────────

async function getBalancesForFiscalYear(
  organizationId: string,
  fiscalYearId:   string
): Promise<AccountBalanceRow[]> {
  const accounts = await prisma.account.findMany({
    where: { organizationId, isActive: true, level: 3 },
    orderBy: { number: "asc" },
    select: { id: true, number: true, name: true, type: true },
  })

  if (accounts.length === 0) return []

  const accountIds = accounts.map(a => a.id)

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
    .map(a => ({
      account: { id: a.id, number: a.number, name: a.name, type: a.type },
      debit:   entryMap.get(a.id)?.debit  ?? 0n,
      credit:  entryMap.get(a.id)?.credit ?? 0n,
    }))
    .filter(b => b.debit !== 0n || b.credit !== 0n)
}

// ─── generateInk2Sru ─────────────────────────────────────────────────────────

export async function generateInk2Sru(
  organizationId: string,
  fiscalYearId:   string
): Promise<SruDocument> {
  const [org, fy, balances] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: organizationId },
      select: { name: true, orgNumber: true },
    }),
    prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, organizationId },
      select: { endDate: true, startDate: true },
    }),
    getBalancesForFiscalYear(organizationId, fiscalYearId),
  ])

  if (!org)  throw new Error("Organisation hittades inte")
  if (!fy)   throw new Error("Räkenskapsår hittades inte eller tillhör inte organisationen")
  if (!org.orgNumber) throw new Error("Organisationsnummer saknas — fyll i det under Inställningar > Företagsuppgifter")

  const orgNumber = normalizeOrgNumber(org.orgNumber)
  if (orgNumber.length !== 10) {
    throw new Error(`Ogiltigt organisationsnummer: "${org.orgNumber}" → "${orgNumber}" (måste vara 10 siffror)`)
  }

  const taxYear     = fy.endDate.getFullYear()
  const createdDate = formatSruDate(new Date())

  // ─── INK2R (Resultaträkning) ────────────────────────────────────────────
  const ink2rFields = INK2R_MAPPINGS.map(m => ({
    field: m.field,
    value: applyMapping(balances, m.accounts, m.side, m.negate),
  })).filter(f => f.value !== 0)  // omit zero fields

  // OSÄKERHET: Fält 4014 = Årets resultat. Det beräknas som summan av alla
  // 3xxx-8xxx konton netto. I BAS: kredit > debit = vinst (positivt).
  // Exakt fältnummer för "Årets resultat" i INK2R behöver verifieras.
  const totalIncome   = sumRange(balances, "3000", "3999")
  const totalExpenses = sumRange(balances, "4000", "8999")
  // OSÄKERHET: Vinst = intäkter (kredit-netto) minus kostnader (debit-netto)
  const arsresultat = oreToKronor(totalIncome.credit - totalIncome.debit - (totalExpenses.debit - totalExpenses.credit))
  if (arsresultat !== 0) {
    ink2rFields.push({ field: 4014, value: arsresultat })
  }

  const ink2rBlankett: SruBlankett = {
    blankett: "INK2R",
    fields:   ink2rFields,
  }

  // ─── INK2S (Balansräkning) ──────────────────────────────────────────────
  const ink2sFields: { field: number; value: number }[] = []

  for (const m of INK2S_ASSET_MAPPINGS) {
    const v = applyMapping(balances, m.accounts, m.side, m.negate)
    if (v !== 0) ink2sFields.push({ field: m.field, value: v })
  }

  // OSÄKERHET: Fält 4299 = Summa tillgångar. Summeras automatiskt av SKV i
  // många fall, men kan krävas explicit i vissa blankettyper.
  const sumTillgangar = ink2sFields.reduce((sum, f) => {
    if (f.field >= 4100 && f.field <= 4299) return sum + f.value
    return sum
  }, 0)
  if (sumTillgangar !== 0) {
    ink2sFields.push({ field: 4299, value: sumTillgangar })
  }

  for (const m of INK2S_LIABILITY_MAPPINGS) {
    const v = applyMapping(balances, m.accounts, m.side, m.negate)
    if (v !== 0) ink2sFields.push({ field: m.field, value: v })
  }

  // OSÄKERHET: Fält 4399 = Summa eget kapital och skulder — verifiera att
  // SKV inte räknar ut detta automatiskt.
  const sumSkulder = INK2S_LIABILITY_MAPPINGS.reduce((sum, m) => {
    return sum + applyMapping(balances, m.accounts, m.side, m.negate)
  }, 0)
  if (sumSkulder !== 0) {
    ink2sFields.push({ field: 4399, value: sumSkulder })
  }

  const ink2sBlankett: SruBlankett = {
    blankett: "INK2S",
    fields:   ink2sFields,
  }

  return {
    orgNumber,
    companyName: org.name,
    taxYear,
    createdDate,
    blanketter: [ink2rBlankett, ink2sBlankett],
  }
}

// ─── Local helper ─────────────────────────────────────────────────────────────

function sumRange(
  balances: AccountBalanceRow[],
  from: string,
  to:   string
): { debit: bigint; credit: bigint } {
  let debit  = 0n
  let credit = 0n
  for (const b of balances) {
    const n = b.account.number
    if (n >= from && n <= to) {
      debit  += b.debit
      credit += b.credit
    }
  }
  return { debit, credit }
}
