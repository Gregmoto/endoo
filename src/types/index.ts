/**
 * Endoo — shared TypeScript types
 *
 * Keep domain types here that are used across multiple modules.
 * Prisma-generated types live in @prisma/client — import from there directly.
 */

// ─────────────────────────────────────────────
// Money — amounts are stored as BigInt (öre/cents)
// ─────────────────────────────────────────────

/** Amount in smallest currency unit (e.g. 10000 = 100.00 SEK) */
export type AmountInMinorUnits = bigint

/**
 * Wire-format money — amount as string of öre/cents to avoid precision loss.
 * Use this type on all external API interfaces (v1, portal).
 */
export type Money = {
  amount:   string   // öre as decimal string, e.g. "10050"
  currency: string   // ISO 4217, e.g. "SEK"
}

/**
 * Format amount for display.
 * NOTE: safe only for amounts ≤ 2^53 − 1 öre (≈ 90 trillion SEK).
 * For larger amounts use `serializeMoney` from @/lib/serialize.
 */
export function formatAmount(amount: bigint, currency = "SEK", locale = "sv-SE"): string {
  return new Intl.NumberFormat(locale, {
    style:                 "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) / 100)
}

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────

export interface PaginationParams {
  page: number
  perPage: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ─────────────────────────────────────────────
// API responses
// ─────────────────────────────────────────────

export type ApiSuccess<T> = { data: T; error?: never }
export type ApiError = { error: string; detail?: string; data?: never }
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─────────────────────────────────────────────
// Invoice
// ─────────────────────────────────────────────

export type InvoiceStatusLabel = {
  draft:         "Utkast"
  sent:          "Skickad"
  viewed:        "Öppnad"
  partial:       "Delbetald"
  paid:          "Betald"
  overdue:       "Förfallen"
  void:          "Makulerad"
  uncollectable: "Osäker fordran"
}

export const INVOICE_STATUS_LABELS: InvoiceStatusLabel = {
  draft:         "Utkast",
  sent:          "Skickad",
  viewed:        "Öppnad",
  partial:       "Delbetald",
  paid:          "Betald",
  overdue:       "Förfallen",
  void:          "Makulerad",
  uncollectable: "Osäker fordran",
}

// ─────────────────────────────────────────────
// Organization
// ─────────────────────────────────────────────

export interface OrgContext {
  id: string
  slug: string
  name: string
  type: "agency" | "customer"
  plan: "free" | "starter" | "pro" | "enterprise"
}
