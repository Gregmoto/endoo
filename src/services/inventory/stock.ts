import { prisma }  from "@/lib/prisma"
import { Decimal } from "@prisma/client/runtime/library"

export type StockLevel = {
  itemId:       string
  productId:    string
  productName:  string
  sku:          string | null
  unitOfMeasure: string
  quantity:     Decimal
  totalValue:   bigint   // öre — sum of totalCost for inbound minus outbound
  avgCost:      bigint   // öre/enhet
  reorderPoint: Decimal | null
  belowReorder: boolean
}

export type TransactionRow = {
  id:            string
  type:          string
  quantity:      Decimal
  unitCost:      bigint
  totalCost:     bigint
  memo:          string | null
  sourceType:    string | null
  sourceId:      string | null
  transactedAt:  Date
  createdAt:     Date
  runningQty:    Decimal  // cumulative after this row
}

export async function getStockLevel(
  organizationId: string,
  itemId: string,
): Promise<StockLevel | null> {
  const item = await prisma.inventoryItem.findUnique({
    where:   { id: itemId },
    include: { product: { select: { name: true, sku: true } }, transactions: true },
  })
  if (!item || item.organizationId !== organizationId) return null

  const qty   = item.transactions.reduce((s, t) => s.add(t.quantity), new Decimal(0))
  const value = item.transactions.reduce((s, t) => s + (t.quantity.gte(0) ? t.totalCost : -t.totalCost), 0n)
  const avgCost = qty.isZero() ? 0n : value / BigInt(qty.toFixed(0))

  return {
    itemId:        item.id,
    productId:     item.productId,
    productName:   item.product.name,
    sku:           item.product.sku,
    unitOfMeasure: item.unitOfMeasure,
    quantity:      qty,
    totalValue:    value < 0n ? 0n : value,
    avgCost:       avgCost < 0n ? 0n : avgCost,
    reorderPoint:  item.reorderPoint,
    belowReorder:  item.reorderPoint !== null && qty.lessThan(item.reorderPoint),
  }
}

export async function getAllStockLevels(organizationId: string): Promise<StockLevel[]> {
  const items = await prisma.inventoryItem.findMany({
    where:   { organizationId, isActive: true },
    include: { product: { select: { name: true, sku: true } }, transactions: true },
    orderBy: [{ product: { name: "asc" } }],
  })

  return items.map(item => {
    const qty   = item.transactions.reduce((s, t) => s.add(t.quantity), new Decimal(0))
    const value = item.transactions.reduce((s, t) => s + (t.quantity.gte(0) ? t.totalCost : -t.totalCost), 0n)
    const avgCost = qty.isZero() ? 0n : value / BigInt(qty.abs().toFixed(0))

    return {
      itemId:        item.id,
      productId:     item.productId,
      productName:   item.product.name,
      sku:           item.product.sku,
      unitOfMeasure: item.unitOfMeasure,
      quantity:      qty,
      totalValue:    value < 0n ? 0n : value,
      avgCost:       avgCost < 0n ? 0n : avgCost,
      reorderPoint:  item.reorderPoint,
      belowReorder:  item.reorderPoint !== null && qty.lessThan(item.reorderPoint),
    }
  })
}

export async function getTransactionHistory(
  organizationId: string,
  itemId: string,
): Promise<TransactionRow[]> {
  const rows = await prisma.inventoryTransaction.findMany({
    where:   { organizationId, itemId },
    orderBy: [{ transactedAt: "asc" }, { createdAt: "asc" }],
  })

  let running = new Decimal(0)
  return rows.map(r => {
    running = running.add(r.quantity)
    return {
      id:           r.id,
      type:         r.type,
      quantity:     r.quantity,
      unitCost:     r.unitCost,
      totalCost:    r.totalCost,
      memo:         r.memo,
      sourceType:   r.sourceType,
      sourceId:     r.sourceId,
      transactedAt: r.transactedAt,
      createdAt:    r.createdAt,
      runningQty:   running,
    }
  })
}
