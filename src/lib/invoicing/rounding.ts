// Öresutjämning (rounding to whole kronor)
// All amounts in öre (BigInt). 100 öre = 1 SEK.

export type RoundingMode = "auto" | "manual" | "off"

export interface RoundingResult {
  /** Amount rounded to whole kronor (multiple of 100 öre) */
  rounded: bigint
  /** Adjustment applied: rounded - original. Positive = rounded up. */
  adjustment: bigint
}

/**
 * Apply öresutjämning to an amount in öre.
 *
 * "auto"   — always round to nearest whole krona (banker's round: ties go to even)
 * "manual" — no rounding applied; caller decides when to trigger
 * "off"    — no rounding ever
 */
export function applyRounding(amount: bigint, mode: RoundingMode): RoundingResult {
  if (mode === "manual" || mode === "off") {
    return { rounded: amount, adjustment: 0n }
  }

  // Round to nearest 100 öre (1 SEK)
  const remainder = amount % 100n
  if (remainder === 0n) {
    return { rounded: amount, adjustment: 0n }
  }

  const absRem   = remainder < 0n ? -remainder : remainder
  const sign     = amount < 0n ? -1n : 1n

  let rounded: bigint
  if (absRem < 50n) {
    // Round down (truncate towards zero)
    rounded = amount - remainder
  } else if (absRem > 50n) {
    // Round up (away from zero)
    rounded = amount - remainder + 100n * sign
  } else {
    // Exactly 50 öre: banker's rounding — round to even krona
    const kronor    = amount / 100n
    const isEven    = kronor % 2n === 0n
    rounded = isEven ? amount - remainder : amount - remainder + 100n * sign
  }

  return { rounded, adjustment: rounded - amount }
}

/** Format öre amount as Swedish kronor string, e.g. 12345 → "123,45" */
export function formatOre(ore: bigint, decimals: 0 | 2 = 2): string {
  const abs     = ore < 0n ? -ore : ore
  const sign    = ore < 0n ? "-" : ""
  const kronor  = abs / 100n
  const oere    = abs % 100n
  if (decimals === 0) {
    return `${sign}${kronor}`
  }
  return `${sign}${kronor},${String(oere).padStart(2, "0")}`
}
