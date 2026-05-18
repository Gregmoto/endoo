/**
 * calculateSchedule — generates the full depreciation schedule for an asset.
 *
 * Returns one entry per month from acquisitionDate until the asset is
 * fully depreciated (bookValue reaches residualValue).
 *
 * All monetary values are in öre (BigInt).
 */

import type { DepreciationMethod } from "@prisma/client"

export interface ScheduleLine {
  period: string   // "YYYY-MM"
  depreciationAmount: bigint
  accumulatedAmount:  bigint
  bookValue:          bigint
}

export interface AssetScheduleInput {
  acquisitionDate:   Date
  acquisitionCost:   bigint
  residualValue:     bigint
  usefulLifeMonths:  number
  depreciationMethod: DepreciationMethod
  declineRate?:      number | null  // fraction, e.g. 0.20 for 20%
}

/**
 * Returns the "YYYY-MM" string for a given year+month (0-indexed month).
 */
function periodKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

export function calculateSchedule(input: AssetScheduleInput): ScheduleLine[] {
  const {
    acquisitionDate,
    acquisitionCost,
    residualValue,
    usefulLifeMonths,
    depreciationMethod,
    declineRate,
  } = input

  const lines: ScheduleLine[] = []
  let accumulated = 0n
  let bookValue   = acquisitionCost
  const depreciable = acquisitionCost - residualValue

  if (depreciable <= 0n) return []

  // Start from the month AFTER acquisition (first full month of use)
  let year  = acquisitionDate.getFullYear()
  let month = acquisitionDate.getMonth() + 1  // 0-indexed → 1-indexed, then next month
  if (month > 11) { year++; month = 0 } else { /* already at next month index */ }
  // Actually: start from first month of use = acquisitionDate's own month
  year  = acquisitionDate.getFullYear()
  month = acquisitionDate.getMonth()  // 0-indexed

  for (let i = 0; i < usefulLifeMonths; i++) {
    let charge: bigint

    if (depreciationMethod === "linear") {
      // Straight-line: spread depreciable evenly; last period catches rounding
      const base = depreciable / BigInt(usefulLifeMonths)
      if (i === usefulLifeMonths - 1) {
        charge = bookValue - residualValue
      } else {
        charge = base
      }
    } else if (depreciationMethod === "declining_balance") {
      // Declining balance with explicit rate
      const rate = declineRate ?? 0.2
      const annual = bookValue - residualValue
      // Monthly charge = annual * rate / 12
      charge = BigInt(Math.round(Number(annual) * rate / 12))
      if (bookValue - charge < residualValue) {
        charge = bookValue - residualValue
      }
    } else {
      // tax_book: räkenskapsenlig avskrivning — 30% declining balance (Swedish tax rule)
      // Monthly charge = bookValue * 0.30 / 12
      charge = BigInt(Math.round(Number(bookValue) * 0.30 / 12))
      if (bookValue - charge < residualValue) {
        charge = bookValue - residualValue
      }
    }

    if (charge <= 0n) break

    accumulated += charge
    bookValue   -= charge

    lines.push({
      period:             periodKey(year, month),
      depreciationAmount: charge,
      accumulatedAmount:  accumulated,
      bookValue,
    })

    // Advance one month
    month++
    if (month > 11) { month = 0; year++ }

    if (bookValue <= residualValue) break
  }

  return lines
}
