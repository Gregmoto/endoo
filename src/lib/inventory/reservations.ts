import { prisma } from "@/lib/prisma"
import { Decimal } from "@prisma/client/runtime/library"

// Extends to other statuses when inventoryUpdated field is used more broadly.
// Currently only 'draft' invoices are considered unreserved inventory.
const OPEN_STATUSES = ["draft", "sent", "viewed", "partial"] as const

export async function calculateReservedQuantity(
  productId:      string,
  organizationId: string,
): Promise<Decimal> {
  const result = await prisma.invoiceLineItem.aggregate({
    where: {
      productId,
      organizationId,
      invoice: {
        organizationId,
        deletedAt: null,
        inventoryUpdated: false,
        status: { in: [...OPEN_STATUSES] },
      },
    },
    _sum: { quantity: true },
  })
  return result._sum.quantity ?? new Decimal(0)
}

export async function refreshProductReservations(
  productId:      string,
  organizationId: string,
): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    select: { stockQuantity: true },
  })
  if (!product) return

  const reserved  = await calculateReservedQuantity(productId, organizationId)
  const available = product.stockQuantity.minus(reserved)

  await prisma.product.update({
    where: { id: productId },
    data: {
      reservedQuantity:  reserved,
      availableQuantity: available,
      lastStockUpdateAt: new Date(),
    },
  })
}

export async function refreshAllReservations(organizationId: string): Promise<void> {
  const products = await prisma.product.findMany({
    where:  { organizationId, deletedAt: null },
    select: { id: true },
  })
  await Promise.all(
    products.map(p => refreshProductReservations(p.id, organizationId)),
  )
}
