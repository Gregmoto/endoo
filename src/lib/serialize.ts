/**
 * Deep serialization helpers.
 *
 * Rule: money amounts are stored as BigInt (öre) internally.
 * On the wire (JSON) they travel as strings to preserve full precision.
 */

// ─── Deep BigInt → string serializer ─────────────────────────────────────────

export function toJSON<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  ) as T
}

// ─── Money types ──────────────────────────────────────────────────────────────

/** Wire-format money — amount as string of öre/cents, e.g. "10050" = 100.50 SEK */
export type Money = {
  amount:    string   // öre as string
  currency:  string   // ISO 4217, e.g. "SEK"
}

/** Rich money object with a pre-formatted display string */
export type RichMoney = Money & {
  formatted: string   // e.g. "100,50 kr"
}

// ─── serializeMoney ───────────────────────────────────────────────────────────

const LOCALE_MAP: Record<string, string> = {
  SEK: "sv-SE",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  NOK: "nb-NO",
  DKK: "da-DK",
}

export function serializeMoney(
  amount: bigint | string | number,
  currency = "SEK",
): RichMoney {
  const big = typeof amount === "bigint" ? amount : BigInt(amount)
  const locale = LOCALE_MAP[currency] ?? "sv-SE"
  const formatted = new Intl.NumberFormat(locale, {
    style:                 "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(big) / 100)

  return { amount: big.toString(), currency, formatted }
}

// ─── parseMoney ───────────────────────────────────────────────────────────────

/**
 * Parses a money input string/number into öre as BigInt.
 *
 * Accepts:
 *   "100.50"   → 10050n
 *   "100,50"   → 10050n
 *   "1 234,56" → 123456n
 *   10050      → 10050n  (already in öre)
 *   "10050"    → 10050n  (already in öre as string)
 *
 * Throws if the input is not a valid amount.
 */
export function parseMoney(value: string | number): bigint {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid money value: ${value}`)
    }
    return BigInt(Math.round(value))
  }

  // Normalize: remove thousands separators (space, nbsp, dot used as thousands)
  // then replace comma decimal separator with dot
  let s = value.trim()

  // Detect if this looks like a formatted decimal (e.g. "1 234,56" or "1.234,56")
  // vs a raw öre string (e.g. "123456")
  const hasCommaDecimal  = /,\d{1,2}$/.test(s)
  const hasDotDecimal    = /\.\d{1,2}$/.test(s)

  if (hasCommaDecimal) {
    // European format: remove dot/space thousands separators, replace comma with dot
    s = s.replace(/[\s .]/g, "").replace(",", ".")
  } else if (hasDotDecimal) {
    // Anglo format: remove space/comma thousands separators
    s = s.replace(/[\s ,]/g, "")
  } else {
    // Raw öre string — remove whitespace only
    s = s.replace(/[\s ]/g, "")
  }

  const n = parseFloat(s)
  if (!isFinite(n) || isNaN(n)) {
    throw new Error(`Invalid money value: "${value}"`)
  }

  // If decimal value, convert to öre
  if (hasCommaDecimal || hasDotDecimal) {
    return BigInt(Math.round(n * 100))
  }

  // Raw öre
  return BigInt(s)
}
