import { prisma } from "@/lib/prisma"
import { Decimal } from "@prisma/client/runtime/library"

export function calculateNewAverageCost(
  currentQty:      Decimal,
  currentAvgOre:   bigint,
  newQty:          Decimal,
  newUnitCostOre:  bigint,
): { newAvg: bigint; newTotalQty: Decimal } {
  const totalQty = currentQty.plus(newQty)
  if (totalQty.lte(0)) {
    return { newAvg: 0n, newTotalQty: new Decimal(0) }
  }

  // Calculate in Decimal for precision, then round half-up to bigint
  const oldTotal   = new Decimal(currentAvgOre.toString()).mul(currentQty)
  const newTotal   = new Decimal(newUnitCostOre.toString()).mul(newQty)
  const combined   = oldTotal.plus(newTotal)
  const avgDecimal = combined.div(totalQty)

  // Round half-up
  const rounded = avgDecimal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
  const newAvg  = BigInt(rounded.toString())

  return { newAvg, newTotalQty: totalQty }
}

export async function updateProductAverageCost(
  productId:      string,
  organizationId: string,
  newQty:         Decimal,
  newUnitCostOre: bigint,
): Promise<void> {
  const product = await prisma.product.findFirst({
    where:  { id: productId, organizationId },
    select: { stockQuantity: true, averageCost: true },
  })
  if (!product) return

  const { newAvg, newTotalQty } = calculateNewAverageCost(
    product.stockQuantity,
    product.averageCost,
    newQty,
    newUnitCostOre,
  )

  await prisma.product.update({
    where: { id: productId },
    data: {
      averageCost:      newAvg,
      stockQuantity:    newTotalQty,
      lastStockUpdateAt: new Date(),
    },
  })
}

export function calculateMargin(salesPriceOre: bigint, costOre: bigint): Decimal {
  if (salesPriceOre === 0n) return new Decimal(0)
  const sales  = new Decimal(salesPriceOre.toString())
  const cost   = new Decimal(costOre.toString())
  const margin = sales.minus(cost).div(sales).mul(100)
  return margin.toDecimalPlaces(1, Decimal.ROUND_HALF_UP)
}

export function calculateMarginAmount(
  salesPriceOre: bigint,
  costOre:       bigint,
  qty:           Decimal,
): bigint {
  const perUnit = new Decimal((salesPriceOre - costOre).toString())
  const total   = perUnit.mul(qty).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
  return BigInt(total.toString())
}
