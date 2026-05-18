/**
 * calculateAccrualPeriods — splits totalAmount evenly across YYYY-MM periods
 * from startDate to endDate inclusive.
 *
 * Rounding rule: all periods receive floor(total/n); any remainder (total % n)
 * is added to the LAST period so not a single öre is lost.
 *
 * Returns periods in ascending order.
 */

export interface AccrualPeriodLine {
  period: string  // "YYYY-MM"
  amount: bigint
}

export function calculateAccrualPeriods(
  totalAmount: bigint,
  startDate:   Date,
  endDate:     Date,
): AccrualPeriodLine[] {
  if (totalAmount <= 0n) return []

  const periods = monthsBetween(startDate, endDate)
  if (periods === 0) return []

  const n       = BigInt(periods)
  const base    = totalAmount / n
  const remainder = totalAmount - base * n  // always ≥ 0, < n

  const lines: AccrualPeriodLine[] = []
  let year  = startDate.getFullYear()
  let month = startDate.getMonth()  // 0-indexed

  for (let i = 0; i < periods; i++) {
    const isLast = i === periods - 1
    lines.push({
      period: `${year}-${String(month + 1).padStart(2, "0")}`,
      amount: isLast ? base + remainder : base,
    })
    month++
    if (month > 11) { month = 0; year++ }
  }

  return lines
}

/** Count how many calendar months (inclusive) lie between two dates. */
export function monthsBetween(start: Date, end: Date): number {
  const sy = start.getFullYear(), sm = start.getMonth()
  const ey = end.getFullYear(),   em = end.getMonth()
  return (ey - sy) * 12 + (em - sm) + 1
}
