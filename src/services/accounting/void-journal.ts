/**
 * voidJournal — creates a reversing journal and marks the original as voided.
 *
 * Algorithm:
 *   1. Load original journal with entries (must be posted)
 *   2. Resolve open fiscal year and period for today
 *   3. Increment series counter (same series as original)
 *   4. Create reversal journal (mirrored debit/credit) in current open period
 *   5. Set original journal status = voided, voidReason = reason
 *   6. Write audit log + dispatch notification
 *
 * The reversal journal is posted in the CURRENT open period, not the
 * original period — this is correct Swedish accounting practice.
 */

import { prisma }             from "@/lib/prisma"
import { dispatchEvent }      from "@/lib/notifications/dispatcher"
import { getOrCreatePeriod }  from "./periods"
import {
  JournalNotFoundError,
  JournalNotPostedError,
  JournalAlreadyVoidedError,
} from "@/lib/accounting/posting/errors"
import { FiscalYearNotFoundError } from "@/lib/accounting/journals"
import type { Journal } from "@prisma/client"

export async function voidJournal(
  organizationId: string,
  journalId:      string,
  userId:         string,
  reason:         string,
): Promise<{ original: Journal; reversal: Journal }> {
  // ── 1. Load original journal ───────────────────────────────────────────────
  const original = await prisma.journal.findFirst({
    where:   { id: journalId, organizationId },
    include: { entries: true, series: true },
  })
  if (!original) throw new JournalNotFoundError(journalId)
  if (original.status === "voided")  throw new JournalAlreadyVoidedError(journalId)
  if (original.status !== "posted")  throw new JournalNotPostedError(journalId)

  const now       = new Date()
  const todayStr  = now.toISOString().slice(0, 10)
  const todayDate = new Date(todayStr)

  // ── 2–5. Atomic transaction ───────────────────────────────────────────────
  const reversal = await prisma.$transaction(async (tx) => {
    // Resolve open fiscal year for today
    const fy = await tx.fiscalYear.findFirst({
      where: {
        organizationId,
        startDate: { lte: todayDate },
        endDate:   { gte: todayDate },
        status:    "open",
      },
    })
    if (!fy) throw new FiscalYearNotFoundError()

    // Lazy-create period for today
    const period = await getOrCreatePeriod(tx, organizationId, fy.id, todayDate)

    // Increment series counter (same series as original)
    const series = await tx.journalSeries.update({
      where: { id: original.seriesId },
      data:  { currentSeq: { increment: 1 } },
    })

    const number    = series.currentSeq
    const reference = `${series.prefix}-${String(number).padStart(4, "0")}`

    // Create reversal journal with mirrored entries
    const created = await tx.journal.create({
      data: {
        organizationId,
        fiscalYearId:    fy.id,
        seriesId:        original.seriesId,
        periodId:        period.id,
        number,
        reference,
        date:            todayDate,
        description:     `Motpost: ${original.reference} — ${reason}`,
        status:          "posted",
        postedAt:        now,
        postedByUserId:  userId,
        createdByUserId: userId,
        sourceType:      "reversal",
        sourceId:        original.id,
        voidOf:          original.id,
        entries: {
          create: original.entries.map((e, i) => ({
            organizationId,
            accountId:   e.accountId,
            debit:       e.credit, // mirror: original debit → reversal credit
            credit:      e.debit,  // mirror: original credit → reversal debit
            description: e.description ?? null,
            vatCode:     e.vatCode    ?? null,
            sortOrder:   i,
          })),
        },
      },
    })

    // Mark original as voided
    await tx.journal.update({
      where: { id: journalId },
      data: {
        status:     "voided",
        voidReason: reason,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "journal_void",
        entityType: "Journal",
        entityId:   journalId,
        meta: {
          originalReference: original.reference,
          reversalReference: reference,
          reversalJournalId: created.id,
          reason,
        },
      },
    })

    return created
  })

  // ── 6. Dispatch notification ───────────────────────────────────────────────
  dispatchEvent({
    organizationId,
    type:        "journal_voided",
    actorUserId: userId,
    entityType:  "Journal",
    entityId:    journalId,
    payload: {
      _version:          1,
      href:              `/accounting/journals/${journalId}`,
      displayTitle:      `Verifikation ${original.reference} makulerad`,
      displaySubtitle:   reason,
      journalId,
      originalReference: original.reference,
      reversalJournalId: reversal.id,
      reversalReference: reversal.reference,
      reason,
      voidedByUserId:    userId,
    },
  }).catch((err) => console.error("[void-journal] notify failed", err))

  return { original: { ...original, status: "voided", voidReason: reason }, reversal }
}
