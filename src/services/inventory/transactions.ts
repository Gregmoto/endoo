import { prisma }         from "@/lib/prisma"
import { Decimal }        from "@prisma/client/runtime/library"
import type { InventoryTxType } from "@prisma/client"
import { getStockLevel }  from "./stock"

export type CreateTransactionInput = {
  organizationId:  string
  itemId:          string
  type:            InventoryTxType
  quantity:        number           // positive = in, negative = out
  unitCost:        number           // SEK (not öre) — converted internally
  memo?:           string
  sourceType?:     string
  sourceId?:       string
  transactedAt:    string           // "YYYY-MM-DD"
  createdByUserId?: string
}

export async function createTransaction(input: CreateTransactionInput) {
  const {
    organizationId, itemId, type, quantity, unitCost,
    memo, sourceType, sourceId, transactedAt, createdByUserId,
  } = input

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } })
  if (!item || item.organizationId !== organizationId) {
    throw new Error("Inventory item not found")
  }

  const qty       = new Decimal(quantity)
  const unitOre   = BigInt(Math.round(unitCost * 100))
  const totalCost = BigInt(Math.round(Math.abs(quantity) * unitCost * 100))

  return prisma.inventoryTransaction.create({
    data: {
      organizationId,
      itemId,
      type,
      quantity:  qty,
      unitCost:  unitOre,
      totalCost,
      memo:       memo ?? null,
      sourceType: sourceType ?? null,
      sourceId:   sourceId ?? null,
      transactedAt: new Date(transactedAt),
      createdByUserId: createdByUserId ?? null,
    },
  })
}

export type CountInput = {
  organizationId:   string
  itemId:           string
  countedQuantity:  number    // räknat antal
  unitCost?:        number    // SEK — om man vill sätta kostnad
  memo?:            string
  transactedAt:     string
  createdByUserId?: string
}

// Inventering: nollställ aktuellt saldo och sätt räknat antal.
// Creates two rows: count_set (räknat) + adjustment (diff), netto = countedQuantity.
export async function recordStockCount(input: CountInput) {
  const { organizationId, itemId, countedQuantity, unitCost = 0, memo, transactedAt, createdByUserId } = input

  const current = await getStockLevel(organizationId, itemId)
  if (!current) throw new Error("Inventory item not found")

  const currentQty = current.quantity
  const diff       = new Decimal(countedQuantity).sub(currentQty)
  const unitOre    = unitCost > 0 ? BigInt(Math.round(unitCost * 100)) : current.avgCost
  const date       = new Date(transactedAt)
  const baseArgs   = { organizationId, itemId, unitCost: unitOre, memo: memo ?? `Inventering ${transactedAt}`, transactedAt: date, createdByUserId: createdByUserId ?? null }

  // If already at correct level, nothing to do
  if (diff.isZero()) return { diff: 0, transactions: [] }

  const tx = await prisma.inventoryTransaction.create({
    data: {
      ...baseArgs,
      type:      "adjustment",
      quantity:  diff,
      totalCost: BigInt(Math.round(Math.abs(diff.toNumber()) * Number(unitOre))),
    },
  })

  return { diff: diff.toNumber(), transactions: [tx] }
}
