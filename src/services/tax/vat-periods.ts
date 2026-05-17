import { prisma } from "@/lib/prisma"
import { getVatReport } from "@/services/reports/vat-report"
import { createHash } from "crypto"
import type { VatPeriod, VatPeriodType, VatPeriodStatus } from "@prisma/client"

export type { VatPeriod }

export type VatPeriodWithAmounts = {
  id:                string
  organizationId:    string
  periodType:        VatPeriodType
  periodStart:       Date
  periodEnd:         Date
  status:            VatPeriodStatus
  box05:             bigint | null
  box06:             bigint | null
  box07:             bigint | null
  box10:             bigint | null
  box11:             bigint | null
  box12:             bigint | null
  box48:             bigint | null
  box49:             bigint | null
  snapshotHash:      string | null
  calculatedAt:      Date | null
  submittedAt:       Date | null
  submittedByUserId: string | null
  lockedAt:          Date | null
  lockedByUserId:    string | null
  createdAt:         Date
  updatedAt:         Date
}

// Calculate VAT amounts from ledger (live, not frozen)
export async function calculateVatPeriod(
  organizationId: string,
  vatPeriodId: string
): Promise<VatPeriodWithAmounts> {
  const period = await prisma.vatPeriod.findUnique({ where: { id: vatPeriodId } })
  if (!period || period.organizationId !== organizationId) {
    throw new Error("Not found")
  }
  if (period.status === "locked") {
    throw new Error("Period is locked")
  }

  const fromDate = period.periodStart.toISOString().slice(0, 10)
  const toDate   = period.periodEnd.toISOString().slice(0, 10)

  const report = await getVatReport({ organizationId, fromDate, toDate })

  return prisma.vatPeriod.update({
    where: { id: vatPeriodId },
    data: {
      box05:        report.box05,
      box06:        report.box06,
      box07:        report.box07,
      box10:        report.box10,
      box11:        report.box11,
      box12:        report.box12,
      box48:        report.box48,
      box49:        report.box49,
      status:       "calculated",
      calculatedAt: new Date(),
    },
  })
}

// Lock period — freeze amounts, create snapshot hash
export async function lockVatPeriod(
  organizationId: string,
  vatPeriodId: string,
  lockedByUserId: string
): Promise<VatPeriodWithAmounts> {
  const period = await prisma.vatPeriod.findUnique({ where: { id: vatPeriodId } })
  if (!period || period.organizationId !== organizationId) {
    throw new Error("Not found")
  }
  if (period.status === "locked") {
    throw new Error("Already locked")
  }

  if (period.status !== "calculated") {
    // Auto-calculate first
    await calculateVatPeriod(organizationId, vatPeriodId)
  }

  // Re-fetch after potential calculation
  const updated = await prisma.vatPeriod.findUnique({ where: { id: vatPeriodId } })
  if (!updated) throw new Error("Not found after calculation")

  // Compute snapshot hash
  const payload = JSON.stringify({
    id:             vatPeriodId,
    organizationId,
    periodStart:    updated.periodStart.toISOString(),
    periodEnd:      updated.periodEnd.toISOString(),
    box05:          updated.box05?.toString(),
    box06:          updated.box06?.toString(),
    box07:          updated.box07?.toString(),
    box10:          updated.box10?.toString(),
    box11:          updated.box11?.toString(),
    box12:          updated.box12?.toString(),
    box48:          updated.box48?.toString(),
    box49:          updated.box49?.toString(),
  })
  const snapshotHash = createHash("sha256").update(payload).digest("hex")

  return prisma.vatPeriod.update({
    where: { id: vatPeriodId },
    data: {
      status:          "locked",
      lockedAt:        new Date(),
      lockedByUserId,
      snapshotHash,
    },
  })
}

// Get due date for a VAT period (SKV rules)
export function getVatDueDate(period: {
  periodEnd:  Date
  periodType: string
}): Date {
  const end = period.periodEnd

  if (period.periodType === "monthly") {
    // 26th of the month following period end
    return new Date(end.getFullYear(), end.getMonth() + 1, 26)
  }

  if (period.periodType === "quarterly") {
    // Q1: May 12, Q2: Aug 17, Q3: Nov 17, Q4: Feb 12 next year
    const q = Math.floor(end.getMonth() / 3)
    const dueDates = [
      new Date(end.getFullYear(), 4, 12),      // Q1 → May 12
      new Date(end.getFullYear(), 7, 17),      // Q2 → Aug 17
      new Date(end.getFullYear(), 10, 17),     // Q3 → Nov 17
      new Date(end.getFullYear() + 1, 1, 12),  // Q4 → Feb 12 next year
    ]
    return dueDates[q]
  }

  // yearly: March 26 following year
  return new Date(end.getFullYear() + 1, 2, 26)
}
