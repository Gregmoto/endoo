/**
 * Shared types for the automatic posting engine.
 */

// ─── Account slot keys ────────────────────────────────────────────────────────

export type AccountSlotKey =
  | "AR"          // 1510 Kundfordringar
  | "AP"          // 2440 Leverantörsskulder
  | "BANK"        // 1930 Bankgirokonto
  | "BANK_SWISH"  // 1920 Plusgiro / Swish
  | "BANK_CASH"   // 1910 Kassa
  | "REVENUE_25"  // 3001 Tjänsteintäkter 25%
  | "REVENUE_12"  // 3051 Tjänsteintäkter 12%
  | "REVENUE_6"   // 3101 Tjänsteintäkter 6%
  | "REVENUE_0"   // 3001 Momsfri försäljning
  | "VAT_OUT_25"  // 2610 Utgående moms 25%
  | "VAT_OUT_12"  // 2611 Utgående moms 12%
  | "VAT_OUT_6"   // 2612 Utgående moms 6%
  | "VAT_IN"      // 2640 Ingående moms

// Resolved slots map slot name → Account.id (UUID)
export type ResolvedSlots = Record<AccountSlotKey, string>

// ─── VAT bucketing ────────────────────────────────────────────────────────────

export type VatBucket = {
  rate:      number  // 0.25 | 0.12 | 0.06 | 0
  vatCode:   string  // "MP1" | "MP2" | "MP3" | "MF"
  netAmount: bigint  // sum of lineTotals at this rate (can be negative for credit notes)
  vatAmount: bigint  // sum of taxAmounts at this rate (can be negative for credit notes)
}

// ─── Journal entry output from engine ────────────────────────────────────────

export type JournalEntryData = {
  accountId:   string
  debit:       bigint
  credit:      bigint
  description?: string | null
  vatCode?:    string | null
}
