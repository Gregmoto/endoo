/**
 * postAccrualPeriod — posts a combined journal for all planned accrual periods
 * that fall in the given YYYY-MM period for an organization.
 *
 * Journal entries depend on AccrualType:
 *
 *   prepaid_expense  DR accrualAccount (1710…), CR mainAccount (5xxx/6xxx)
 *     — spreading a pre-paid cost forward
 *
 *   accrued_expense  DR mainAccount (5xxx/6xxx), CR accrualAccount (29xx)
 *     — recognising a cost not yet invoiced
 *
 *   prepaid_revenue  DR mainAccount (3xxx), CR accrualAccount (28xx)
 *     — deferring revenue already received
 *
 *   accrued_revenue  DR accrualAccount (17xx), CR mainAccount (3xxx)
 *     — recognising revenue not yet invoiced
 *
 * All periods for the same org+month are collected into ONE journal to keep
 * the ledger clean.
 */

import { prisma } from "@/lib/prisma"
import { createJournal, postJournal } from "@/lib/accounting/journals"
import type { AccrualType } from "@prisma/client"
import type { JournalEntryInput } from "@/lib/accounting/journals"

export interface PostAccrualResult {
  period:    string
  posted:    number
  skipped:   number
  journalId: string | null
}

async function resolveAccountIds(
  organizationId: string,
  numbers: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(numbers)]
  const rows = await prisma.account.findMany({
    where:  { organizationId, number: { in: unique } },
    select: { id: true, number: true },
  })
  return new Map(rows.map(r => [r.number, r.id]))
}

function buildEntries(
  type:         AccrualType,
  amount:       bigint,
  mainAccId:    string,
  accrualAccId: string,
  description:  string,
): JournalEntryInput[] {
  switch (type) {
    case "prepaid_expense":
      // Recognise the pre-paid expense in the current period
      return [
        { accountId: mainAccId,    debit: amount, credit: 0n,     description },
        { accountId: accrualAccId, debit: 0n,     credit: amount, description },
      ]
    case "accrued_expense":
      // Accrue a cost not yet received
      return [
        { accountId: mainAccId,    debit: amount, credit: 0n,     description },
        { accountId: accrualAccId, debit: 0n,     credit: amount, description },
      ]
    case "prepaid_revenue":
      // Move deferred revenue to earned
      return [
        { accountId: accrualAccId, debit: amount, credit: 0n,     description },
        { accountId: mainAccId,    debit: 0n,     credit: amount, description },
      ]
    case "accrued_revenue":
      // Accrue revenue not yet invoiced
      return [
        { accountId: accrualAccId, debit: amount, credit: 0n,     description },
        { accountId: mainAccId,    debit: 0n,     credit: amount, description },
      ]
  }
}

export async function postAccrualPeriod(
  organizationId: string,
  period: string,
  postedByUserId: string,
): Promise<PostAccrualResult> {
  // Load all planned periods for this org+period, along with their parent accrual
  const rows = await prisma.accrualPeriod.findMany({
    where:   { organizationId, period, status: "planned" },
    include: { accrual: true },
  })

  if (rows.length === 0) return { period, posted: 0, skipped: 0, journalId: null }

  // Collect all unique account numbers needed
  const accountNumbers = new Set<string>()
  for (const row of rows) {
    accountNumbers.add(row.accrual.mainAccount)
    accountNumbers.add(row.accrual.accrualAccount)
  }
  const accountMap = await resolveAccountIds(organizationId, [...accountNumbers])

  // Build combined journal entries, skipping rows with missing accounts
  const entries: JournalEntryInput[] = []
  const postedIds: string[] = []
  let skipped = 0

  for (const row of rows) {
    const mainAccId    = accountMap.get(row.accrual.mainAccount)
    const accrualAccId = accountMap.get(row.accrual.accrualAccount)
    if (!mainAccId || !accrualAccId) { skipped++; continue }

    const lineEntries = buildEntries(
      row.accrual.type,
      row.amount,
      mainAccId,
      accrualAccId,
      `${row.accrual.accrualNumber} — ${row.accrual.description}`,
    )
    entries.push(...lineEntries)
    postedIds.push(row.id)
  }

  if (entries.length === 0) return { period, posted: 0, skipped, journalId: null }

  const periodDate = `${period}-01`
  const draft = await createJournal({
    organizationId,
    seriesPrefix:    "A",
    date:            periodDate,
    description:     `Periodiseringar ${period}`,
    sourceType:      "accrual",
    createdByUserId: postedByUserId,
    entries,
  })

  const journal = await postJournal(organizationId, draft.id, postedByUserId)

  // Mark all processed periods as posted
  await prisma.accrualPeriod.updateMany({
    where: { id: { in: postedIds } },
    data:  { status: "posted", journalId: journal.id },
  })

  // Mark accruals as completed if all their periods are now posted
  const accrualIds = [...new Set(rows.filter(r => postedIds.includes(r.id)).map(r => r.accrualId))]
  for (const accrualId of accrualIds) {
    const remaining = await prisma.accrualPeriod.count({
      where: { accrualId, status: "planned" },
    })
    if (remaining === 0) {
      await prisma.accrual.update({
        where: { id: accrualId },
        data:  { status: "completed" },
      })
    }
  }

  return { period, posted: postedIds.length, skipped, journalId: journal.id }
}

export async function reverseAccrual(
  organizationId: string,
  accrualId:      string,
  reversedByUserId: string,
): Promise<void> {
  const accrual = await prisma.accrual.findFirst({
    where:   { id: accrualId, organizationId },
    include: { periods: true },
  })
  if (!accrual) throw Object.assign(new Error("Periodisering hittades ej"), { name: "NotFoundError" })
  if (accrual.status === "reversed") {
    throw Object.assign(new Error("Periodiseringen är redan återförd"), { name: "ValidationError" })
  }

  const { voidJournal } = await import("@/lib/accounting/journals")

  // Void all posted period journals
  const postedPeriods = accrual.periods.filter(p => p.status === "posted" && p.journalId)
  const voidedJournalIds = new Set<string>()
  for (const p of postedPeriods) {
    if (!p.journalId || voidedJournalIds.has(p.journalId)) continue
    await voidJournal(organizationId, p.journalId, reversedByUserId, `Återföring av periodisering ${accrual.accrualNumber}`)
    voidedJournalIds.add(p.journalId)
  }

  // Set all planned periods to a terminal state by marking them as the accrual is reversed
  // (we can't change AccrualPeriodStatus enum — just mark the parent reversed)
  await prisma.accrual.update({
    where: { id: accrualId },
    data:  { status: "reversed" },
  })

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId:     reversedByUserId,
      action:     "accrual_reverse",
      entityType: "accrual",
      entityId:   accrualId,
      meta:       { accrualNumber: accrual.accrualNumber },
    },
  })
}
