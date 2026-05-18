// Täckningsbidrag / vinstmarginalsberäkningar
// All amounts in öre (BigInt). Returns Decimal as string to avoid float errors.

/** Calculate gross margin percentage: (sales - purchase) / sales × 100 */
export function calculateMarginPercent(
  salesPrice:    bigint,
  purchasePrice: bigint
): number {
  if (salesPrice === 0n) return 0
  // Use Number only for final percentage display — precision loss acceptable here
  // since margin% is displayed, not used in monetary calculations
  const margin = Number(salesPrice - purchasePrice) / Number(salesPrice)
  return Math.round(margin * 10000) / 100  // 2 decimal places
}

/** Calculate gross margin amount in öre */
export function calculateMarginAmount(salesPrice: bigint, purchasePrice: bigint): bigint {
  return salesPrice - purchasePrice
}

/**
 * Calculate markup percentage: (sales - purchase) / purchase × 100
 * Markup differs from margin: markup is on cost, margin is on revenue.
 */
export function calculateMarkupPercent(
  salesPrice:    bigint,
  purchasePrice: bigint
): number {
  if (purchasePrice === 0n) return 0
  const markup = Number(salesPrice - purchasePrice) / Number(purchasePrice)
  return Math.round(markup * 10000) / 100
}
