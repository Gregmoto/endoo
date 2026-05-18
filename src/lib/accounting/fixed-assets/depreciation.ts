/**
 * postPeriodDepreciation — posts depreciation journal entries for all active
 * assets in an organization for a given period ("YYYY-MM").
 *
 * previewPeriod — dry-run: returns what would be posted without writing anything.
 */

import { prisma } from "@/lib/prisma"
import { createJournal, postJournal } from "@/lib/accounting/journals"
import { calculateSchedule } from "./schedule"

export interface DepreciationLine {
  assetId:     string
  assetName:   string
  assetNumber: string
  period:      string
  depreciationAmount: bigint
  accumulatedAmount:  bigint
  bookValue:          bigint
  alreadyPosted: boolean
}

export interface PostPeriodResult {
  period:     string
  posted:     number
  skipped:    number
  journalIds: string[]
}

/** Resolve account UUIDs by their account numbers for a given org. */
async function resolveAccountIds(
  organizationId: string,
  numbers: string[],
): Promise<Map<string, string>> {
  const accounts = await prisma.account.findMany({
    where: { organizationId, number: { in: numbers } },
    select: { id: true, number: true },
  })
  return new Map(accounts.map(a => [a.number, a.id]))
}

export async function previewPeriod(
  organizationId: string,
  period: string,
): Promise<DepreciationLine[]> {
  const assets = await prisma.fixedAsset.findMany({
    where: { organizationId, status: "active" },
    include: { schedules: { where: { period } } },
  })

  const lines: DepreciationLine[] = []
  for (const asset of assets) {
    const sched = calculateSchedule({
      acquisitionDate:    asset.acquisitionDate,
      acquisitionCost:    asset.acquisitionCost,
      residualValue:      asset.residualValue,
      usefulLifeMonths:   asset.usefulLifeMonths,
      depreciationMethod: asset.depreciationMethod,
      declineRate:        asset.declineRate ? Number(asset.declineRate) : null,
    })
    const line = sched.find(l => l.period === period)
    if (!line) continue

    lines.push({
      assetId:            asset.id,
      assetName:          asset.name,
      assetNumber:        asset.assetNumber,
      period,
      depreciationAmount: line.depreciationAmount,
      accumulatedAmount:  line.accumulatedAmount,
      bookValue:          line.bookValue,
      alreadyPosted:      asset.schedules.some(s => s.status === "posted"),
    })
  }
  return lines
}

export async function postPeriodDepreciation(
  organizationId: string,
  period: string,
  postedByUserId: string,
): Promise<PostPeriodResult> {
  const assets = await prisma.fixedAsset.findMany({
    where: { organizationId, status: "active" },
    include: { schedules: { where: { period } } },
  })

  const journalIds: string[] = []
  let posted  = 0
  let skipped = 0

  for (const asset of assets) {
    const existing = asset.schedules.find(s => s.period === period)
    if (existing?.status === "posted") { skipped++; continue }

    const sched = calculateSchedule({
      acquisitionDate:    asset.acquisitionDate,
      acquisitionCost:    asset.acquisitionCost,
      residualValue:      asset.residualValue,
      usefulLifeMonths:   asset.usefulLifeMonths,
      depreciationMethod: asset.depreciationMethod,
      declineRate:        asset.declineRate ? Number(asset.declineRate) : null,
    })
    const line = sched.find(l => l.period === period)
    if (!line) { skipped++; continue }

    const amount = line.depreciationAmount

    // Resolve account UUIDs
    const accountMap = await resolveAccountIds(organizationId, [
      asset.depreciationAccount,
      asset.accumulatedDepreciationAccount,
    ])
    const depAccId   = accountMap.get(asset.depreciationAccount)
    const accumAccId = accountMap.get(asset.accumulatedDepreciationAccount)
    if (!depAccId || !accumAccId) { skipped++; continue }

    const periodDate = `${period}-01`

    const draft = await createJournal({
      organizationId,
      seriesPrefix:    "A",
      date:            periodDate,
      description:     `Avskrivning ${asset.assetNumber} — ${period}`,
      sourceType:      "depreciation",
      sourceId:        asset.id,
      createdByUserId: postedByUserId,
      entries: [
        { accountId: depAccId,   debit: amount,  credit: 0n,     description: `Avskrivning ${asset.name}` },
        { accountId: accumAccId, debit: 0n,       credit: amount, description: `Ackumulerad avskrivning ${asset.name}` },
      ],
    })

    const journal = await postJournal(organizationId, draft.id, postedByUserId)

    // Upsert the schedule row
    await prisma.depreciationSchedule.upsert({
      where: {
        organizationId_fixedAssetId_period: {
          organizationId,
          fixedAssetId: asset.id,
          period,
        },
      },
      create: {
        organizationId,
        fixedAssetId:       asset.id,
        period,
        depreciationAmount: line.depreciationAmount,
        accumulatedAmount:  line.accumulatedAmount,
        bookValue:          line.bookValue,
        journalId:          journal.id,
        status:             "posted",
      },
      update: {
        journalId: journal.id,
        status:    "posted",
      },
    })

    // Mark fully-depreciated assets as written_off
    if (line.bookValue <= asset.residualValue) {
      await prisma.fixedAsset.update({
        where: { id: asset.id },
        data:  { status: "written_off" },
      })
    }

    journalIds.push(journal.id)
    posted++
  }

  return { period, posted, skipped, journalIds }
}
