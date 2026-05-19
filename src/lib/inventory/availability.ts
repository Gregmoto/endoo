import { prisma } from "@/lib/prisma"
import { Decimal } from "@prisma/client/runtime/library"
import type { InventoryTransaction } from "@prisma/client"

export async function getAvailableQuantity(
  productId:      string,
  organizationId: string,
): Promise<Decimal> {
  const product = await prisma.product.findFirst({
    where:  { id: productId, organizationId },
    select: { availableQuantity: true },
  })
  return product?.availableQuantity ?? new Decimal(0)
}

export async function canFulfillOrder(
  productId:      string,
  organizationId: string,
  quantity:       Decimal,
): Promise<boolean> {
  const available = await getAvailableQuantity(productId, organizationId)
  return available.gte(quantity)
}

export async function getStockHistory(
  productId:      string,
  organizationId: string,
  limit           = 50,
): Promise<InventoryTransaction[]> {
  const item = await prisma.inventoryItem.findFirst({
    where: { productId, organizationId },
    select: { id: true },
  })
  if (!item) return []

  return prisma.inventoryTransaction.findMany({
    where:   { itemId: item.id, organizationId },
    orderBy: { transactedAt: "desc" },
    take:    limit,
  })
}
