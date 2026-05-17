/**
 * Accounting period service.
 *
 * Periods are monthly buckets that sit between FiscalYear and Journal.
 * They are created lazily on first journal post.
 *
 * State machine:
 *   open → locked  (lockPeriod   — admin, captures snapshot)
 *   locked → open  (unlockPeriod — admin, mandatory reason)
 *   locked → closed (closePeriod — hard close, platform admin only)
 *   closed → open  (unlockPeriod with isPlatformAdmin — rare)
 */

import { createHash }  from "crypto"
import { prisma }      from "@/lib/prisma"
import { dispatchEvent } from "@/lib/notifications/dispatcher"
import {
  PeriodLockedError,
  PeriodClosedError,
  PeriodNotFoundError,
} from "@/lib/accounting/posting/errors"
import type { AccountingPeriod } from "@prisma/client"

// ─── getOrCreatePeriod ────────────────────────────────────────────────────────

/**
 * Finds or lazily creates the AccountingPeriod for a given date.
 * Must be called inside a transaction when used during posting.
 */
export async function getOrCreatePeriod(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  organizationId: string,
  fiscalYearId:   string,
  date:           Date,
): Promise<AccountingPeriod> {
  const year  = date.getFullYear()
  const month = date.getMonth() + 1 // 1-indexed

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate   = new Date(Date.UTC(year, month, 0)) // last day of month

  // Upsert: create if not exists, return existing if it does
  return tx.accountingPeriod.upsert({
    where:  { organizationId_year_month: { organizationId, year, month } },
    update: {},
    create: {
      organizationId,
      fiscalYearId,
      year,
      month,
      startDate,
      endDate,
      status: "open",
    },
  })
}

// ─── assertPeriodOpen ─────────────────────────────────────────────────────────

/**
 * Throws PeriodLockedError or PeriodClosedError if the period for
 * the given date is not open.
 *
 * Call this inside the posting transaction before creating a journal,
 * passing the interactive tx client.
 */
export async function assertPeriodOpen(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  organizationId: string,
  date:           Date,
): Promise<void> {
  const year  = date.getFullYear()
  const month = date.getMonth() + 1

  const period = await tx.accountingPeriod.findUnique({
    where:  { organizationId_year_month: { organizationId, year, month } },
    select: { id: true, status: true },
  })

  if (!period) return // period not yet created → open by definition

  if (period.status === "locked") {
    throw new PeriodLockedError(year, month, period.id)
  }
  if (period.status === "closed") {
    throw new PeriodClosedError(year, month, period.id)
  }
}

// ─── lockPeriod ───────────────────────────────────────────────────────────────

/**
 * Locks a period:
 *   1. Validates it is currently open
 *   2. Aggregates posted journal totals (snapshot)
 *   3. Updates period status to "locked"
 *   4. Writes immutable snapshot
 *   5. Writes audit event
 *   6. Dispatches notification
 */
export async function lockPeriod(
  organizationId: string,
  periodId:       string,
  userId:         string,
): Promise<AccountingPeriod> {
  const period = await prisma.accountingPeriod.findFirst({
    where: { id: periodId, organizationId },
  })
  if (!period) throw new PeriodNotFoundError(periodId)
  if (period.status === "locked") return period
  if (period.status === "closed") {
    throw new PeriodClosedError(period.year, period.month, periodId)
  }

  // Aggregate totals from all posted + voided journals in this period
  const [postedAgg, voidedCount] = await Promise.all([
    prisma.journalEntry.aggregate({
      where: {
        organizationId,
        journal: { periodId, status: "posted" },
      },
      _sum: { debit: true, credit: true },
    }),
    prisma.journal.count({
      where: { organizationId, periodId, status: "voided" },
    }),
  ])

  const postedCount = await prisma.journal.count({
    where: { organizationId, periodId, status: "posted" },
  })

  const totalDebit  = postedAgg._sum.debit  ?? 0n
  const totalCredit = postedAgg._sum.credit ?? 0n
  const snapshotHash = computeSnapshotHash(
    periodId,
    totalDebit,
    totalCredit,
    postedCount,
    voidedCount,
  )

  const updated = await prisma.$transaction(async (tx) => {
    const locked = await tx.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status:        "locked",
        lockedAt:      new Date(),
        lockedByUserId: userId,
      },
    })

    await tx.accountingPeriodSnapshot.create({
      data: {
        organizationId,
        periodId,
        totalDebit,
        totalCredit,
        journalCount: postedCount,
        voidedCount,
        snapshotHash,
      },
    })

    await tx.accountingPeriodEvent.create({
      data: {
        organizationId,
        periodId,
        eventType: "locked",
        userId,
        meta: { journalCount: postedCount, voidedCount },
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "period_lock",
        entityType: "AccountingPeriod",
        entityId:   periodId,
        meta: { year: period.year, month: period.month, journalCount: postedCount },
      },
    })

    return locked
  })

  dispatchEvent({
    organizationId,
    type:        "period_locked",
    actorUserId: userId,
    entityType:  "AccountingPeriod",
    entityId:    periodId,
    payload: {
      _version:       1,
      href:           `/accounting/periods/${periodId}`,
      displayTitle:   `Period ${period.year}-${String(period.month).padStart(2, "0")} låst`,
      displaySubtitle: `${postedCount} verifikationer — ${formatAmount(totalDebit)} debet`,
      periodId,
      year:           period.year,
      month:          period.month,
      journalCount:   postedCount,
      lockedByUserId: userId,
    },
  }).catch((err) => console.error("[periods] lock notify failed", err))

  return updated
}

// ─── unlockPeriod ─────────────────────────────────────────────────────────────

/**
 * Unlocks a locked or closed period.
 * reason is mandatory — no unlock without accountability.
 * isPlatformAdmin is required to reopen a closed period.
 */
export async function unlockPeriod(
  organizationId:  string,
  periodId:        string,
  userId:          string,
  reason:          string,
  isPlatformAdmin: boolean = false,
): Promise<AccountingPeriod> {
  const period = await prisma.accountingPeriod.findFirst({
    where: { id: periodId, organizationId },
  })
  if (!period) throw new PeriodNotFoundError(periodId)

  if (period.status === "open") return period

  if (period.status === "closed" && !isPlatformAdmin) {
    throw new PeriodClosedError(period.year, period.month, periodId)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const unlocked = await tx.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status:         "open",
        lockedAt:       null,
        lockedByUserId: null,
        closedAt:       null,
        closedByUserId: null,
      },
    })

    // Delete snapshot so it can be recreated on next lock
    await tx.accountingPeriodSnapshot.deleteMany({ where: { periodId } })

    await tx.accountingPeriodEvent.create({
      data: {
        organizationId,
        periodId,
        eventType: period.status === "closed" ? "reopened" : "unlocked",
        userId,
        reason,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "period_unlock",
        entityType: "AccountingPeriod",
        entityId:   periodId,
        meta: { year: period.year, month: period.month, reason },
      },
    })

    return unlocked
  })

  dispatchEvent({
    organizationId,
    type:        "period_unlocked",
    actorUserId: userId,
    entityType:  "AccountingPeriod",
    entityId:    periodId,
    payload: {
      _version:        1,
      href:            `/accounting/periods/${periodId}`,
      displayTitle:    `Period ${period.year}-${String(period.month).padStart(2, "0")} upplåst`,
      displaySubtitle: reason,
      periodId,
      year:            period.year,
      month:           period.month,
      reason,
      unlockedByUserId: userId,
    },
  }).catch((err) => console.error("[periods] unlock notify failed", err))

  return updated
}

// ─── closePeriod ──────────────────────────────────────────────────────────────

/**
 * Hard closes a locked period. Platform admin only.
 * A closed period requires platform admin to reopen.
 */
export async function closePeriod(
  organizationId: string,
  periodId:       string,
  userId:         string,
): Promise<AccountingPeriod> {
  const period = await prisma.accountingPeriod.findFirst({
    where: { id: periodId, organizationId },
  })
  if (!period) throw new PeriodNotFoundError(periodId)
  if (period.status === "closed") return period
  if (period.status === "open") {
    // Auto-lock first to capture snapshot, then close
    await lockPeriod(organizationId, periodId, userId)
  }

  return prisma.$transaction(async (tx) => {
    const closed = await tx.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status:        "closed",
        closedAt:      new Date(),
        closedByUserId: userId,
      },
    })

    await tx.accountingPeriodEvent.create({
      data: { organizationId, periodId, eventType: "closed", userId },
    })

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "period_close",
        entityType: "AccountingPeriod",
        entityId:   periodId,
        meta: { year: period.year, month: period.month },
      },
    })

    return closed
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSnapshotHash(
  periodId:     string,
  totalDebit:   bigint,
  totalCredit:  bigint,
  journalCount: number,
  voidedCount:  number,
): string {
  const raw = `${periodId}:${totalDebit}:${totalCredit}:${journalCount}:${voidedCount}`
  return createHash("sha256").update(raw).digest("hex")
}

function formatAmount(ore: bigint): string {
  return `${(Number(ore) / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} SEK`
}
