/**
 * Year-end reopening — super_admin only.
 *
 * Reopening a closed fiscal year:
 *   1. Void the closing journal (omföring) → reversal posted in same year
 *   2. Void the opening journal (IB) in the next year (if exists)
 *   3. Reset all period statuses from "closed" back to "locked"
 *   4. Clear all closing metadata from FiscalYear
 *   5. Set FiscalYear.status back to "open"
 *
 * This is a destructive operation. The audit log records the full before-state
 * so the closing snapshot remains recoverable from history.
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { voidJournal } from "@/lib/accounting/journals"

export class FiscalYearNotClosedError extends Error {
  constructor() { super("Fiscal year is not closed — nothing to reopen") }
}

export async function reopenFiscalYear(
  organizationId:   string,
  fiscalYearId:     string,
  reopenedByUserId: string,
  reason:           string
): Promise<void> {
  const fy = await prisma.fiscalYear.findFirst({
    where: { id: fiscalYearId, organizationId },
  })

  if (!fy || fy.status !== "closed") {
    throw new FiscalYearNotClosedError()
  }

  // Snapshot before-state for audit
  const before = {
    status:           fy.status,
    closingJournalId: fy.closingJournalId,
    openingJournalId: fy.openingJournalId,
    closedAt:         fy.closedAt,
    closedById:       fy.closedById,
    closingHash:      fy.closingHash,
  }

  // 1. Void closing journal (if exists and still posted)
  if (fy.closingJournalId) {
    const closingJournal = await prisma.journal.findFirst({
      where: { id: fy.closingJournalId, organizationId },
    })
    if (closingJournal?.status === "posted") {
      await voidJournal(organizationId, fy.closingJournalId, reopenedByUserId, `Återöppning av räkenskapsår: ${reason}`)
    }
  }

  // 2. Void opening journal in the next year (if exists and still posted)
  if (fy.openingJournalId) {
    const openingJournal = await prisma.journal.findFirst({
      where: { id: fy.openingJournalId, organizationId },
    })
    if (openingJournal?.status === "posted") {
      // The opening journal lives in the next fiscal year — voidJournal checks that year is open
      await voidJournal(organizationId, fy.openingJournalId, reopenedByUserId, `Återöppning av räkenskapsår: ${reason}`)
    }
  }

  const now = new Date()

  // 3+4+5. Reset periods + clear closing metadata + reopen in one transaction
  await prisma.$transaction([
    // Periods: closed → locked (reversible state)
    prisma.accountingPeriod.updateMany({
      where: { fiscalYearId, organizationId, status: "closed" },
      data:  { status: "locked" },
    }),
    // Clear all closing metadata
    prisma.fiscalYear.update({
      where: { id: fiscalYearId },
      data: {
        status:                       "open",
        closingJournalId:             null,
        openingJournalId:             null,
        closingHash:                  null,
        closedAt:                     null,
        closedById:                   null,
        reopenedAt:                   now,
        reopenedById:                 reopenedByUserId,
        closedBalanceSheetSnapshot:   Prisma.DbNull,
        closedIncomeStatementSnapshot: Prisma.DbNull,
      },
    }),
  ])

  // Audit log
  prisma.auditLog.create({
    data: {
      organizationId,
      userId:     reopenedByUserId,
      action:     "update",
      entityType: "FiscalYear",
      entityId:   fiscalYearId,
      before,
      after:      { status: "open", reopenedAt: now, reason },
      meta:       { reason, fy: fy.name },
    },
  }).catch(() => {})
}
