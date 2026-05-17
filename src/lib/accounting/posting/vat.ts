/**
 * VAT bucketing — pure functions, no DB.
 *
 * Groups invoice line items by tax rate and computes net + VAT sums
 * per bucket. Supports mixed-rate invoices.
 *
 * Amounts preserve sign: negative for credit note lines.
 */

import { getVatCode } from "@/lib/accounting/accounts"
import type { VatBucket } from "./types"

type LineItem = {
  taxRate:   { toString(): string } | number | string  // Prisma Decimal or number
  lineTotal: bigint
  taxAmount: bigint
}

/**
 * Groups line items by VAT rate.
 * Returns only buckets with non-zero netAmount.
 */
export function bucketByVatRate(lineItems: LineItem[]): VatBucket[] {
  const map = new Map<number, VatBucket>()

  for (const item of lineItems) {
    const rate = Math.round(Number(item.taxRate) * 10000) / 10000  // normalize float

    if (!map.has(rate)) {
      map.set(rate, {
        rate,
        vatCode:   getVatCode(rate),
        netAmount: 0n,
        vatAmount: 0n,
      })
    }

    const bucket = map.get(rate)!
    bucket.netAmount += item.lineTotal
    bucket.vatAmount += item.taxAmount
  }

  return Array.from(map.values()).filter(b => b.netAmount !== 0n)
}
