import { prisma } from "@/lib/prisma"
import { Decimal } from "@prisma/client/runtime/library"
import { calculateReservedQuantity } from "./reservations"

export async function refreshProductStockCache(
  productId:      string,
  organizationId: string,
): Promise<void> {
  const product = await prisma.product.findFirst({
    where:  { id: productId, organizationId },
    select: { averageCost: true },
  })
  if (!product) return

  const item = await prisma.inventoryItem.findFirst({
    where:  { productId, organizationId },
    select: { id: true },
  })

  let stockQuantity = new Decimal(0)
  if (item) {
    const agg = await prisma.inventoryTransaction.aggregate({
      where:  { itemId: item.id, organizationId },
      _sum:   { quantity: true },
    })
    stockQuantity = agg._sum.quantity ?? new Decimal(0)
  }

  const reserved  = await calculateReservedQuantity(productId, organizationId)
  const available = stockQuantity.minus(reserved)

  const stockQtyBigInt   = BigInt(stockQuantity.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toString())
  const inventoryValue   = stockQtyBigInt * product.averageCost

  await prisma.product.update({
    where: { id: productId },
    data: {
      stockQuantity,
      reservedQuantity:  reserved,
      availableQuantity: available,
      inventoryValue,
      lastStockUpdateAt: new Date(),
    },
  })
}

export async function refreshAllStockCache(organizationId: string): Promise<void> {
  const products = await prisma.product.findMany({
    where:  { organizationId, deletedAt: null },
    select: { id: true },
  })
  await Promise.all(
    products.map(p => refreshProductStockCache(p.id, organizationId)),
  )
}
