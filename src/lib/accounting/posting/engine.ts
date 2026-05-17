/**
 * Posting engine — pure functions.
 *
 * Builds journal entry arrays for each posting event type.
 * No DB access — takes resolved slots and pre-computed data.
 *
 * All amounts are in öre (BigInt). Debit and credit are always ≥ 0.
 * Credit notes are supported: negative bucket amounts flip the entry sides.
 */

import type { PaymentMethod }       from "@prisma/client"
import type { AccountSlotKey, JournalEntryData, ResolvedSlots, VatBucket } from "./types"

// ─── INVOICE_SENT / CREDIT_NOTE_SENT ─────────────────────────────────────────

/**
 * Builds entries for an outgoing invoice or credit note.
 *
 * Invoice (positive grossTotal):
 *   DR AR             gross (inkl moms)
 *   CR REVENUE_*      net per VAT bucket
 *   CR VAT_OUT_*      VAT amount per bucket
 *
 * Credit note (negative grossTotal — line items have negative lineTotal):
 *   CR AR             abs(gross)
 *   DR REVENUE_*      abs(net) per VAT bucket
 *   DR VAT_OUT_*      abs(VAT) per bucket
 */
export function buildInvoiceSentEntries(
  slots:       ResolvedSlots,
  buckets:     VatBucket[],
  grossTotal:  bigint,    // invoice.totalAmount (negative for credit notes)
  description: string,
): JournalEntryData[] {
  const entries: JournalEntryData[] = []
  const isCreditNote = grossTotal < 0n
  const absGross     = isCreditNote ? -grossTotal : grossTotal

  // AR entry
  entries.push({
    accountId: slots.AR,
    debit:     isCreditNote ? 0n    : absGross,
    credit:    isCreditNote ? absGross : 0n,
    description,
  })

  // Revenue + VAT entries per bucket
  for (const bucket of buckets) {
    const revenueSlot = vatRateToRevenueSlot(bucket.rate)
    const vatOutSlot  = vatRateToVatOutSlot(bucket.rate)

    const netAbs = bucket.netAmount < 0n ? -bucket.netAmount : bucket.netAmount
    const vatAbs = bucket.vatAmount < 0n ? -bucket.vatAmount : bucket.vatAmount
    const bucketIsCredit = bucket.netAmount < 0n  // credit note bucket

    // Revenue
    entries.push({
      accountId:  slots[revenueSlot],
      debit:      bucketIsCredit ? netAbs : 0n,
      credit:     bucketIsCredit ? 0n    : netAbs,
      description,
      vatCode:    bucket.vatCode,
    })

    // VAT out (only when there is actual VAT)
    if (vatAbs > 0n) {
      entries.push({
        accountId:  slots[vatOutSlot],
        debit:      bucketIsCredit ? vatAbs : 0n,
        credit:     bucketIsCredit ? 0n    : vatAbs,
        vatCode:    bucket.vatCode,
        description: `Utgående moms ${Math.round(bucket.rate * 100)}%`,
      })
    }
  }

  return entries
}

// ─── INVOICE_PAID ─────────────────────────────────────────────────────────────

/**
 * Builds entries when a payment is recorded against an invoice.
 *
 *   DR BANK (method-specific)   payment amount
 *   CR AR                       payment amount
 *
 * credit_note payments are not handled here — they are AR offsets
 * settled by voiding/reducing the original AR entry (out of MVP scope).
 */
export function buildPaymentEntries(
  slots:       ResolvedSlots,
  amount:      bigint,
  method:      PaymentMethod,
  description: string,
): JournalEntryData[] {
  const bankSlot = paymentMethodToSlot(method)

  return [
    { accountId: slots[bankSlot], debit: amount, credit: 0n, description },
    { accountId: slots.AR,        debit: 0n,     credit: amount, description },
  ]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vatRateToRevenueSlot(rate: number): AccountSlotKey {
  if (rate === 0.12) return "REVENUE_12"
  if (rate === 0.06) return "REVENUE_6"
  if (rate === 0)    return "REVENUE_0"
  return "REVENUE_25"
}

function vatRateToVatOutSlot(rate: number): AccountSlotKey {
  if (rate === 0.12) return "VAT_OUT_12"
  if (rate === 0.06) return "VAT_OUT_6"
  return "VAT_OUT_25"  // 0% has no VAT out — vatAbs will be 0 so entry is skipped
}

function paymentMethodToSlot(method: PaymentMethod): AccountSlotKey {
  if (method === "swish") return "BANK_SWISH"
  if (method === "cash")  return "BANK_CASH"
  return "BANK"
}
