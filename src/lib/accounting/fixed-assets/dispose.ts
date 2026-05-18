/**
 * disposeAsset — books a disposal journal and marks the asset as disposed.
 *
 * Journal entries:
 *   CR  assetAccount          (book out acquisition cost)
 *   DR  accumulatedDepreciationAccount  (remove accumulated depreciation)
 *   DR  1510                  (proceeds received, if any)
 *   DR/CR  3973/7973          (gain or loss on disposal)
 */

import { prisma } from "@/lib/prisma"
import { createJournal, postJournal } from "@/lib/accounting/journals"
import type { JournalEntryInput } from "@/lib/accounting/journals"

const DISPOSAL_PROCEEDS_ACCOUNT = "1510"   // AR / bank — proceeds from sale
const GAIN_ACCOUNT              = "3973"   // Vinst vid avyttring av anläggningstillgång
const LOSS_ACCOUNT              = "7973"   // Förlust vid avyttring av anläggningstillgång

export interface DisposeAssetInput {
  organizationId:   string
  assetId:          string
  disposalDate:     Date
  proceeds:         bigint  // öre; 0 if scrapped
  disposedByUserId: string
}

export interface DisposeAssetResult {
  journalId: string
  gainLoss:  bigint  // positive = gain, negative = loss
}

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

export async function disposeAsset(input: DisposeAssetInput): Promise<DisposeAssetResult> {
  const { organizationId, assetId, disposalDate, proceeds, disposedByUserId } = input

  const asset = await prisma.fixedAsset.findFirst({
    where: { id: assetId, organizationId },
  })
  if (!asset) throw Object.assign(new Error("Asset not found"), { name: "NotFoundError" })
  if (asset.status !== "active") {
    throw Object.assign(new Error("Asset is not active"), { name: "ValidationError" })
  }

  // Current book value = acquisitionCost minus accumulated posted depreciation
  const lastPosted = await prisma.depreciationSchedule.findFirst({
    where:   { fixedAssetId: assetId, organizationId, status: "posted" },
    orderBy: { period: "desc" },
  })
  const currentBookValue = lastPosted ? lastPosted.bookValue : asset.acquisitionCost
  const accumulated      = asset.acquisitionCost - currentBookValue
  const gainLoss         = proceeds - currentBookValue  // positive = gain

  // Resolve all needed account UUIDs
  const neededNumbers = [
    asset.assetAccount,
    ...(accumulated > 0n ? [asset.accumulatedDepreciationAccount] : []),
    ...(proceeds > 0n   ? [DISPOSAL_PROCEEDS_ACCOUNT] : []),
    ...(gainLoss > 0n   ? [GAIN_ACCOUNT] : gainLoss < 0n ? [LOSS_ACCOUNT] : []),
  ]
  const accountMap = await resolveAccountIds(organizationId, neededNumbers)

  const entries: JournalEntryInput[] = []

  // CR asset account (book out cost)
  const assetAccId = accountMap.get(asset.assetAccount)
  if (!assetAccId) throw new Error(`Account ${asset.assetAccount} not found`)
  entries.push({ accountId: assetAccId, debit: 0n, credit: asset.acquisitionCost,
    description: `Utrangering ${asset.name} — anskaffningsvärde` })

  // DR accumulated depreciation (reverse credit balance)
  if (accumulated > 0n) {
    const accumAccId = accountMap.get(asset.accumulatedDepreciationAccount)
    if (!accumAccId) throw new Error(`Account ${asset.accumulatedDepreciationAccount} not found`)
    entries.push({ accountId: accumAccId, debit: accumulated, credit: 0n,
      description: `Utrangering ${asset.name} — ackumulerade avskrivningar` })
  }

  // DR proceeds
  if (proceeds > 0n) {
    const proceedsAccId = accountMap.get(DISPOSAL_PROCEEDS_ACCOUNT)
    if (!proceedsAccId) throw new Error(`Account ${DISPOSAL_PROCEEDS_ACCOUNT} not found`)
    entries.push({ accountId: proceedsAccId, debit: proceeds, credit: 0n,
      description: `Utrangering ${asset.name} — likvid` })
  }

  // Gain or loss
  if (gainLoss > 0n) {
    const gainAccId = accountMap.get(GAIN_ACCOUNT)
    if (!gainAccId) throw new Error(`Account ${GAIN_ACCOUNT} not found`)
    entries.push({ accountId: gainAccId, debit: 0n, credit: gainLoss,
      description: `Utrangering ${asset.name} — realisationsvinst` })
  } else if (gainLoss < 0n) {
    const lossAccId = accountMap.get(LOSS_ACCOUNT)
    if (!lossAccId) throw new Error(`Account ${LOSS_ACCOUNT} not found`)
    entries.push({ accountId: lossAccId, debit: -gainLoss, credit: 0n,
      description: `Utrangering ${asset.name} — realisationsförlust` })
  }

  // gainLoss == 0 and proceeds == 0 → scrapped at book value 0 (asset fully depreciated)
  // In that case the two entries above already balance (CR asset, DR accum).
  // If book value > 0 and proceeds == 0, there's a loss equal to book value — handled above.

  const dateStr = disposalDate.toISOString().slice(0, 10)
  const draft   = await createJournal({
    organizationId,
    seriesPrefix:    "A",
    date:            dateStr,
    description:     `Utrangering ${asset.assetNumber} — ${asset.name}`,
    sourceType:      "asset_disposal",
    sourceId:        assetId,
    createdByUserId: disposedByUserId,
    entries,
  })

  const journal = await postJournal(organizationId, draft.id, disposedByUserId)

  await prisma.fixedAsset.update({
    where: { id: assetId },
    data: {
      status:            "disposed",
      disposalDate,
      disposalProceeds:  proceeds,
      disposalJournalId: journal.id,
    },
  })

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId:     disposedByUserId,
      action:     "asset_dispose",
      entityType: "fixed_asset",
      entityId:   assetId,
      meta: { proceeds: proceeds.toString(), gainLoss: gainLoss.toString(), journalId: journal.id },
    },
  })

  return { journalId: journal.id, gainLoss }
}
