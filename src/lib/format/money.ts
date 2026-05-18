/**
 * Client-safe money formatting utilities.
 * Works in both browser and Node (no BigInt dependency in display path).
 */

const LOCALE_MAP: Record<string, string> = {
  SEK: "sv-SE",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  NOK: "nb-NO",
  DKK: "da-DK",
}

// ─── formatMoney ─────────────────────────────────────────────────────────────

/**
 * Format a money amount for display.
 *
 * @param amount  öre as bigint, number, or string (e.g. "10050" = 100.50 SEK)
 * @param currency ISO 4217 code
 * @param locale  BCP 47 locale (defaults to currency-appropriate locale)
 */
export function formatMoney(
  amount:   string | bigint | number,
  currency = "SEK",
  locale?:  string,
): string {
  const l = locale ?? LOCALE_MAP[currency] ?? "sv-SE"
  const öre =
    typeof amount === "bigint"
      ? Number(amount)
      : typeof amount === "string"
        ? parseInt(amount, 10)
        : amount

  if (!isFinite(öre) || isNaN(öre)) return "—"

  return new Intl.NumberFormat(l, {
    style:                 "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(öre / 100)
}

// ─── parseMoneyInput ─────────────────────────────────────────────────────────

/**
 * Parse a user-typed money string into öre as a string (for POST bodies).
 *
 * Accepted formats:
 *   "100,50"    → "10050"
 *   "100.50"    → "10050"
 *   "1 234,56"  → "123456"
 *   "1234.56"   → "123456"
 *   "-100,00"   → "-10000"
 *
 * Returns null if the input cannot be parsed.
 */
export function parseMoneyInput(value: string): string | null {
  const s = value.trim()
  if (!s) return null

  const negative = s.startsWith("-")
  const abs = negative ? s.slice(1).trim() : s

  // Detect decimal separator
  const hasCommaDecimal = /,\d{1,2}$/.test(abs)
  const hasDotDecimal   = /\.\d{1,2}$/.test(abs)

  let normalized: string
  if (hasCommaDecimal) {
    normalized = abs.replace(/[\s .]/g, "").replace(",", ".")
  } else if (hasDotDecimal) {
    normalized = abs.replace(/[\s ,]/g, "")
  } else {
    // Integer — treat as kronor (not öre) if no decimal present
    normalized = abs.replace(/[\s ,]/g, "") + ".00"
  }

  const n = parseFloat(normalized)
  if (!isFinite(n) || isNaN(n) || n < 0) return null

  const öre = Math.round(n * 100)
  return negative ? `-${öre}` : String(öre)
}

// ─── formatMoneyInput ────────────────────────────────────────────────────────

/**
 * Format öre string/number as a human-readable decimal for display in an input.
 * e.g. "10050" → "100,50"
 */
export function formatMoneyInput(
  öre:      string | number | null | undefined,
  currency = "SEK",
): string {
  if (öre === null || öre === undefined || öre === "") return ""
  const n = typeof öre === "string" ? parseInt(öre, 10) : öre
  if (!isFinite(n) || isNaN(n)) return ""
  const locale = LOCALE_MAP[currency] ?? "sv-SE"
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n / 100)
}
