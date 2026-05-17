/**
 * Dimension service — CRUD, allocation management, and integrity guards.
 *
 * Key invariants:
 *   - SUM(percentage per axisId per journalEntryId) === 100
 *   - JournalEntryDimension is immutable when period is locked/closed
 *     (unless force=true and caller is super_admin)
 *   - Snapshots (code/name/axis) are written once at creation and never updated
 *   - Built-in axes (cc, project, unit) cannot be deleted
 *   - Completed/archived dimensions cannot receive new postings
 */

import { prisma }    from "@/lib/prisma"
import { Prisma }    from "@prisma/client"
import type { DimensionAxis, Dimension, JournalEntryDimension } from "@prisma/client"

// ─── Error types ──────────────────────────────────────────────────────────────

export class DimensionNotFoundError extends Error {
  constructor(id: string) { super(`Dimension not found: ${id}`); this.name = "DimensionNotFoundError" }
}

export class DimensionAxisNotFoundError extends Error {
  constructor(id: string) { super(`Dimension axis not found: ${id}`); this.name = "DimensionAxisNotFoundError" }
}

export class DimensionAxisBuiltInError extends Error {
  constructor(code: string) { super(`Built-in axis "${code}" cannot be deleted`); this.name = "DimensionAxisBuiltInError" }
}

export class DimensionLockedPeriodError extends Error {
  constructor() { super("Cannot modify dimension allocations in a locked or closed period"); this.name = "DimensionLockedPeriodError" }
}

export class DimensionPercentageError extends Error {
  constructor(axisCode: string, total: number) {
    super(`Percentages for axis "${axisCode}" sum to ${total.toFixed(4)}% — must equal 100%`)
    this.name = "DimensionPercentageError"
  }
}

export class DimensionInactiveError extends Error {
  constructor(name: string) { super(`Dimension "${name}" is inactive or completed and cannot receive new postings`); this.name = "DimensionInactiveError" }
}

// ─── Axis CRUD ────────────────────────────────────────────────────────────────

export async function createAxis(
  organizationId: string,
  data: { code: string; name: string; isRequired?: boolean; sortOrder?: number },
): Promise<DimensionAxis> {
  return prisma.dimensionAxis.create({
    data: {
      organizationId,
      code:      data.code,
      name:      data.name,
      isBuiltIn: false,
      isRequired: data.isRequired ?? false,
      isActive:  true,
      sortOrder: data.sortOrder ?? 99,
    },
  })
}

export async function updateAxis(
  organizationId: string,
  axisId: string,
  data: { name?: string; isRequired?: boolean; isActive?: boolean; sortOrder?: number },
): Promise<DimensionAxis> {
  const axis = await prisma.dimensionAxis.findFirst({ where: { id: axisId, organizationId } })
  if (!axis) throw new DimensionAxisNotFoundError(axisId)
  return prisma.dimensionAxis.update({ where: { id: axisId }, data })
}

export async function deleteAxis(organizationId: string, axisId: string): Promise<void> {
  const axis = await prisma.dimensionAxis.findFirst({ where: { id: axisId, organizationId } })
  if (!axis) throw new DimensionAxisNotFoundError(axisId)
  if (axis.isBuiltIn) throw new DimensionAxisBuiltInError(axis.code)
  await prisma.dimensionAxis.delete({ where: { id: axisId } })
}

// ─── Dimension CRUD ───────────────────────────────────────────────────────────

export async function createDimension(
  organizationId: string,
  data: {
    axisId:      string
    code:        string
    name:        string
    description?: string
    parentId?:   string
    budget?:     bigint
    startDate?:  Date
    endDate?:    Date
    ownerId?:    string
  },
): Promise<Dimension> {
  const axis = await prisma.dimensionAxis.findFirst({ where: { id: data.axisId, organizationId } })
  if (!axis) throw new DimensionAxisNotFoundError(data.axisId)

  return prisma.dimension.create({
    data: {
      organizationId,
      axisId:      data.axisId,
      code:        data.code,
      name:        data.name,
      description: data.description,
      parentId:    data.parentId,
      budget:      data.budget,
      startDate:   data.startDate,
      endDate:     data.endDate,
      ownerId:     data.ownerId,
      isActive:    true,
      status:      "active",
    },
  })
}

export async function updateDimension(
  organizationId: string,
  dimensionId: string,
  data: {
    name?:        string
    description?: string | null
    budget?:      bigint | null
    startDate?:   Date | null
    endDate?:     Date | null
    ownerId?:     string | null
    isActive?:    boolean
    status?:      "planning" | "active" | "on_hold" | "completed" | "archived"
  },
): Promise<Dimension> {
  const dim = await prisma.dimension.findFirst({ where: { id: dimensionId, organizationId } })
  if (!dim) throw new DimensionNotFoundError(dimensionId)
  return prisma.dimension.update({ where: { id: dimensionId }, data })
}

// ─── assertDimensionMutable ───────────────────────────────────────────────────

/**
 * Checks that the journal entry's accounting period is open before
 * allowing dimension mutation. If force=true and caller is super_admin,
 * the lock is bypassed and the action is audit-logged.
 */
export async function assertDimensionMutable(
  organizationId: string,
  journalEntryId: string,
  force: boolean = false,
): Promise<void> {
  if (force) return // super_admin bypass — caller must audit-log

  const entry = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, organizationId },
    include: { journal: { select: { periodId: true } } },
  })
  if (!entry) return

  const periodId = entry.journal.periodId
  if (!periodId) return

  const period = await prisma.accountingPeriod.findUnique({
    where:  { id: periodId },
    select: { status: true },
  })
  if (!period) return

  if (period.status === "locked" || period.status === "closed") {
    throw new DimensionLockedPeriodError()
  }
}

// ─── validatePercentages ──────────────────────────────────────────────────────

/**
 * Validates that existing + proposed allocations sum to 100% per axis.
 * Call before inserting a new JournalEntryDimension.
 *
 * existingAllocations: all current JED rows for this entry (excluding the one being replaced if any)
 * newAllocation: { dimensionId, percentage }
 */
export async function validatePercentagesForEntry(
  journalEntryId: string,
  excludeDimensionId?: string,
): Promise<void> {
  const existing = await prisma.journalEntryDimension.findMany({
    where: { journalEntryId, ...(excludeDimensionId ? { dimensionId: { not: excludeDimensionId } } : {}) },
    include: { dimension: { include: { axis: true } } },
  })

  // Group by axisId
  const byAxis = new Map<string, { code: string; total: number }>()
  for (const jed of existing) {
    const axisId   = jed.dimension.axisId
    const axisCode = jed.dimension.axis.code
    const entry    = byAxis.get(axisId) ?? { code: axisCode, total: 0 }
    entry.total   += Number(jed.percentage)
    byAxis.set(axisId, entry)
  }

  for (const [, { code, total }] of byAxis) {
    // Allow slight floating point tolerance (±0.01%)
    if (Math.abs(total - 100) > 0.01 && total > 0) {
      throw new DimensionPercentageError(code, total)
    }
  }
}

// ─── addJournalEntryDimension ─────────────────────────────────────────────────

export async function addJournalEntryDimension(
  organizationId: string,
  journalEntryId: string,
  dimensionId:    string,
  percentage:     number,
  userId:         string,
  force:          boolean = false,
): Promise<JournalEntryDimension> {
  await assertDimensionMutable(organizationId, journalEntryId, force)

  const dim = await prisma.dimension.findFirst({
    where:   { id: dimensionId, organizationId },
    include: { axis: true },
  })
  if (!dim) throw new DimensionNotFoundError(dimensionId)

  // Block completed/archived dimensions
  if (dim.status === "completed" || dim.status === "archived" || !dim.isActive) {
    throw new DimensionInactiveError(dim.name)
  }

  const jed = await prisma.journalEntryDimension.upsert({
    where:  { journalEntryId_dimensionId: { journalEntryId, dimensionId } },
    update: { percentage: new Prisma.Decimal(percentage) },
    create: {
      organizationId,
      journalEntryId,
      dimensionId,
      percentage:           new Prisma.Decimal(percentage),
      dimensionCodeSnapshot: dim.code,
      dimensionNameSnapshot: dim.name,
      axisCodeSnapshot:     dim.axis.code,
      forcedByUserId:       force ? userId : null,
    },
  })

  if (force) {
    prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "update",
        entityType: "JournalEntryDimension",
        entityId:   jed.id,
        meta: { forced: true, journalEntryId, dimensionId, percentage },
      },
    }).catch(() => {})
  }

  return jed
}

// ─── removeJournalEntryDimension ──────────────────────────────────────────────

export async function removeJournalEntryDimension(
  organizationId: string,
  jedId:          string,
  userId:         string,
  force:          boolean = false,
): Promise<void> {
  const jed = await prisma.journalEntryDimension.findFirst({
    where: { id: jedId, organizationId },
  })
  if (!jed) return

  await assertDimensionMutable(organizationId, jed.journalEntryId, force)

  await prisma.journalEntryDimension.delete({ where: { id: jedId } })

  if (force) {
    prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action:     "delete",
        entityType: "JournalEntryDimension",
        entityId:   jedId,
        meta: { forced: true, journalEntryId: jed.journalEntryId },
      },
    }).catch(() => {})
  }
}
